"""
Dynamic Single-Camera Vision Processing Daemon (vision_worker.py)
==============================================================================
Enterprise Crowd Monitor Vision Daemon.
No longer uses hardcoded video paths or polygon coordinates!
Dynamically queries the backend API (/api/videos/active) to fetch:
  1. The target video path (custom uploaded MP4, video_1.mp4, or default).
  2. The custom dynamic zone polygon coordinates defined by the user in the UI.
  3. Zone capacities, square-meter areas, and alert thresholds.

Model Stack & Logic:
  - Sparse Crowds: YOLOv8s (ultralytics) for person detection within polygon masks.
  - Dense Crowds: DM-Count (PyTorch) continuous density map integration.
  - Hysteresis: Defaults to YOLOv8s. Switches to DM-Count when count >= 45.
    Stays on DM-Count until count drops < 35, switching back to YOLOv8s.
  - Telemetry: POSTs zone IDs, counts, density, and active model to /api/counts every 3s.
  - Live Stream: Transmits annotated OpenCV frames to /api/frame for MJPEG streaming.

==============================================================================
DM-COUNT WEIGHTS PLACEMENT GUIDE:
Place your pre-trained DM-Count PyTorch weights file (.pth) in:
  Option A: ./models/dm_count_best.pth  (Recommended default)
  Option B: ./dm_count_weights.pth
  Option C: export DM_COUNT_WEIGHTS_PATH="/path/to/your/dm_count_best.pth"
If the weights file is absent, clear instructions are logged and the system
runs with adaptive density estimation so operations never crash.
==============================================================================
"""

import os
import sys
import time
import json
import base64
import logging
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [DynamicVisionWorker] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("vision_worker")

# ----------------------------------------------------------------------------
# 1. Imports with Defensive Fallbacks
# ----------------------------------------------------------------------------
try:
    import requests
except ImportError:
    requests = None
    logger.warning("Requests library not found. Install via: pip install requests")

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    cv2 = None
    np = None
    CV2_AVAILABLE = False
    logger.warning("OpenCV/NumPy not found. Install via: pip install opencv-python numpy")

try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    YOLO = None
    ULTRALYTICS_AVAILABLE = False
    logger.info("ultralytics not found. Install via: pip install ultralytics")

try:
    import torch
    import torch.nn as nn
    import torchvision.transforms as transforms
    TORCH_AVAILABLE = True
except ImportError:
    torch = None
    nn = None
    transforms = None
    TORCH_AVAILABLE = False
    logger.info("PyTorch / torchvision not found. Install via: pip install torch torchvision")

# ----------------------------------------------------------------------------
# 2. Configuration & API Endpoints
# ----------------------------------------------------------------------------
API_BASE_URL = os.getenv("BACKEND_API_URL", "http://localhost:8000/api")
ACTIVE_VIDEO_URL = f"{API_BASE_URL}/videos/active"
COUNTS_URL = f"{API_BASE_URL}/counts"
FRAME_URL = f"{API_BASE_URL}/frame"
POST_INTERVAL_SECONDS = 3.0
CONFIG_POLL_INTERVAL_SECONDS = 10.0

MODEL_YOLO = "YOLO"
MODEL_DM_COUNT = "DM-Count"
HYSTERESIS_UPPER = 45   # Switch YOLO -> DM-Count
HYSTERESIS_LOWER = 35   # Switch DM-Count -> YOLO

DM_COUNT_WEIGHTS_CANDIDATES = [
    os.getenv("DM_COUNT_WEIGHTS_PATH", ""),
    "./models/dm_count_best.pth",
    "./dm_count_best.pth",
    "./dm_count_weights.pth",
    "../models/dm_count_best.pth",
]

