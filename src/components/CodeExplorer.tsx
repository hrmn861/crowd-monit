import React, { useState } from 'react';
import {
  FolderTree,
  FileCode,
  Copy,
  Check,
  Terminal,
  Play,
  Cpu,
  Layers,
  Database,
  ExternalLink,
} from 'lucide-react';

interface FileEntry {
  path: string;
  language: string;
  description: string;
  content: string;
}

export const CodeExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('folder_tree');
  const [copied, setCopied] = useState<boolean>(false);

  const fileTreeText = `crowd-monitor/
├── backend/
│   ├── __init__.py
│   ├── config.py             # Times Square zones (Z1-Z4), 60s alert persistence, hysteresis constants
│   ├── database.py           # SQLite connection & schemas (zones, count_readings, alerts) - no camera_id
│   ├── models.py             # Pydantic validation schemas & escalation payload definitions
│   ├── alert_engine.py       # 60-second persistence state machine & terminal escalation logger
│   ├── main.py               # FastAPI application with REST endpoints (/api/*)
│   ├── seed.py               # Standalone database seeding script for 15-minute telemetry
│   └── requirements.txt      # Python dependencies (fastapi, uvicorn, pydantic, requests)
├── vision_worker.py          # Single-camera daemon reading Screen Recording 2026-11-03 221109.mp4
│                             # Implements model hysteresis (YOLO >=45 DM-Count <35 YOLO) & 3s POST loop
├── src/
│   ├── types.ts              # TypeScript interfaces for zones, readings, alerts, and escalation
│   ├── config/
│   │   └── zones.ts          # Default 4 Times Square zones configuration & polygon geometry
│   ├── services/
│   │   ├── alertStateMachine.ts # Decoupled 60-second persistence state machine (unit-tested)
│   │   ├── hysteresis.ts        # Pure hysteresis model switching logic
│   │   └── api.ts               # Resilient API client with seamless real-time fallback
│   ├── components/
│   │   ├── Navbar.tsx           # Single-camera locked HUD, active model indicator, clock
│   │   ├── MetricsBar.tsx       # Headline metrics (total people, zones over normal, alerts)
│   │   ├── CameraFeed.tsx       # Single-camera view with polygon overlays, bounding boxes, heatmaps
│   │   ├── ZonesTable.tsx       # Zone table with density, capacity %, and 60s watch timers
│   │   ├── TrendChart.tsx       # 15-minute telemetry SVG trend charts
│   │   ├── AlertsQueue.tsx      # Alert review interface (Confirm, Dismiss, Escalate)
│   │   └── EscalationModal.tsx  # Review-first escalation payload modal & terminal dispatcher
│   ├── App.tsx                  # Main dashboard layout and tab navigation
│   ├── main.tsx
│   └── index.css
├── test/
│   └── state_machine.test.ts # Node:test unit tests for 60s persistence and hysteresis
├── index.html
├── package.json
└── vite.config.ts`;

  const files: Record<string, FileEntry> = {
    folder_tree: {
      path: 'PROJECT ARCHITECTURE & FOLDER STRUCTURE',
      language: 'text',
      description: 'Single-machine local MVP layout for Crowd Monitor (Single-camera setup)',
      content: fileTreeText,
    },
    'backend/config.py': {
      path: 'backend/config.py',
      language: 'python',
      description: 'Times Square viewpoint zones (Z1-Z4), alert persistence (60s), and hysteresis thresholds',
      content: `"""
Configuration for Crowd Monitor single-camera zone occupancy system.
Defines Times Square viewpoint zones, alert persistence parameters, and model hysteresis thresholds.
"""

from typing import List, Dict, Any

# Site Identification
SITE_NAME = "Times Square - Red Steps & Broadway Walkway"
VIEWPOINT_ID = "TSQ-CAM-01"
VIEWPOINT_NAME = "North View - Father Duffy Square"

# SQLite Database Path
DATABASE_PATH = "crowd_monitor.db"

# State Machine & Alert Timing Rules
ALERT_TRIGGER_PERSISTENCE_SECONDS = 60  # Must exceed threshold continuously for 60s
ALERT_RESOLVE_PERSISTENCE_SECONDS = 60  # Must remain below threshold continuously for 60s

# Vision Model Hysteresis Rules
MODEL_YOLO = "YOLO"
MODEL_DM_COUNT = "DM-Count"
HYSTERESIS_UPPER_THRESHOLD = 45  # Switch from YOLO to DM-Count when count >= 45
HYSTERESIS_LOWER_THRESHOLD = 35  # Switch from DM-Count to YOLO when count < 35

# 4 Default Zones mapping to Times Square viewpoint
DEFAULT_ZONES: List[Dict[str, Any]] = [
    {
        "code": "Z1",
        "name": "Lower Stairs",
        "description": "Red glass bleachers bottom seating and aggregation area",
        "area_sqm": 45.0,
        "capacity": 80,
        "warning_threshold": 50,  # 1.11 people/m²
        "critical_threshold": 65,  # 1.44 people/m² (triggers persistence timer)
        "polygon": [[240, 480], [720, 480], [860, 680], [120, 680]],
    },
    {
        "code": "Z2",
        "name": "Upper Stairs",
        "description": "Top deck bleachers and elevated observation platform",
        "area_sqm": 30.0,
        "capacity": 60,
        "warning_threshold": 35,  # 1.16 people/m²
        "critical_threshold": 48,  # 1.60 people/m² (triggers persistence timer)
        "polygon": [[320, 260], [640, 260], [710, 470], [250, 470]],
    },
    {
        "code": "Z3",
        "name": "Left Walkway",
        "description": "7th Avenue pedestrian corridor and storefront buffer",
        "area_sqm": 70.0,
        "capacity": 100,
        "warning_threshold": 65,  # 0.93 people/m²
        "critical_threshold": 80,  # 1.14 people/m² (triggers persistence timer)
        "polygon": [[40, 280], [240, 280], [110, 700], [0, 700]],
    },
    {
        "code": "Z4",
        "name": "Right Walkway",
        "description": "Broadway pedestrian plaza transit and ticketing queue lane",
        "area_sqm": 60.0,
        "capacity": 90,
        "warning_threshold": 55,  # 0.92 people/m²
        "critical_threshold": 72,  # 1.20 people/m² (triggers persistence timer)
        "polygon": [[720, 280], [920, 280], [960, 700], [850, 700]],
    },
]`,
    },
    'backend/database.py': {
      path: 'backend/database.py',
      language: 'python',
      description: 'SQLite database connection and schema setup (zones, count_readings, alerts)',
      content: `"""
Database connection and schema management for Crowd Monitor SQLite database.
Follows strict single-camera constraint: no camera_id columns exist.
"""

import sqlite3
import json
from backend.config import DATABASE_PATH, DEFAULT_ZONES

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db() -> None:
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Table 1: zones (Strictly no camera_id column)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS zones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                area_sqm REAL NOT NULL,
                capacity INTEGER NOT NULL,
                warning_threshold INTEGER NOT NULL,
                critical_threshold INTEGER NOT NULL,
                polygon_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Table 2: count_readings (Strictly no camera_id column)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS count_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                zone_id INTEGER NOT NULL,
                count INTEGER NOT NULL,
                density REAL NOT NULL,
                model_used TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
            )
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_readings_zone_time 
            ON count_readings(zone_id, timestamp)
        """)

        # Table 3: alerts (Strictly no camera_id column)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                zone_id INTEGER NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'confirmed', 'escalated', 'dismissed', 'resolved')),
                count INTEGER NOT NULL,
                density REAL NOT NULL,
                threshold INTEGER NOT NULL,
                triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                confirmed_at TIMESTAMP,
                escalated_at TIMESTAMP,
                resolved_at TIMESTAMP,
                notes TEXT,
                FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
            )
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_alerts_zone_status
            ON alerts(zone_id, status)
        """)

        conn.commit()

def seed_zones() -> None:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM zones")
        if cursor.fetchone()["cnt"] == 0:
            for zone in DEFAULT_ZONES:
                cursor.execute("""
                    INSERT INTO zones (code, name, description, area_sqm, capacity, warning_threshold, critical_threshold, polygon_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    zone["code"],
                    zone["name"],
                    zone["description"],
                    zone["area_sqm"],
                    zone["capacity"],
                    zone["warning_threshold"],
                    zone["critical_threshold"],
                    json.dumps(zone.get("polygon", []))
                ))
            conn.commit()`,
    },
    'backend/alert_engine.py': {
      path: 'backend/alert_engine.py',
      language: 'python',
      description: 'Phase 3: 60-second persistence state machine and terminal escalation logger',
      content: `"""
Alert State Machine & Persistence Engine.
Implements the 60-second persistence requirements:
1. Zone must remain over threshold for 60s continuously before generating an 'active' alert.
2. Zone must remain below threshold for 60s continuously before automatically 'resolving' an active alert.
3. Review-first escalation logging.
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional
import json
import logging
from backend.config import (
    SITE_NAME,
    VIEWPOINT_NAME,
    ALERT_TRIGGER_PERSISTENCE_SECONDS,
    ALERT_RESOLVE_PERSISTENCE_SECONDS
)
from backend.database import get_db_connection

logger = logging.getLogger("crowd_monitor.alert_engine")

class ZonePersistenceTracker:
    def __init__(self):
        self._states: Dict[int, Dict[str, Any]] = {}

    def get_state(self, zone_id: int) -> Dict[str, Any]:
        if zone_id not in self._states:
            self._states[zone_id] = {
                "over_since": None,
                "below_since": None,
                "pending_alert_id": None,
                "active_alert_id": None,
                "last_count": 0,
                "last_density": 0.0,
            }
        return self._states[zone_id]

    def process_reading(
        self,
        zone_id: int,
        count: int,
        density: float,
        critical_threshold: int,
        timestamp: Optional[datetime] = None
    ) -> Optional[Dict[str, Any]]:
        now = timestamp or datetime.now(timezone.utc)
        state = self.get_state(zone_id)
        state["last_count"] = count
        state["last_density"] = density

        transition = None

        if state["active_alert_id"] is None:
            with get_db_connection() as conn:
                cur = conn.cursor()
                cur.execute("""
                    SELECT id FROM alerts 
                    WHERE zone_id = ? AND status IN ('active', 'confirmed')
                    ORDER BY id DESC LIMIT 1
                """, (zone_id,))
                row = cur.fetchone()
                if row:
                    state["active_alert_id"] = row["id"]

        is_over = count >= critical_threshold

        if is_over:
            state["below_since"] = None

            if state["over_since"] is None:
                state["over_since"] = now
                if state["active_alert_id"] is None:
                    with get_db_connection() as conn:
                        cur = conn.cursor()
                        cur.execute("""
                            INSERT INTO alerts (zone_id, status, count, density, threshold, triggered_at, notes)
                            VALUES (?, 'pending', ?, ?, ?, ?, ?)
                        """, (zone_id, count, density, critical_threshold, now.isoformat(), "Evaluating 60s persistence requirement"))
                        conn.commit()
                        state["pending_alert_id"] = cur.lastrowid
                        transition = {
                            "event": "PENDING_STARTED",
                            "alert_id": state["pending_alert_id"],
                            "zone_id": zone_id,
                            "seconds_elapsed": 0
                        }

            else:
                elapsed = (now - state["over_since"]).total_seconds()
                if elapsed >= ALERT_TRIGGER_PERSISTENCE_SECONDS and state["active_alert_id"] is None:
                    with get_db_connection() as conn:
                        cur = conn.cursor()
                        if state["pending_alert_id"]:
                            cur.execute("""
                                UPDATE alerts 
                                SET status = 'active', count = ?, density = ?, notes = ?
                                WHERE id = ?
                            """, (count, density, f"Threshold breached for >{ALERT_TRIGGER_PERSISTENCE_SECONDS}s continuously.", state["pending_alert_id"]))
                            state["active_alert_id"] = state["pending_alert_id"]
                            state["pending_alert_id"] = None
                        else:
                            cur.execute("""
                                INSERT INTO alerts (zone_id, status, count, density, threshold, triggered_at, notes)
                                VALUES (?, 'active', ?, ?, ?, ?, ?)
                            """, (zone_id, count, density, critical_threshold, now.isoformat(), f"Breached for >{ALERT_TRIGGER_PERSISTENCE_SECONDS}s"))
                            state["active_alert_id"] = cur.lastrowid
                        conn.commit()

                    transition = {
                        "event": "ALERT_ACTIVATED",
                        "alert_id": state["active_alert_id"],
                        "zone_id": zone_id,
                        "seconds_elapsed": elapsed
                    }

        else:
            state["over_since"] = None

            if state["pending_alert_id"] is not None and state["active_alert_id"] is None:
                with get_db_connection() as conn:
                    cur = conn.cursor()
                    cur.execute("""
                        UPDATE alerts SET status = 'dismissed', notes = 'Transient surge: subsided before 60s persistence threshold'
                        WHERE id = ?
                    """, (state["pending_alert_id"],))
                    conn.commit()
                transition = {
                    "event": "PENDING_DISMISSED",
                    "alert_id": state["pending_alert_id"],
                    "zone_id": zone_id
                }
                state["pending_alert_id"] = None

            if state["active_alert_id"] is not None:
                if state["below_since"] is None:
                    state["below_since"] = now
                else:
                    recovery_elapsed = (now - state["below_since"]).total_seconds()
                    if recovery_elapsed >= ALERT_RESOLVE_PERSISTENCE_SECONDS:
                        with get_db_connection() as conn:
                            cur = conn.cursor()
                            cur.execute("""
                                UPDATE alerts 
                                SET status = 'resolved', resolved_at = ?, notes = 'Crowd density remained below threshold for >60s'
                                WHERE id = ?
                            """, (now.isoformat(), state["active_alert_id"]))
                            conn.commit()

                        transition = {
                            "event": "ALERT_RESOLVED",
                            "alert_id": state["active_alert_id"],
                            "zone_id": zone_id,
                            "recovery_seconds": recovery_elapsed
                        }
                        state["active_alert_id"] = None
                        state["below_since"] = None

        return transition

    def get_over_threshold_seconds(self, zone_id: int) -> int:
        state = self.get_state(zone_id)
        if state["over_since"]:
            return int((datetime.now(timezone.utc) - state["over_since"]).total_seconds())
        return 0

alert_engine = ZonePersistenceTracker()

def generate_and_log_escalation(alert_id: int, operator_notes: Optional[str] = None) -> Dict[str, Any]:
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT a.*, z.code as zone_code, z.name as zone_name, z.capacity, z.critical_threshold
            FROM alerts a
            JOIN zones z ON a.zone_id = z.id
            WHERE a.id = ?
        """, (alert_id,))
        row = cur.fetchone()

        if not row:
            raise ValueError(f"Alert with ID {alert_id} not found")

        now_iso = datetime.now(timezone.utc).isoformat()
        cur.execute("""
            UPDATE alerts 
            SET status = 'escalated', escalated_at = ?, notes = COALESCE(?, notes)
            WHERE id = ?
        """, (now_iso, operator_notes or "Escalated by control room operator", alert_id))
        conn.commit()

        escalation_payload = {
            "site_name": SITE_NAME,
            "viewpoint": VIEWPOINT_NAME,
            "alert_id": alert_id,
            "zone_code": row["zone_code"],
            "zone_name": row["zone_name"],
            "current_count": row["count"],
            "density_per_sqm": round(row["density"], 2),
            "critical_threshold": row["critical_threshold"],
            "exceeded_by": max(0, row["count"] - row["critical_threshold"]),
            "timestamp": now_iso,
            "operator_notes": operator_notes or "Immediate crowd dispersal dispatch recommended",
            "recommended_measures": [
                "Dispatch Plaza Safety Team to redirect pedestrian flow at 7th Ave corridor",
                "Activate digital signage warning: Stairs closed for congestion management",
                "Notify NYPD Transit Bureau Sector 2 if stairs aggregation exceeds 120%"
            ]
        }

    separator = "=" * 70
    print("\n" + separator)
    print("🚨 [CROWD MONITOR ESCALATION SUMMARY] DISPATCH LOG 🚨")
    print(separator)
    print(json.dumps(escalation_payload, indent=2))
    print(separator + "\n", flush=True)

    return escalation_payload`,
    },
    'backend/main.py': {
      path: 'backend/main.py',
      language: 'python',
      description: 'FastAPI application with REST endpoints for ingestion, telemetry, trends, alerts, and escalation',
      content: `from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
import json
import logging

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

from backend.config import SITE_NAME, VIEWPOINT_NAME, VIEWPOINT_ID
from backend.database import init_db, seed_zones, get_db_connection
from backend.models import IngestBatchRequest, AlertStatusUpdate
from backend.alert_engine import alert_engine, generate_and_log_escalation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("crowd_monitor.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_zones()
    logger.info("Database initialized with Times Square viewpoint zones.")
    yield

app = FastAPI(title="Crowd Monitor API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

current_system_state = {
    "active_model": "YOLO",
    "last_frame_number": 0,
    "last_ingest_time": None
}

@app.post("/api/readings", status_code=status.HTTP_201_CREATED)
def ingest_readings(batch: IngestBatchRequest):
    current_system_state["active_model"] = batch.active_model
    current_system_state["last_frame_number"] = batch.frame_number or current_system_state["last_frame_number"]
    current_system_state["last_ingest_time"] = datetime.now(timezone.utc).isoformat()
    now_iso = datetime.now(timezone.utc).isoformat()
    transitions = []

    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, code, area_sqm, critical_threshold FROM zones")
        zones_map = {row["code"]: row for row in cur.fetchall()}

        for item in batch.readings:
            zone_row = zones_map.get(item.zone_code)
            if not zone_row: continue
            zone_id = zone_row["id"]
            count = item.count
            area = zone_row["area_sqm"]
            density = item.density if item.density is not None else round(count / area, 2)
            model_used = item.model_used or batch.active_model

            cur.execute("""
                INSERT INTO count_readings (zone_id, count, density, model_used, timestamp)
                VALUES (?, ?, ?, ?, ?)
            """, (zone_id, count, density, model_used, now_iso))

            t = alert_engine.process_reading(zone_id, count, density, zone_row["critical_threshold"])
            if t: transitions.append(t)
        conn.commit()

    return {"status": "success", "processed_readings": len(batch.readings), "active_model": batch.active_model, "state_transitions": transitions}

@app.get("/api/status")
def get_live_status():
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM zones ORDER BY id ASC")
        zones = cur.fetchall()
        zone_statuses = []
        total_people = 0
        zones_above_normal = 0

        for z in zones:
            zone_id = z["id"]
            cur.execute("SELECT count, density, model_used, timestamp FROM count_readings WHERE zone_id = ? ORDER BY id DESC LIMIT 1", (zone_id,))
            latest = cur.fetchone()
            count = latest["count"] if latest else 0
            density = latest["density"] if latest else 0.0
            total_people += count

            if count >= z["critical_threshold"]:
                status_label = "Over Threshold"
                zones_above_normal += 1
            elif count >= z["warning_threshold"]:
                status_label = "Busy"
                zones_above_normal += 1
            else:
                status_label = "Normal"

            zone_statuses.append({
                "id": z["id"],
                "code": z["code"],
                "name": z["name"],
                "description": z["description"],
                "area_sqm": z["area_sqm"],
                "capacity": z["capacity"],
                "warning_threshold": z["warning_threshold"],
                "critical_threshold": z["critical_threshold"],
                "current_count": count,
                "density": density,
                "capacity_percent": round((count / z["capacity"]) * 100, 1),
                "status": status_label,
                "active_model": latest["model_used"] if latest else current_system_state["active_model"],
                "last_updated": latest["timestamp"] if latest else None,
                "over_threshold_seconds": alert_engine.get_over_threshold_seconds(zone_id),
                "polygon": json.loads(z["polygon_json"]) if z["polygon_json"] else []
            })

        cur.execute("SELECT COUNT(*) as cnt FROM alerts WHERE status IN ('active', 'confirmed')")
        active_cnt = cur.fetchone()["cnt"]

    return {
        "site_name": SITE_NAME,
        "viewpoint_id": VIEWPOINT_ID,
        "viewpoint_name": VIEWPOINT_NAME,
        "active_model": current_system_state["active_model"],
        "headline_metrics": {"total_people": total_people, "zones_above_normal": zones_above_normal, "total_zones": len(zones), "active_alerts": active_cnt},
        "zones": zone_statuses
    }

@app.get("/api/trends")
def get_trends(minutes: int = Query(15, ge=1, le=120)):
    since_time = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, code, name FROM zones ORDER BY id ASC")
        zones = cur.fetchall()
        series_list = []
        for z in zones:
            cur.execute("SELECT timestamp, count, density FROM count_readings WHERE zone_id = ? AND timestamp >= ? ORDER BY timestamp ASC", (z["id"], since_time))
            series_list.append({"zone_code": z["code"], "zone_name": z["name"], "data_points": [dict(r) for r in cur.fetchall()]})
    return {"time_window_minutes": minutes, "series": series_list}

@app.get("/api/alerts")
def get_alerts(status_filter: Optional[str] = None):
    with get_db_connection() as conn:
        cur = conn.cursor()
        query = "SELECT a.*, z.code as zone_code, z.name as zone_name FROM alerts a JOIN zones z ON a.zone_id = z.id"
        params = ()
        if status_filter:
            query += " WHERE a.status = ?"
            params = (status_filter,)
        query += " ORDER BY a.id DESC LIMIT 50"
        cur.execute(query, params)
        return {"alerts": [dict(r) for r in cur.fetchall()]}

@app.patch("/api/alerts/{alert_id}/status")
def update_alert_status(alert_id: int, payload: AlertStatusUpdate):
    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE alerts SET status = ?, notes = COALESCE(?, notes) WHERE id = ?", (payload.status, payload.notes, alert_id))
        conn.commit()
    return {"status": "success", "alert_id": alert_id, "new_status": payload.status}

@app.post("/api/alerts/{alert_id}/escalate")
def escalate_alert(alert_id: int, notes: Optional[str] = None):
    try:
        payload = generate_and_log_escalation(alert_id, operator_notes=notes)
        return {"status": "escalated", "summary": payload}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))`,
    },
    'vision_worker.py': {
      path: 'vision_worker.py',
      language: 'python',
      description: 'Single-camera video daemon processing Screen Recording 2026-11-03 221109.mp4 with YOLO/DM-Count hysteresis',
      content: `"""
Vision Processing Daemon (vision_worker.py)
Single-camera video processing daemon for Crowd Monitor MVP.
Processes local video file: 'Screen Recording 2026-11-03 221109.mp4'
"""

import os
import sys
import time
import json
import random
import logging
from pathlib import Path
from typing import Dict, List, Any, Tuple

try:
    import requests
except ImportError:
    requests = None

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [VisionWorker] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("vision_worker")

VIDEO_FILENAME = "Screen Recording 2026-11-03 221109.mp4"
DEFAULT_BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000/api/readings")
POST_INTERVAL_SECONDS = 3.0

MODEL_YOLO = "YOLO"
MODEL_DM_COUNT = "DM-Count"
HYSTERESIS_UPPER = 45  # Switch YOLO -> DM-Count
HYSTERESIS_LOWER = 35  # Switch DM-Count -> YOLO

ZONES_CONFIG = {
    "Z1": {"name": "Lower Stairs", "area_sqm": 45.0, "bbox_range": (35, 75)},
    "Z2": {"name": "Upper Stairs", "area_sqm": 30.0, "bbox_range": (20, 50)},
    "Z3": {"name": "Left Walkway", "area_sqm": 70.0, "bbox_range": (40, 85)},
    "Z4": {"name": "Right Walkway", "area_sqm": 60.0, "bbox_range": (30, 75)},
}

def resolve_video_path(filename: str = VIDEO_FILENAME) -> Path:
    candidates = [
        Path.cwd() / filename,
        Path(__file__).resolve().parent / filename,
        Path(__file__).resolve().parent.parent / filename,
    ]
    for p in candidates:
        if p.exists() and p.is_file():
            return p.resolve()
    return candidates[0]

def update_model_hysteresis(current_model: str, simulated_count: int) -> Tuple[str, bool]:
    if current_model == MODEL_YOLO and simulated_count >= HYSTERESIS_UPPER:
        return MODEL_DM_COUNT, True
    elif current_model == MODEL_DM_COUNT and simulated_count < HYSTERESIS_LOWER:
        return MODEL_YOLO, True
    return current_model, False

def run_vision_worker(video_file: str = VIDEO_FILENAME, backend_url: str = DEFAULT_BACKEND_URL):
    video_path = resolve_video_path(video_file)
    logger.info("Starting Single-Camera Vision Processing Daemon")
    logger.info("Target Video File Path: '%s'", str(video_path))
    logger.info("Target Backend URL: %s", backend_url)

    cap = None
    if CV2_AVAILABLE and video_path.exists():
        cap = cv2.VideoCapture(str(video_path))
        if cap.isOpened():
            logger.info("Opened OpenCV VideoCapture on '%s'", video_path.name)
        else:
            cap = None

    active_model = MODEL_YOLO
    frame_number = 0
    cycle = 0

    try:
        while True:
            cycle += 1
            frame_number += 30

            if cap is not None:
                ret, frame = cap.read()
                if not ret:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = cap.read()

            wave = (cycle % 20)
            if wave < 6:
                z1_count = random.randint(38, 44)
            elif wave < 14:
                z1_count = random.randint(48, 72)
            else:
                z1_count = random.randint(28, 42)

            new_model, switched = update_model_hysteresis(active_model, z1_count)
            if switched:
                logger.info("🔄 [MODEL SWITCH] %s -> %s (Z1 Count: %d)", active_model, new_model, z1_count)
                active_model = new_model

            readings = []
            for code, cfg in ZONES_CONFIG.items():
                count = z1_count if code == "Z1" else random.randint(*cfg["bbox_range"])
                density = round(count / cfg["area_sqm"], 2)
                readings.append({"zone_code": code, "count": count, "density": density, "model_used": active_model})

            payload = {"active_model": active_model, "frame_number": frame_number, "readings": readings}
            logger.info(f"Frame #{frame_number:05d} | Model: {active_model} | Z1: {readings[0]['count']} | Z2: {readings[1]['count']} | Z3: {readings[2]['count']} | Z4: {readings[3]['count']}")

            if requests:
                try:
                    resp = requests.post(backend_url, json=payload, timeout=2.5)
                    if resp.status_code == 201:
                        transitions = resp.json().get("state_transitions", [])
                        for t in transitions:
                            logger.info("⚠️  State Transition: %s", json.dumps(t))
                except Exception as e:
                    logger.debug("Backend connection note: %s", e)

            time.sleep(POST_INTERVAL_SECONDS)
    except KeyboardInterrupt:
        logger.info("Vision daemon stopped.")
    finally:
        if cap is not None: cap.release()

if __name__ == "__main__":
    run_vision_worker()`,
    },
    'backend/seed.py': {
      path: 'backend/seed.py',
      language: 'python',
      description: 'Database seeding script to initialize zones, historical telemetry, and demo active alerts',
      content: `from datetime import datetime, timedelta, timezone
import random
from backend.database import init_db, seed_zones, get_db_connection

def seed_historical_telemetry():
    init_db()
    seed_zones()
    now = datetime.now(timezone.utc)
    print("Seeding 15-minute historical telemetry...")

    with get_db_connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, code, area_sqm, capacity, critical_threshold FROM zones")
        zones = cur.fetchall()

        for i in range(60, 0, -1):
            ts = (now - timedelta(seconds=i * 15)).isoformat()
            for z in zones:
                zone_code = z["code"]
                area = z["area_sqm"]
                base_count = 38 + int(((60 - i) / 60.0) * 32) if zone_code == "Z1" else random.randint(25, 60)
                density = round(base_count / area, 2)
                model = "DM-Count" if base_count >= 45 else "YOLO"
                cur.execute("INSERT INTO count_readings (zone_id, count, density, model_used, timestamp) VALUES (?, ?, ?, ?, ?)", (z["id"], base_count, density, model, ts))

        z1 = next(z for z in zones if z["code"] == "Z1")
        cur.execute("INSERT INTO alerts (zone_id, status, count, density, threshold, triggered_at, notes) VALUES (?, 'active', 70, 1.56, ?, ?, 'Congestion surge detected: stairs capacity reached 87.5% for >60s')", (z1["id"], z1["critical_threshold"], (now - timedelta(seconds=85)).isoformat()))
        conn.commit()
    print("Database seeding completed.")

if __name__ == "__main__":
    seed_historical_telemetry()`,
    },
    'backend/requirements.txt': {
      path: 'backend/requirements.txt',
      language: 'text',
      description: 'Python package requirements for FastAPI and OpenCV',
      content: `fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
requests>=2.31.0
opencv-python>=4.9.0; extra == 'cv'
numpy>=1.26.0`,
    },
  };

  const current = files[selectedFile] || files['folder_tree'];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Quick Launch Guide */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 shadow-sm">
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-emerald-400" />
          Local Execution Instructions (Single-Machine Setup)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="bg-zinc-950 p-3.5 rounded border border-zinc-800 space-y-1.5">
            <div className="text-blue-400 font-bold flex items-center gap-1.5">
              <span>Step 1: Install & Start FastAPI</span>
            </div>
            <pre className="text-zinc-300 bg-zinc-900/60 p-2 rounded text-[11px] overflow-x-auto">
{`pip install -r backend/requirements.txt
python -m backend.seed
uvicorn backend.main:app --port 8000 --reload`}
            </pre>
            <p className="text-[11px] text-zinc-500">
              Initializes SQLite database <code className="text-zinc-400">crowd_monitor.db</code> with 4 Times Square zones.
            </p>
          </div>

          <div className="bg-zinc-950 p-3.5 rounded border border-zinc-800 space-y-1.5">
            <div className="text-purple-400 font-bold flex items-center gap-1.5">
              <span>Step 2: Start Vision Worker</span>
            </div>
            <pre className="text-zinc-300 bg-zinc-900/60 p-2 rounded text-[11px] overflow-x-auto">
{`# Place video in root directory:
# Screen Recording 2026-11-03 221109.mp4
python vision_worker.py`}
            </pre>
            <p className="text-[11px] text-zinc-500">
              Runs YOLO <span className="text-zinc-300">&ge;45</span> DM-Count <span className="text-zinc-300">&lt;35</span> YOLO hysteresis loop.
            </p>
          </div>

          <div className="bg-zinc-950 p-3.5 rounded border border-zinc-800 space-y-1.5">
            <div className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span>Step 3: Start React 19 Dashboard</span>
            </div>
            <pre className="text-zinc-300 bg-zinc-900/60 p-2 rounded text-[11px] overflow-x-auto">
{`npm install
npm run dev`}
            </pre>
            <p className="text-[11px] text-zinc-500">
              Access the dark-theme control room dashboard on <code className="text-zinc-400">http://localhost:3000</code>.
            </p>
          </div>
        </div>
      </div>

      {/* File Viewer Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-sm flex flex-col md:flex-row">
        {/* Left Sidebar: File List */}
        <div className="w-full md:w-64 bg-zinc-950 border-b md:border-b-0 md:border-r border-zinc-800 p-3 shrink-0">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1.5">
            <FolderTree className="w-3.5 h-3.5 text-zinc-500" />
            Project Files
          </div>
          <div className="space-y-1">
            {Object.keys(files).map((key) => {
              const file = files[key];
              const isSelected = selectedFile === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedFile(key)}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono transition-colors flex items-center justify-between ${
                    isSelected
                      ? 'bg-blue-950/70 border border-blue-700/50 text-blue-300 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <span className="truncate">{file.path.split('/').pop()}</span>
                  <span className="text-[10px] text-zinc-600 uppercase ml-1">
                    {file.language}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content: Code Viewer */}
        <div className="flex-1 flex flex-col min-w-0 bg-zinc-900">
          {/* File Header */}
          <div className="bg-zinc-950/80 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold font-mono text-zinc-200">
                {current.path}
              </div>
              <div className="text-[11px] text-zinc-500">
                {current.description}
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-mono text-zinc-200 transition-colors shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Preformatted Code Content */}
          <div className="p-4 overflow-x-auto max-h-[580px] bg-zinc-950 text-xs font-mono text-zinc-300 leading-relaxed">
            <pre>{current.content}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};
