// ==========================================
// RAVEN System TypeScript Definitions
// Real-time Agentic Vision for UAV Navigation
// ==========================================

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TrackedUAV {
  track_id: number;
  bbox: [number, number, number, number];
  confidence: number;
  yolo_confidence: number;
  val_confidence: number;
  ensemble_confidence: number;
  class_name: string;
  age: number;
  hits: number;
  state: 'Tentative' | 'Confirmed' | 'Lost';
  velocity: [number, number];
  history: [number, number][];
  distance_m: number;
  situation_state: 'NORMAL' | 'WATCH' | 'ANOMALY';
  is_selected: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  total_latency_ms: number;
  capture_latency_ms: number;
  yolo_latency_ms: number;
  val_cnn_latency_ms: number;
  tracking_latency_ms: number;
}

export interface PTZStatus {
  mode: 'SIMULATION' | 'ONVIF';
  connected: boolean;
  pan_deg: number;
  tilt_deg: number;
  zoom_level: number;
  is_moving: boolean;
  target_id: number | null;
  status_message?: string;
}

export interface PTZCommand {
  action: string;
  reason: string;
  pan_speed: number;
  tilt_speed: number;
}

export interface BoundaryStatus {
  in_boundary: boolean;
  approaching: boolean;
  edge: string;
  dx: number;
  dy: number;
}

export interface SituationAlert {
  level: 'NORMAL' | 'WATCH' | 'ANOMALY';
  message: string;
  track_id: number | null;
}

export interface SituationReport {
  state: 'NORMAL' | 'WATCH' | 'ANOMALY';
  primary_reason: string;
  alerts: SituationAlert[];
}

export interface DigitalTwinObject {
  track_id: number;
  distance_m: number;
  azimuth_deg: number;
  pos_x: number;
  pos_y: number;
  velocity: [number, number];
  situation_state: 'NORMAL' | 'WATCH' | 'ANOMALY';
}

export interface ExplainabilityCard {
  target_id: number | null;
  is_accepted: boolean;
  yolo_confidence: number;
  val_confidence: number;
  ensemble_confidence: number;
  distance_estimate_m: number | null;
  situation_state: string;
  rationale: string;
  yolo_time_ms: number;
  val_time_ms: number;
  gradcam_image_base64?: string;
}

export interface TelemetryPayload {
  frame_number: number;
  timestamp: number;
  performance: PerformanceMetrics;
  source: {
    type: string;
    ir_mode: boolean;
    resolution: [number, number];
  };
  ptz: PTZStatus;
  ptz_command: PTZCommand;
  boundary: BoundaryStatus;
  situation: SituationReport;
  tracks: TrackedUAV[];
  digital_twin: {
    camera_pan: number;
    camera_tilt: number;
    objects: DigitalTwinObject[];
  };
  explainability: ExplainabilityCard[];
  frame_image_base64: string;
}

export interface SystemStatus {
  title: string;
  reference_paper: string;
  pipeline_architecture: string;
  yolo_detector: {
    loaded: boolean;
    model_path: string;
    custom_uav_weights: boolean;
    device: string;
  };
  val_cnn_validator: {
    loaded: boolean;
    status: string;
    model_path: string;
  };
  ensemble: {
    alpha: number;
    formula: string;
    threshold: number;
  };
  tracker: {
    type: string;
    active_tracks: number;
  };
  ptz: PTZStatus;
  source: {
    type: string;
    ir_mode: boolean;
  };
  is_running: boolean;
}

export interface TelemetryEventRecord {
  id: number;
  timestamp: string;
  track_id: number;
  bbox: [number, number, number, number];
  yolo_confidence: number;
  val_confidence: number;
  ensemble_confidence: number;
  distance_m: number | null;
  ptz_pan: number;
  ptz_tilt: number;
  ptz_command: string;
  situation_state: string;
}