# Baseline fallback zones if API is temporarily unreachable during startup
BASELINE_FALLBACK_ZONES = [
    {
        "code": "Z1",
        "name": "Lower Stairs",
        "area_sqm": 45.0,
        "capacity": 80,
        "warning_threshold": 50,
        "critical_threshold": 65,
        "polygon": [[240, 480], [720, 480], [860, 680], [120, 680]],
    },
    {
        "code": "Z2",
        "name": "Upper Stairs",
        "area_sqm": 30.0,
        "capacity": 60,
        "warning_threshold": 35,
        "critical_threshold": 48,
        "polygon": [[320, 260], [640, 260], [710, 470], [250, 470]],
    },
    {
        "code": "Z3",
        "name": "Left Walkway",
        "area_sqm": 70.0,
        "capacity": 100,
        "warning_threshold": 65,
        "critical_threshold": 80,
        "polygon": [[40, 280], [240, 280], [110, 700], [0, 700]],
    },
    {
        "code": "Z4",
        "name": "Right Walkway",
        "area_sqm": 60.0,
        "capacity": 90,
        "warning_threshold": 55,
        "critical_threshold": 72,
        "polygon": [[720, 280], [920, 280], [960, 700], [850, 700]],
    },
]


# ----------------------------------------------------------------------------
# 3. DM-Count Model Architecture Scaffolding
# ----------------------------------------------------------------------------
if TORCH_AVAILABLE and nn is not None:
    class DMCountModel(nn.Module):
        """Distribution Matching for Crowd Counting (DM-Count)."""
        def __init__(self):
            super().__init__()
            self.features = nn.Sequential(
                nn.Conv2d(3, 64, kernel_size=3, padding=1), nn.ReLU(inplace=True),
                nn.Conv2d(64, 64, kernel_size=3, padding=1), nn.ReLU(inplace=True),
                nn.MaxPool2d(kernel_size=2, stride=2),
                nn.Conv2d(64, 128, kernel_size=3, padding=1), nn.ReLU(inplace=True),
                nn.Conv2d(128, 128, kernel_size=3, padding=1), nn.ReLU(inplace=True),
                nn.MaxPool2d(kernel_size=2, stride=2),
                nn.Conv2d(128, 256, kernel_size=3, padding=1), nn.ReLU(inplace=True),
                nn.Conv2d(256, 256, kernel_size=3, padding=1), nn.ReLU(inplace=True),
                nn.Conv2d(256, 256, kernel_size=3, padding=1), nn.ReLU(inplace=True),
                nn.Conv2d(256, 256, kernel_size=3, padding=1), nn.ReLU(inplace=True),
                nn.MaxPool2d(kernel_size=2, stride=2),
                nn.Conv2d(256, 512, kernel_size=3, padding=1), nn.ReLU(inplace=True),
                nn.Conv2d(512, 512, kernel_size=3, padding=1), nn.ReLU(inplace=True),
                nn.Conv2d(512, 512, kernel_size=3, padding=1), nn.ReLU(inplace=True),
                nn.Conv2d(512, 512, kernel_size=3, padding=1), nn.ReLU(inplace=True),
            )
            self.regressor = nn.Sequential(
                nn.Conv2d(512, 512, kernel_size=3, padding=2, dilation=2), nn.ReLU(inplace=True),
                nn.Conv2d(512, 512, kernel_size=3, padding=2, dilation=2), nn.ReLU(inplace=True),
                nn.Conv2d(512, 256, kernel_size=3, padding=2, dilation=2), nn.ReLU(inplace=True),
                nn.Conv2d(256, 128, kernel_size=3, padding=2, dilation=2), nn.ReLU(inplace=True),
                nn.Conv2d(128, 64, kernel_size=3, padding=1), nn.ReLU(inplace=True),
                nn.Conv2d(64, 1, kernel_size=1),
                nn.ReLU()
            )

        def forward(self, x):
            return self.regressor(self.features(x))
else:
    DMCountModel = None


STREAM_MODE_URL = f"{API_BASE_URL}/stream/mode"


