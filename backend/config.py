"""
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
]
