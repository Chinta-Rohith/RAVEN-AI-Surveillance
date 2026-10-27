export interface BoundingBox {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  width: number; // Normalized 0-1
  height: number; // Normalized 0-1
}

export interface TrackedObject {
  id: number;
  class: string; // e.g., 'Person', 'Vehicle', 'Drone'
  confidence: number; // 0-100
  boundingBox: BoundingBox;
  distance: number; // Estimated distance in meters
  speed: number; // m/s
  direction: string; // e.g., 'North-East'
  behavior: string; // e.g., 'Walking', 'Running', 'Loitering'
  zone: 'Green' | 'Yellow' | 'Red';
  threatScore: number; // 0-100
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  firstSeen: string; // Timestamp
  lastSeen: string; // Timestamp
  trackingDuration: number; // Seconds active
  trackingHistory: [number, number][]; // Path coordinates
  eventHistory: string[]; // History of event messages for this object
}

export interface Alert {
  id: string;
  timestamp: string;
  objectId: number;
  class: string;
  event: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  reason: string;
  acknowledged: boolean;
}

export interface SurveillanceEvent {
  id: string;
  timestamp: string;
  type: string; // OBJECT_DETECTED, ZONE_ENTRY, etc.
  objectId?: number;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  message: string;
  metadata?: Record<string, any>;
}

export interface AgentFlow {
  name: string;
  status: 'IDLE' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  input: string;
  output: string;
  lastExecution: string;
  processingTime: number; // Milliseconds
}

export interface Orchestration {
  flow: AgentFlow[];
}

export interface AnalyticsData {
  time_labels: string[];
  threat_score_history: number[];
  objects_detected_history: number[];
  class_distribution: { name: string; value: number }[];
  behavior_distribution: { name: string; value: number }[];
  event_frequency: {
    Low: number;
    Medium: number;
    High: number;
    Critical: number;
  };
}

export interface SessionSummary {
  duration: string;
  objects_observed: number;
  tracked_objects: number;
  unusual_events: number;
  high_priority_events: number;
  average_threat_score: number;
  maximum_threat_score: number;
  key_events: string[];
  system_status: string;
  object_distribution: Record<string, number>;
  behavior_distribution: Record<string, number>;
}

export interface SystemStatus {
  status: 'ONLINE' | 'OFFLINE';
  pipeline: 'READY' | 'STREAM DISCONNECTED' | 'INITIALIZING';
  camera: 'SIMULATED FEED' | 'LOCAL VIDEO' | 'WEBCAM';
  active_scenario: string;
  is_running: boolean;
  speed_multiplier: number;
  night_mode: boolean;
  low_visibility: boolean;
}

export interface SurveillanceState {
  tick: number;
  elapsed_time: number;
  is_running: boolean;
  active_scenario: string;
  speed_multiplier: number;
  night_mode: boolean;
  low_visibility: boolean;
  objects: TrackedObject[];
  alerts: Alert[];
  events: SurveillanceEvent[];
  orchestration: { flow: AgentFlow[] };
  analytics: AnalyticsData;
  summary: SessionSummary;
}