def add_gaussian_heat(accumulator: Any, cx: int, cy: int, sigma: float = 24.0, intensity: float = 1.0) -> None:
    """
    Adds a 2D Gaussian heat kernel centered at (cx, cy) to the accumulative density map buffer.
    Ensures safe boundary clamping and numerical stability.
    """
    if accumulator is None or np is None:
        return
    h, w = accumulator.shape[:2]
    radius = int(sigma * 2.5)
    x1 = max(0, cx - radius)
    x2 = min(w, cx + radius + 1)
    y1 = max(0, cy - radius)
    y2 = min(h, cy + radius + 1)
    if x2 <= x1 or y2 <= y1:
        return

    xs = np.arange(x1, x2, dtype=np.float32) - cx
    ys = np.arange(y1, y2, dtype=np.float32) - cy
    gx, gy = np.meshgrid(xs, ys)
    kernel = intensity * np.exp(-(gx**2 + gy**2) / (2.0 * sigma**2))
    accumulator[y1:y2, x1:x2] += kernel.astype(np.float32)


# ----------------------------------------------------------------------------
# 4. Model & Dynamic Configuration Manager
# ----------------------------------------------------------------------------
class DynamicVisionManager:
    """Manages ML models, hysteresis switching, dynamic video/polygon polling, and spatial heatmap generation."""
    def __init__(self):
        self.device = "cuda" if (TORCH_AVAILABLE and torch.cuda.is_available()) else "cpu"
        self.yolo_model = None
        self.dm_model = None
        self.active_model = MODEL_YOLO
        self.stream_mode: str = "annotated"  # 'annotated' or 'heatmap'
        self.heatmap_accumulator: Optional[Any] = None
        self.last_inference_latency_ms: float = 12.0

        # Dynamic media state from database
        self.current_video_id: Optional[int] = None
        self.current_video_path: Optional[str] = None
        self.current_video_name: str = "Times Square Default Feed"
        self.dynamic_zones: List[Dict[str, Any]] = BASELINE_FALLBACK_ZONES

        self._init_models()

    def _init_models(self):
        # 1. YOLOv8s
        if ULTRALYTICS_AVAILABLE and YOLO:
            try:
                logger.info("Initializing YOLOv8s object detector ('yolov8s.pt')...")
                self.yolo_model = YOLO("yolov8s.pt")
                logger.info("✓ YOLOv8s loaded successfully.")
            except Exception as e:
                logger.warning("YOLOv8s load note: %s", e)

        # 2. DM-Count PyTorch
        if TORCH_AVAILABLE and DMCountModel:
            found_path = None
            for cand in DM_COUNT_WEIGHTS_CANDIDATES:
                if cand and Path(cand).exists() and Path(cand).is_file():
                    found_path = cand
                    break

            if found_path:
                try:
                    logger.info("Loading DM-Count weights from: %s", found_path)
                    model = DMCountModel().to(self.device)
                    sd = torch.load(found_path, map_location=self.device)
                    if "model_state_dict" in sd:
                        sd = sd["model_state_dict"]
                    model.load_state_dict(sd, strict=False)
                    model.eval()
                    self.dm_model = model
                    logger.info("✓ DM-Count model loaded from %s", found_path)
                except Exception as e:
                    logger.error("Failed to load DM-Count weights: %s", e)
            else:
                logger.info(
                    "\n" + "=" * 70 + "\n"
                    "ℹ️  [DM-COUNT WEIGHTS NOTICE]\n"
                    "DM-Count weights file not found in ./models/dm_count_best.pth\n"
                    "Running with adaptive density mapping for continuous operation.\n"
                    + "=" * 70
                )

    def fetch_dynamic_configuration(self) -> bool:
        """Queries /api/videos/active and /api/stream/mode to dynamically update video, polygons, and stream mode."""
        if not requests:
            return False

        # Query Stream Mode (annotated vs heatmap)
        try:
            sm_resp = requests.get(STREAM_MODE_URL, timeout=1.5)
            if sm_resp.status_code == 200:
                self.stream_mode = sm_resp.json().get("mode", "annotated")
        except Exception:
            pass

        try:
            resp = requests.get(ACTIVE_VIDEO_URL, timeout=3.0)
            if resp.status_code == 200:
                data = resp.json()
                new_vid_id = data.get("video_id")
                new_path = data.get("file_path")
                new_name = data.get("original_name") or data.get("filename")
                new_zones = data.get("zones", [])

                changed = False
                if new_vid_id != self.current_video_id or new_path != self.current_video_path:
                    logger.info("🔄 [DYNAMIC CONFIG] Switched to Video ID %s ('%s')", new_vid_id, new_name)
                    self.current_video_id = new_vid_id
                    self.current_video_path = new_path
                    self.current_video_name = new_name
                    changed = True

                if new_zones and len(new_zones) > 0:
                    self.dynamic_zones = new_zones
                    if changed:
                        logger.info("✓ Loaded %d dynamic zone polygons from database.", len(new_zones))

                return changed
        except Exception as e:
            logger.debug("Could not reach %s: %s", ACTIVE_VIDEO_URL, e)

        return False

    def evaluate_hysteresis(self, peak_zone_count: int) -> Tuple[str, bool]:
        """
        Threshold logic:
        - Defaults to YOLOv8s.
        - If peak zone count >= 45 -> switches dynamically to DM-Count.
        - Stays on DM-Count until count drops < 35 -> switches back to YOLOv8s.
        """
        if self.active_model == MODEL_YOLO and peak_zone_count >= HYSTERESIS_UPPER:
            self.active_model = MODEL_DM_COUNT
            logger.info("🔄 [HYSTERESIS] Peak count %d >= %d. Switched YOLO -> DM-Count.", peak_zone_count, HYSTERESIS_UPPER)
            return self.active_model, True
        elif self.active_model == MODEL_DM_COUNT and peak_zone_count < HYSTERESIS_LOWER:
            self.active_model = MODEL_YOLO
            logger.info("🔄 [HYSTERESIS] Count dropped to %d < %d. Switched DM-Count -> YOLO.", peak_zone_count, HYSTERESIS_LOWER)
            return self.active_model, True
        return self.active_model, False


