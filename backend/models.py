"""
Pydantic schemas and models for FastAPI request validation and API responses.
Includes schemas for JWT Authentication, Video Uploads, Dynamic Polygon Zones,
and Count Readings ingestion.
"""

from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr


# ----------------------------------------------------------------------------
# 1. User & Authentication Schemas
# ----------------------------------------------------------------------------
class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Operator username")
    email: str = Field(..., description="Corporate or operator email address")
    password: str = Field(..., min_length=6, description="Account password")
    role: Optional[str] = Field("operator", description="'operator', 'supervisor', 'admin'")


class UserLoginRequest(BaseModel):
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="Account password")


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserResponse


# ----------------------------------------------------------------------------
# 2. Video & Media Schemas
# ----------------------------------------------------------------------------
class VideoResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    duration_seconds: float
    fps: float
    width: int
    height: int
    is_active: bool
    uploaded_at: str
    first_frame_url: str
    zone_count: int = 0


# ----------------------------------------------------------------------------
# 3. Dynamic Polygon Zones Schemas
# ----------------------------------------------------------------------------
class DynamicZoneInput(BaseModel):
    code: str = Field(..., description="Unique zone code, e.g. Z1, Z2, Z3")
    name: str = Field(..., description="Zone display name, e.g. 'Lower Escalator'")
    description: Optional[str] = Field("", description="Zone description")
    area_sqm: float = Field(..., gt=0.0, description="Estimated zone area in square meters")
    capacity: int = Field(..., gt=0, description="Maximum safe person capacity")
    warning_threshold: int = Field(..., gt=0, description="Threshold for 'Busy' status")
    critical_threshold: int = Field(..., gt=0, description="Threshold triggering 60s alert timer")
    polygon: List[List[int]] = Field(..., min_length=3, description="List of [x, y] polygon coordinates")


class DynamicZonesDeployRequest(BaseModel):
    zones: List[DynamicZoneInput]


class ZoneResponse(BaseModel):
    id: int
    video_id: Optional[int] = None
    code: str
    name: str
    description: str
    area_sqm: float
    capacity: int
    warning_threshold: int
    critical_threshold: int
    polygon: Optional[List[List[int]]] = None


class ZoneLiveStatus(BaseModel):
    id: int
    code: str
    name: str
    description: str
    area_sqm: float
    capacity: int
    current_count: int
    density: float
    capacity_percent: float
    status: str  # 'Normal', 'Busy', 'Over Threshold'
    active_model: str
    last_updated: Optional[str]
    critical_threshold: int
    warning_threshold: int
    over_threshold_seconds: int
    polygon: Optional[List[List[int]]] = None


# ----------------------------------------------------------------------------
# 4. Ingestion & Reading Schemas
# ----------------------------------------------------------------------------
class ZoneReadingInput(BaseModel):
    zone_code: str = Field(..., description="Target zone code, e.g. Z1, Z2, Z3, Z4")
    count: int = Field(..., ge=0, description="Observed person count in this zone")
    density: Optional[float] = Field(None, ge=0.0, description="Calculated density (people/m²)")
    model_used: str = Field("YOLO", description="Vision model used: 'YOLO' or 'DM-Count'")
    timestamp: Optional[str] = Field(None, description="ISO timestamp of observation")


class IngestBatchRequest(BaseModel):
    readings: List[ZoneReadingInput]
    active_model: str = Field("YOLO", description="Global model state from vision daemon")
    frame_number: Optional[int] = Field(None, description="Processed frame sequence number")
    frame_base64: Optional[str] = Field(None, description="Optional encoded JPEG frame")


# ----------------------------------------------------------------------------
# 5. Alert & Escalation Schemas
# ----------------------------------------------------------------------------
class AlertStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|active|confirmed|escalated|dismissed|resolved)$")
    notes: Optional[str] = None


class AlertResponse(BaseModel):
    id: int
    zone_id: int
    zone_code: str
    zone_name: str
    status: str
    count: int
    density: float
    threshold: int
    triggered_at: str
    confirmed_at: Optional[str] = None
    escalated_at: Optional[str] = None
    resolved_at: Optional[str] = None
    notes: Optional[str] = None


class EscalationSummary(BaseModel):
    site_name: str
    viewpoint: str
    zone_code: str
    zone_name: str
    alert_id: int
    current_count: int
    density_per_sqm: float
    threshold: int
    exceeded_by: int
    timestamp: str
    operator_action: str
    operator_notes: str
    recommended_measures: List[str]
    email_dispatch: Optional[Dict[str, Any]] = None


# ----------------------------------------------------------------------------
# 6. Trends Schemas
# ----------------------------------------------------------------------------
class ZoneTrendPoint(BaseModel):
    timestamp: str
    count: int
    density: float


class ZoneTrendSeries(BaseModel):
    zone_code: str
    zone_name: str
    data_points: List[ZoneTrendPoint]


# ----------------------------------------------------------------------------
# 7. Webhook, Stream Mode, System Health & Analytics Schemas
# ----------------------------------------------------------------------------
class WebhookCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    url: str = Field(..., min_length=8, max_length=512)
    target_type: Optional[str] = Field("REST", description="'REST', 'Slack', 'Telegram'")


class WebhookResponse(BaseModel):
    id: int
    name: str
    url: str
    target_type: str
    is_active: bool
    created_at: str


class StreamModeRequest(BaseModel):
    mode: str = Field(..., pattern="^(raw|raw_bbox|annotated|heatmap|blended)$")


class SystemHealthResponse(BaseModel):
    fps: float
    inference_latency_ms: float
    cpu_percent: float
    memory_percent: float
    active_connections: int
    status: str
    active_model: str


class AnalyticsTrendsResponse(BaseModel):
    window: str
    hourly_averages: Dict[str, float]
    peak_count: int
    total_alerts: int
    series: List[ZoneTrendSeries]


class HistoricalTelemetryPoint(BaseModel):
    timestamp: str
    pax_count: int
    active_model_used: str
    alert_triggered: bool
    moving_avg: Optional[float] = None


class HistoricalAnalyticsResponse(BaseModel):
    camera_id: str
    time_range: str
    average_crowd_size: float
    peak_limits_hit: int
    alert_frequencies: int
    active_model_distribution: Dict[str, float]
    data_points: List[HistoricalTelemetryPoint]


