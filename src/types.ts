/**
 * Data types and interfaces for Crowd Monitor single-camera zone occupancy system.
 */

export type ModelType = 'YOLO' | 'DM-Count';

export type ZoneStatusCode = 'Normal' | 'Busy' | 'Over Threshold';

export type AlertLifecycleStatus =
  | 'pending'
  | 'active'
  | 'confirmed'
  | 'escalated'
  | 'dismissed'
  | 'resolved';

export type NavigationTab =
  | 'overview'
  | 'zone_studio'
  | 'zones'
  | 'density_trends'
  | 'historical_analytics'
  | 'alerts'
  | 'escalation'
  | 'replay'
  | 'camera_health'
  | 'evaluation'
  | 'methodology'
  | 'settings'
  | 'audit_log';

export type UserRole = 'ADMIN' | 'OPERATOR' | 'ANALYST' | string;

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
}

export interface VideoItem {
  id: number;
  filename: string;
  original_name: string;
  duration_seconds: number;
  fps: number;
  width: number;
  height: number;
  is_active: boolean;
  uploaded_at: string;
  first_frame_url: string;
  zone_count: number;
}

export interface DynamicZoneInput {
  code: string;
  name: string;
  description: string;
  area_sqm: number;
  capacity: number;
  warning_threshold: number;
  critical_threshold: number;
  polygon: [number, number][];
}

export interface ZoneConfig {
  id: number;
  code: string; // 'Z1' | 'Z2' | 'Z3' | 'Z4'
  name: string;
  description: string;
  area_sqm: number;
  capacity: number;
  warning_threshold: number;
  critical_threshold: number;
  polygon: [number, number][]; // [x, y] coordinates mapped to camera canvas
}

export interface ZoneLiveStatus extends ZoneConfig {
  current_count: number;
  density: number; // people/m²
  capacity_percent: number;
  status: ZoneStatusCode;
  active_model: ModelType;
  over_threshold_seconds: number;
  last_updated?: string;
}

export interface AlertRecord {
  id: number;
  zone_id: number;
  zone_code: string;
  zone_name: string;
  status: AlertLifecycleStatus;
  count: number;
  density: number;
  threshold: number;
  triggered_at: string;
  confirmed_at?: string;
  escalated_at?: string;
  resolved_at?: string;
  notes?: string;
}

export interface EscalationSummaryPayload {
  site_name: string;
  viewpoint: string;
  alert_id: number;
  zone_code: string;
  zone_name: string;
  current_count: number;
  density_per_sqm: number;
  critical_threshold: number;
  exceeded_by: number;
  timestamp: string;
  operator_notes: string;
  recommended_measures: string[];
}

export interface TrendPoint {
  timestamp: string;
  count: number;
  density: number;
  baseline_5m?: number;
}

export interface ZoneTrendSeries {
  zone_code: string;
  zone_name: string;
  data_points: TrendPoint[];
}

export interface DetectionBox {
  id: string;
  zone_code: string;
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
}

export interface FiveMinuteBaselineData {
  zone_code: string;
  zone_name: string;
  current_count: number;
  baseline_5m: number;
  delta: number;
  percent_change: number;
  density_current: number;
  density_baseline: number;
  status: 'Surge' | 'Steady' | 'Subsiding';
}

export interface CameraHealthStats {
  camera_id: string;
  source_file: string;
  status: 'OPTIMAL' | 'DEGRADED' | 'DROPPING_FRAMES' | 'OFFLINE';
  current_fps: number;
  target_fps: number;
  frame_age_ms: number;
  dropped_frames: number;
  total_frames_processed: number;
  dropped_percent: number;
  bitrate_mbps: number;
  resolution: string;
  decoder: string;
  uptime_seconds: number;
  last_sync_timestamp: string;
}

export interface EvaluationMetrics {
  timestamp: string;
  evaluation_window: string;
  total_validation_frames: number;
  overall_mae: number;
  overall_mape: number;
  overall_bias: number;
  yolo_benchmark: {
    mae: number;
    mape: number;
    bias: number;
    optimal_range: string;
    avg_inference_ms: number;
  };
  dm_count_benchmark: {
    mae: number;
    mape: number;
    bias: number;
    optimal_range: string;
    avg_inference_ms: number;
  };
  zone_errors: {
    zone_code: string;
    zone_name: string;
    mae: number;
    mape: number;
    bias: number;
    sample_size: number;
  }[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  operator: string;
  role: string;
  action_type: 'CONFIRM' | 'ESCALATE' | 'DISMISS' | 'CONFIG_UPDATE' | 'MODEL_SWITCH' | 'SYSTEM';
  zone_code?: string;
  description: string;
  details: string;
  severity: 'INFO' | 'WARN' | 'ACTION' | 'CRITICAL';
}

export interface SystemHealthData {
  fps: number;
  inference_latency_ms: number;
  cpu_percent: number;
  memory_percent: number;
  active_connections: number;
  status: 'OPERATIONAL' | 'DEGRADED';
  active_model: ModelType;
}

export interface WebhookConfigItem {
  id: number;
  name: string;
  url: string;
  target_type: 'REST' | 'Slack' | 'Telegram';
  is_active: boolean;
  created_at: string;
}

export interface AnalyticsTrendsData {
  window: '1h' | '24h' | '7d';
  hourly_averages: Record<string, number>;
  peak_count: number;
  total_alerts: number;
  series: ZoneTrendSeries[];
}

export type StreamMode = 'raw_bbox' | 'raw' | 'heatmap' | 'blended' | 'annotated';

export interface HistoricalTelemetryPoint {
  timestamp: string;
  pax_count: number;
  active_model_used: string;
  alert_triggered: boolean;
  moving_avg?: number;
}

export interface HistoricalAnalyticsResponse {
  camera_id: string;
  time_range: '1h' | '24h' | '7d';
  average_crowd_size: number;
  peak_limits_hit: number;
  alert_frequencies: number;
  active_model_distribution: {
    YOLO: number;
    'DM-Count': number;
    [key: string]: number;
  };
  data_points: HistoricalTelemetryPoint[];
}