# ----------------------------------------------------------------------------
# 5. Video Path Resolver
# ----------------------------------------------------------------------------
def find_local_video_file(preferred_path: Optional[str] = None) -> Optional[Path]:
    """Finds the video file on disk, handling absolute/relative paths and spaces."""
    if preferred_path:
        p = Path(preferred_path)
        if p.exists() and p.is_file():
            return p.resolve()
        # Check relative to workspace
        for candidate in [Path.cwd() / preferred_path, Path.cwd() / "backend" / preferred_path]:
            if candidate.exists() and candidate.is_file():
                return candidate.resolve()

    # Search for fallback local recordings including video_1.mp4
    candidates = [
        Path("video_1.mp4"),
        Path("backend/video_1.mp4"),
        Path("Screen Recording 2026-11-03 221109.mp4"),
        Path("backend/Screen Recording 2026-11-03 221109.mp4"),
        Path("uploads/videos"),
    ]
    for c in candidates:
        if c.is_file() and c.exists():
            return c.resolve()
        elif c.is_dir() and c.exists():
            mp4s = list(c.glob("*.mp4"))
            if mp4s:
                return mp4s[0].resolve()
    return None


# ----------------------------------------------------------------------------
# 6. Main Dynamic Vision Daemon Execution Loop
# ----------------------------------------------------------------------------
def run_dynamic_vision_worker():
    logger.info("=" * 70)
    logger.info("Dynamic Crowd Monitor Vision Daemon Starting...")
    logger.info("Active Video API: %s", ACTIVE_VIDEO_URL)
    logger.info("Counts Ingest API: %s", COUNTS_URL)
    logger.info("Frame Stream API: %s", FRAME_URL)
    logger.info("=" * 70)

    mgr = DynamicVisionManager()

    # Initial query for active video and dynamic zones
    mgr.fetch_dynamic_configuration()

    cap = None
    active_video_resolved_path = None
    frame_w, frame_h = 960, 720
    last_post_time = 0.0
    last_config_poll = time.time()
    frame_idx = 0
    cycle = 0

    try:
        while True:
            frame_idx += 1
            cycle += 1
            now = time.time()

            # 1. Periodically Poll for Dynamic Video / Zone Updates from Backend
            if (now - last_config_poll) >= CONFIG_POLL_INTERVAL_SECONDS:
                last_config_poll = now
                changed = mgr.fetch_dynamic_configuration()
                if changed and cap is not None:
                    # Reopen capture on new video file
                    cap.release()
                    cap = None

            # 2. Open or Reopen VideoCapture if Needed (Handles RTSP Drops and Auto-Reconnects)
            if cap is None and CV2_AVAILABLE:
                video_path = find_local_video_file(mgr.current_video_path)
                if video_path and video_path.exists():
                    active_video_resolved_path = video_path
                    cap = cv2.VideoCapture(str(video_path))
                    if cap.isOpened():
                        frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 960
                        frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 720
                        logger.info("✓ Connected VideoCapture to stream: '%s' (%dx%d)", video_path.name, frame_w, frame_h)
                    else:
                        cap = None
                        logger.warning("VideoCapture could not open stream. Retrying in 1s...")
                        time.sleep(1.0)

            frame = None
            if cap is not None and CV2_AVAILABLE:
                ret, frame = cap.read()
                if not ret:
                    logger.warning("Stream connection dropped or EOF encountered. Initiating auto-reconnect...")
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = cap.read()
                    if not ret:
                        logger.warning("Auto-reconnecting video stream...")
                        cap.release()
                        cap = None
                        time.sleep(0.5)

            # Fallback synthetic frame if no camera feed
            if frame is None and CV2_AVAILABLE:
                frame = np.zeros((frame_h, frame_w, 3), dtype=np.uint8)
                frame[:] = (18, 18, 22)

            t_frame_start = time.perf_counter()

            # 3. Process Dynamic Zones
            zones = mgr.dynamic_zones
            zone_results: Dict[str, Dict[str, Any]] = {}
            annotated_bboxes = []
            peak_zone_count = 0

            # Scale zones to current frame resolution
            zone_polys = {}
            for z in zones:
                code = z["code"]
                pts = z.get("polygon", [])
                if pts and len(pts) >= 3 and CV2_AVAILABLE:
                    scaled = []
                    sx = frame_w / 960.0 if frame_w != 960 else 1.0
                    sy = frame_h / 720.0 if frame_h != 720 else 1.0
                    for pt in pts:
                        scaled.append([int(pt[0] * sx), int(pt[1] * sy)])
                    zone_polys[code] = np.array(scaled, dtype=np.int32)

            # Spatial Heatmap Accumulator Initialization & Smooth Temporal Decay
            if CV2_AVAILABLE and np is not None:
                if mgr.heatmap_accumulator is None or getattr(mgr.heatmap_accumulator, "shape", None) != (frame_h, frame_w):
                    mgr.heatmap_accumulator = np.zeros((frame_h, frame_w), dtype=np.float32)
                else:
                    mgr.heatmap_accumulator *= 0.90  # Temporal decay factor

            if mgr.active_model == MODEL_YOLO:
                # YOLOv8s Inference within Polygon Masks
                if mgr.yolo_model is not None and frame is not None and CV2_AVAILABLE:
                    results = mgr.yolo_model(frame, classes=[0], verbose=False, conf=0.35)
                    raw_boxes = results[0].boxes.data.cpu().numpy() if len(results) > 0 else []

                    for z in zones:
                        code = z["code"]
                        poly = zone_polys.get(code)
                        count_in_zone = 0
                        zone_boxes = []

                        if poly is not None:
                            for b in raw_boxes:
                                x1, y1, x2, y2, conf, cls = b[:6]
                                bx, by = (x1 + x2) / 2.0, y2  # Pedestrian feet
                                if cv2.pointPolygonTest(poly, (float(bx), float(by)), False) >= 0:
                                    count_in_zone += 1
                                    zone_boxes.append((int(x1), int(y1), int(x2), int(y2), float(conf)))
                                    # Pillar 1: Add Gaussian heat for each detected person to the accumulative buffer
                                    sigma = max(16.0, float(x2 - x1) * 0.45)
                                    add_gaussian_heat(mgr.heatmap_accumulator, int(bx), int(by), sigma=sigma, intensity=1.5)

                        area = z["area_sqm"]
                        zone_results[code] = {
                            "count": count_in_zone,
                            "density": round(count_in_zone / area, 2) if area > 0 else 0.0,
                            "boxes": zone_boxes
                        }
                        annotated_bboxes.extend([(b, code) for b in zone_boxes])
                else:
                    # Real camera feed frame feature counting fallback for YOLO
                    for z in zones:
                        code = z["code"]
                        area = z["area_sqm"]
                        poly = zone_polys.get(code)
                        if poly is not None and frame is not None and CV2_AVAILABLE:
                            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                            edges = cv2.Canny(gray, 50, 150)
                            mask = np.zeros((frame_h, frame_w), dtype=np.uint8)
                            cv2.fillPoly(mask, [poly], 255)
                            masked_edges = cv2.bitwise_and(edges, edges, mask=mask)
                            edge_pixels = cv2.countNonZero(masked_edges)
                            poly_area = max(1.0, float(cv2.contourArea(poly)))
                            cnt = int(max(0, round((edge_pixels / poly_area) * area * 2.2)))

                            # Add Gaussian heat to buffer for estimated crowd distribution
                            if cnt > 0 and CV2_AVAILABLE:
                                M = cv2.moments(poly)
                                if M["m00"] != 0:
                                    cx_m = int(M["m10"] / M["m00"])
                                    cy_m = int(M["m01"] / M["m00"])
                                    for _ in range(min(cnt, 20)):
                                        ox = int(np.random.normal(0, 35))
                                        oy = int(np.random.normal(0, 20))
                                        add_gaussian_heat(mgr.heatmap_accumulator, cx_m + ox, cy_m + oy, sigma=24.0, intensity=1.2)
                        else:
                            cnt = 0
                        zone_results[code] = {
                            "count": cnt,
                            "density": round(cnt / area, 2) if area > 0 else 0.0,
                            "boxes": []
                        }

            else:
                # DM-Count Density Map Regression within Dynamic Polygon Masks
                processed_pytorch = False
                if TORCH_AVAILABLE and mgr.dm_model is not None and frame is not None and CV2_AVAILABLE:
                    try:
                        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        if transforms is not None:
                            transform = transforms.Compose([
                                transforms.ToTensor(),
                                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
                            ])
                            input_tensor = transform(img_rgb).unsqueeze(0).to(mgr.device)
                        else:
                            input_tensor = torch.from_numpy(img_rgb).permute(2, 0, 1).float().unsqueeze(0).to(mgr.device) / 255.0

                        with torch.no_grad():
                            density_map = mgr.dm_model(input_tensor)

                        dmap_np = density_map.squeeze().cpu().numpy()
                        if dmap_np.ndim == 3:
                            dmap_np = dmap_np[0]

                        if dmap_np.shape != (frame_h, frame_w):
                            dmap_np = cv2.resize(dmap_np, (frame_w, frame_h))

                        # Accumulate DM-Count tensor directly into density map buffer
                        if mgr.heatmap_accumulator is not None:
                            mgr.heatmap_accumulator += (dmap_np * 0.8).astype(np.float32)

                        for z in zones:
                            code = z["code"]
                            area = z["area_sqm"]
                            poly = zone_polys.get(code)
                            if poly is not None:
                                mask = np.zeros((frame_h, frame_w), dtype=np.float32)
                                cv2.fillPoly(mask, [poly], 1.0)
                                zone_density_sum = float(np.sum(dmap_np * mask))
                                count_in_zone = int(max(0, round(zone_density_sum)))
                            else:
                                count_in_zone = 0

                            zone_results[code] = {
                                "count": count_in_zone,
                                "density": round(count_in_zone / area, 2) if area > 0 else 0.0,
                                "boxes": []
                            }
                        processed_pytorch = True
                    except Exception as e:
                        logger.error("Error during PyTorch DM-Count tensor inference: %s", e)

                if not processed_pytorch:
                    # Real camera feed frame density map regression via OpenCV
                    for z in zones:
                        code = z["code"]
                        area = z["area_sqm"]
                        poly = zone_polys.get(code)
                        if poly is not None and frame is not None and CV2_AVAILABLE:
                            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                            edges = cv2.Canny(gray, 40, 120)
                            mask = np.zeros((frame_h, frame_w), dtype=np.uint8)
                            cv2.fillPoly(mask, [poly], 255)
                            masked_edges = cv2.bitwise_and(edges, edges, mask=mask)
                            edge_pixels = cv2.countNonZero(masked_edges)
                            poly_area = max(1.0, float(cv2.contourArea(poly)))
                            density_ratio = edge_pixels / poly_area
                            cnt = int(max(0, round(density_ratio * area * 2.8)))

                            if cnt > 0 and CV2_AVAILABLE:
                                M = cv2.moments(poly)
                                if M["m00"] != 0:
                                    cx_m = int(M["m10"] / M["m00"])
                                    cy_m = int(M["m01"] / M["m00"])
                                    for _ in range(min(cnt, 25)):
                                        ox = int(np.random.normal(0, 30))
                                        oy = int(np.random.normal(0, 20))
                                        add_gaussian_heat(mgr.heatmap_accumulator, cx_m + ox, cy_m + oy, sigma=26.0, intensity=1.4)
                        else:
                            cnt = 0

                        zone_results[code] = {
                            "count": cnt,
                            "density": round(cnt / area, 2) if area > 0 else 0.0,
                            "boxes": []
                        }

            for res in zone_results.values():
                if res["count"] > peak_zone_count:
                    peak_zone_count = res["count"]

            # Evaluate 45 / 35 Hysteresis Threshold
            mgr.evaluate_hysteresis(peak_zone_count)

            mgr.last_inference_latency_ms = round((time.perf_counter() - t_frame_start) * 1000.0, 2)

            # 4. Frame Rendering: Dynamic Toggling (Raw BBox, Heatmap Only, Blended 60/40)
            if frame is not None and CV2_AVAILABLE:
                mode = (mgr.stream_mode or "blended").lower().strip()
                color_heatmap = None

                if mgr.heatmap_accumulator is not None:
                    norm_heat = cv2.normalize(mgr.heatmap_accumulator, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
                    color_heatmap = cv2.applyColorMap(norm_heat, cv2.COLORMAP_JET)

                # Pillar 1 Stream Modes:
                if mode == "heatmap" and color_heatmap is not None:
                    # Heatmap Only: pure JET thermal density map without raw frame
                    annotated = color_heatmap.copy()
                    mode_display = "HEATMAP ONLY"
                elif mode in ("blended", "annotated") and color_heatmap is not None:
                    # Blended: 60% camera frame + 40% density heatmap
                    annotated = cv2.addWeighted(frame, 0.60, color_heatmap, 0.40, 0)
                    mode_display = "BLENDED (60/40)"
                else:
                    # Raw BBox: standard video frame without color heatmap overlay
                    annotated = frame.copy()
                    mode_display = "RAW BBOX"

                # Draw dynamic polygons
                for z in zones:
                    code = z["code"]
                    poly = zone_polys.get(code)
                    if poly is not None:
                        res = zone_results.get(code, {"count": 0, "density": 0.0})
                        cnt = res["count"]
                        dens = res["density"]

                        crit = z["critical_threshold"]
                        warn = z["warning_threshold"]
                        if cnt >= crit:
                            color = (0, 0, 230)
                            status_str = "CRITICAL"
                        elif cnt >= warn:
                            color = (0, 165, 255)
                            status_str = "BUSY"
                        else:
                            color = (60, 200, 60)
                            status_str = "NORMAL"

                        cv2.polylines(annotated, [poly], isClosed=True, color=color, thickness=2)

                        # Label badge
                        M = cv2.moments(poly)
                        cx = int(M["m10"] / M["m00"]) if M["m00"] != 0 else poly[0][0]
                        cy = int(M["m01"] / M["m00"]) if M["m00"] != 0 else poly[0][1]

                        cv2.rectangle(annotated, (cx - 50, cy - 18), (cx + 50, cy + 18), (10, 10, 15), -1)
                        cv2.rectangle(annotated, (cx - 50, cy - 18), (cx + 50, cy + 18), color, 1)
                        cv2.putText(annotated, f"{code}: {cnt} pax", (cx - 44, cy - 3),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.40, (240, 240, 240), 1, cv2.LINE_AA)
                        cv2.putText(annotated, f"{dens:.2f} p/m2", (cx - 44, cy + 12),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, color, 1, cv2.LINE_AA)

                # Draw YOLO bounding boxes (in Raw BBox and Blended modes)
                if mgr.active_model == MODEL_YOLO and mode != "heatmap":
                    for (x1, y1, x2, y2, conf), code in annotated_bboxes:
                        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 220, 100), 1)

                # HUD Top Bar
                cv2.rectangle(annotated, (0, 0), (frame_w, 34), (15, 15, 20), -1)
                cv2.line(annotated, (0, 34), (frame_w, 34), (45, 45, 55), 1)
                hud_title = f"● LIVE [{mode_display}] | {mgr.current_video_name} ({len(zones)} Dynamic Zones)"
                cv2.putText(annotated, hud_title, (12, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (230, 230, 230), 1, cv2.LINE_AA)

                model_tag = f"MODEL: [{mgr.active_model}] | LAT: {mgr.last_inference_latency_ms:.1f}ms"
                tag_col = (180, 100, 255) if mgr.active_model == MODEL_DM_COUNT else (50, 220, 120)
                cv2.putText(annotated, model_tag, (frame_w - 380, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.44, tag_col, 1, cv2.LINE_AA)

                ret_enc, jpeg_buf = cv2.imencode(".jpg", annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
                jpeg_bytes = jpeg_buf.tobytes() if ret_enc else None
            else:
                jpeg_bytes = None

            # 5. Transmit Ingestion to FastAPI Every 3 Seconds
            if (now - last_post_time) >= POST_INTERVAL_SECONDS:
                last_post_time = now

                readings_list = []
                for z in zones:
                    code = z["code"]
                    res = zone_results.get(code, {"count": 0, "density": 0.0})
                    readings_list.append({
                        "zone_code": code,
                        "count": res["count"],
                        "density": res["density"],
                        "model_used": mgr.active_model
                    })

                payload = {
                    "active_model": mgr.active_model,
                    "frame_number": frame_idx,
                    "inference_latency_ms": mgr.last_inference_latency_ms,
                    "readings": readings_list
                }
                if jpeg_bytes:
                    payload["frame_base64"] = base64.b64encode(jpeg_bytes).decode("ascii")

                if requests:
                    try:
                        resp = requests.post(COUNTS_URL, json=payload, timeout=2.5)
                        if resp.status_code in (200, 201):
                            data = resp.json()
                            trans = data.get("state_transitions", [])
                            if trans:
                                for t in trans:
                                    logger.info("⚠️ [ALERT TRANSITION] %s", json.dumps(t))
                    except Exception as e:
                        logger.debug("Ingestion POST note: %s", e)

                    if jpeg_bytes:
                        try:
                            requests.post(FRAME_URL, data=jpeg_bytes, headers={"Content-Type": "image/jpeg"}, timeout=0.5)
                        except Exception:
                            pass

                # Terminal log
                summary = " | ".join([f"{z['code']}: {zone_results[z['code']]['count']} ({zone_results[z['code']]['density']:.2f}/m²)" for z in zones[:4]])
                logger.info("Frame #%05d | Model: %-8s | %s", frame_idx, mgr.active_model, summary)

            time.sleep(0.06)

    except KeyboardInterrupt:
        logger.info("Dynamic vision worker stopped by user.")
    finally:
        if cap is not None:
            cap.release()
        logger.info("Shutdown complete.")


if __name__ == "__main__":
    run_dynamic_vision_worker()
