import time
import math
import random
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from app.models.object import TrackedObject, BoundingBox
from app.services.mocks import (
    MockObjectDetector, MockTracker, MockDepthEstimator, MockBehaviorAnalyzer, MockThreatAnalyzer, MockAgentOrchestrator
)

class SimulationEngine:
    def __init__(self):
        # Simulation Settings
        self.is_running = False
        self.speed_multiplier = 1.0
        self.current_tick = 0
        self.active_scenario = "Scenario 1: Normal Surveillance"
        
        # State Data
        self.objects: Dict[int, Dict[str, Any]] = {}
        self.alerts: List[Dict[str, Any]] = []
        self.events: List[Dict[str, Any]] = []
        self.start_time = None
        self.elapsed_time = 0.0  # Simulated seconds
        self.acknowledged_alerts = set()
        
        # Environment settings
        self.night_mode = False
        self.low_visibility = False
        
        # Instantiate Mock Components
        self.detector = MockObjectDetector()
        self.tracker = MockTracker()
        self.depth_estimator = MockDepthEstimator()
        self.behavior_analyzer = MockBehaviorAnalyzer()
        self.threat_analyzer = MockThreatAnalyzer()
        self.orchestrator = MockAgentOrchestrator()
        
        # Path definitions for scenarios
        self.scenarios = {
            "Scenario 1: Normal Surveillance": [
                {
                    "id": 101,
                    "class": "Person",
                    "path": [(0.1, 0.8), (0.3, 0.85), (0.45, 0.9)],
                    "speed_base": 1.4,
                    "spawn_tick": 0,
                    "despawn_tick": 300,
                    "behavior_override": None
                },
                {
                    "id": 102,
                    "class": "Vehicle",
                    "path": [(0.9, 0.1), (0.8, 0.3), (0.7, 0.6)],
                    "speed_base": 8.0,
                    "spawn_tick": 10,
                    "despawn_tick": 200,
                    "behavior_override": None
                }
            ],
            "Scenario 2: Multiple Object Activity": [
                {
                    "id": 201, "class": "Person", "path": [(0.1, 0.2), (0.3, 0.22), (0.5, 0.25)],
                    "speed_base": 1.5, "spawn_tick": 0, "despawn_tick": 300, "behavior_override": None
                },
                {
                    "id": 202, "class": "Person", "path": [(0.8, 0.8), (0.7, 0.65), (0.6, 0.55)],
                    "speed_base": 1.2, "spawn_tick": 5, "despawn_tick": 300, "behavior_override": None
                },
                {
                    "id": 203, "class": "Vehicle", "path": [(0.05, 0.9), (0.4, 0.9), (0.8, 0.9)],
                    "speed_base": 9.5, "spawn_tick": 15, "despawn_tick": 250, "behavior_override": None
                },
                {
                    "id": 204, "class": "Drone", "path": [(0.9, 0.9), (0.7, 0.7), (0.5, 0.8)],
                    "speed_base": 12.0, "spawn_tick": 20, "despawn_tick": 300, "behavior_override": None
                },
                {
                    "id": 205, "class": "Animal", "path": [(0.1, 0.5), (0.2, 0.45), (0.1, 0.35)],
                    "speed_base": 2.0, "spawn_tick": 30, "despawn_tick": 150, "behavior_override": None
                }
            ],
            "Scenario 3: Restricted Zone Event": [
                {
                    "id": 301,
                    "class": "Person",
                    # Starts Green, enters Yellow around tick 35, enters Red around tick 70
                    "path": [(0.1, 0.5), (0.3, 0.5), (0.45, 0.5), (0.5, 0.5)],
                    "speed_base": 1.3,
                    "spawn_tick": 0,
                    "despawn_tick": 400,
                    "behavior_override": {35: "Loitering", 70: "Entering restricted zone"}
                }
            ],
            "Scenario 4: Unusual Movement": [
                {
                    "id": 401,
                    "class": "Person",
                    # Walks, then starts running at tick 30
                    "path": [(0.1, 0.9), (0.3, 0.7), (0.6, 0.4), (0.7, 0.3)],
                    "speed_base": 1.5,
                    "spawn_tick": 0,
                    "despawn_tick": 400,
                    "behavior_override": {30: "Running"}
                },
                {
                    "id": 402,
                    "class": "Drone",
                    # Hovers/Loiters in one spot (Yellow zone boundary)
                    "path": [(0.8, 0.2), (0.6, 0.3), (0.61, 0.31), (0.6, 0.3)],
                    "speed_base": 6.0,
                    "spawn_tick": 10,
                    "despawn_tick": 400,
                    "behavior_override": {40: "Loitering"}
                }
            ],
            "Scenario 5: Multiple Anomalies": [
                {
                    "id": 501,
                    "class": "Person",
                    "path": [(0.1, 0.5), (0.35, 0.5), (0.5, 0.5), (0.7, 0.5), (0.9, 0.5)],
                    "speed_base": 1.8,
                    "spawn_tick": 0,
                    "despawn_tick": 400,
                    "behavior_override": {40: "Entering restricted zone", 60: "Leaving object", 80: "Running"}
                },
                {
                    "id": 502,
                    "class": "Drone",
                    "path": [(0.9, 0.9), (0.7, 0.7), (0.5, 0.5), (0.5, 0.5)],
                    "speed_base": 10.0,
                    "spawn_tick": 15,
                    "despawn_tick": 400,
                    "behavior_override": {50: "Loitering"}
                }
            ]
        }

    def start(self):
        if not self.is_running:
            self.is_running = True
            if self.start_time is None:
                self.start_time = datetime.now()
            self.add_event("Simulation started", "Medium", "SYSTEM")

    def pause(self):
        if self.is_running:
            self.is_running = False
            self.add_event("Simulation paused", "Medium", "SYSTEM")

    def stop(self):
        self.is_running = False
        self.add_event("Simulation stopped", "Medium", "SYSTEM")

    def reset(self):
        self.is_running = False
        self.current_tick = 0
        self.elapsed_time = 0.0
        self.start_time = None
        self.objects.clear()
        self.alerts.clear()
        self.events.clear()
        self.acknowledged_alerts.clear()
        self.add_event("Simulation reset", "Medium", "SYSTEM")

    def set_scenario(self, scenario_name: str):
        if scenario_name in self.scenarios:
            self.reset()
            self.active_scenario = scenario_name
            self.add_event(f"Switched scenario to: {scenario_name}", "Medium", "SYSTEM")

    def set_speed(self, speed: float):
        self.speed_multiplier = speed
        self.add_event(f"Simulation speed set to {speed}x", "Low", "SYSTEM")

    def add_event(self, description: str, severity: str, source: str, object_id: Optional[int] = None):
        timestamp = datetime.now().strftime("%H:%M:%S")
        event = {
            "timestamp": timestamp,
            "description": description,
            "severity": severity,
            "source": source,
            "object_id": object_id
        }
        self.events.append(event)
        # Keep events capped to last 100
        if len(self.events) > 100:
            self.events.pop(0)

    def trigger_alert(self, object_id: int, class_name: str, event_desc: str, severity: str, confidence: float, reason: str):
        alert_id = f"ALT-{object_id}-{self.current_tick}"
        # Prevent duplicate alerts for the same category in quick succession
        recent_alerts = [a for a in self.alerts[-10:] if a["object_id"] == object_id and a["event"] == event_desc]
        if recent_alerts:
            return

        timestamp = datetime.now().strftime("%H:%M:%S")
        alert = {
            "id": alert_id,
            "timestamp": timestamp,
            "object_id": object_id,
            "class": class_name,
            "event": event_desc,
            "severity": severity,
            "confidence": int(confidence * 100),
            "reason": reason,
            "acknowledged": False
        }
        self.alerts.append(alert)
        self.add_event(f"ALERT [{severity}]: {event_desc} for Object #{object_id}", severity, "AI_PIPELINE", object_id)

    def acknowledge_alert(self, alert_id: str):
        for alert in self.alerts:
            if alert["id"] == alert_id:
                alert["acknowledged"] = True
                self.acknowledged_alerts.add(alert_id)
                self.add_event(f"Alert {alert_id} acknowledged", "Low", "USER")
                break

    def get_zone(self, x: float, y: float) -> str:
        # Coordinates are 0 to 1
        # Red zone: center rect [0.4, 0.4] to [0.6, 0.6]
        # Yellow zone: buffer [0.25, 0.25] to [0.75, 0.75]
        if 0.4 <= x <= 0.6 and 0.4 <= y <= 0.6:
            return "Red"
        elif 0.25 <= x <= 0.75 and 0.25 <= y <= 0.75:
            return "Yellow"
        else:
            return "Green"

    def interpolate_position(self, path: List[Tuple[float, float]], progress: float) -> Tuple[float, float]:
        if not path:
            return (0.5, 0.5)
        if len(path) == 1:
            return path[0]
        
        # Map progress (0.0 to 1.0) to index
        segments = len(path) - 1
        scaled_progress = progress * segments
        idx = int(scaled_progress)
        if idx >= segments:
            return path[-1]
            
        t = scaled_progress - idx
        p1 = path[idx]
        p2 = path[idx + 1]
        
        x = p1[0] + (p2[0] - p1[0]) * t
        y = p1[1] + (p2[1] - p1[1]) * t
        return (x, y)

    def step(self):
        """Advances the simulation by one tick."""
        if not self.is_running:
            return

        self.current_tick += 1
        # 1 tick = 0.5 seconds simulated at 1x speed
        time_step = 0.5 * self.speed_multiplier
        self.elapsed_time += time_step

        active_config = self.scenarios[self.active_scenario]
        current_detections = []

        # 1. Spawning and moving objects
        for obj_cfg in active_config:
            spawn = obj_cfg["spawn_tick"]
            despawn = obj_cfg["despawn_tick"]
            
            # Check if active in this tick
            if spawn <= self.current_tick < despawn:
                obj_id = obj_cfg["id"]
                path = obj_cfg["path"]
                
                # Compute total duration of movement
                total_duration = despawn - spawn
                progress = (self.current_tick - spawn) / total_duration
                # Bound progress
                progress = min(1.0, max(0.0, progress))
                
                # Get position
                pos_x, pos_y = self.interpolate_position(path, progress)
                
                # Calculate speed and behavior modifiers
                speed = obj_cfg["speed_base"]
                behavior = "Walking"
                
                # Check for behavior overrides at specific ticks
                override = obj_cfg["behavior_override"]
                if override:
                    sorted_override_ticks = sorted(override.keys())
                    for ot in sorted_override_ticks:
                        if self.current_tick >= ot:
                            behavior = override[ot]
                            if behavior == "Running":
                                speed = obj_cfg["speed_base"] * 2.5
                            elif behavior == "Loitering":
                                speed = obj_cfg["speed_base"] * 0.1
                                # Add micro jitter for loitering visual
                                pos_x += random.uniform(-0.005, 0.005)
                                pos_y += random.uniform(-0.005, 0.005)
                            elif behavior == "Leaving object":
                                # Spawns a secondary static bag object at this spot
                                if 500 + obj_id not in self.objects:
                                    self.spawn_abandoned_bag(500 + obj_id, pos_x, pos_y)
                
                # Bounding box sizing based on category
                if obj_cfg["class"] == "Person":
                    w, h = 0.04, 0.1
                elif obj_cfg["class"] == "Vehicle" or obj_cfg["class"] == "Tank-like vehicle":
                    w, h = 0.08, 0.07
                elif obj_cfg["class"] == "Drone":
                    w, h = 0.05, 0.05
                else:
                    w, h = 0.04, 0.04
                    
                # Setup raw detection dict
                detection = {
                    "id": obj_id,
                    "class": obj_cfg["class"],
                    "confidence": round(random.uniform(0.88, 0.98), 2),
                    "boundingBox": {
                        "x": pos_x - w/2,
                        "y": pos_y - h/2,
                        "width": w,
                        "height": h
                    },
                    "speed": round(speed, 1),
                    "direction": self.get_direction(path, progress),
                    "behavior": behavior
                }
                current_detections.append(detection)

        # Handle secondary static spawned objects (e.g. left bags)
        static_ids = [k for k in self.objects.keys() if k >= 500]
        for sid in static_ids:
            # Static bags stay in place
            bag_obj = self.objects[sid]
            current_detections.append({
                "id": sid,
                "class": "Bag",
                "confidence": 0.99,
                "boundingBox": bag_obj["boundingBox"],
                "speed": 0.0,
                "direction": "Static",
                "behavior": "Abandoned"
            })

        # 2. RUN AI PIPELINE
        # A. Detect (Mock YOLOv11)
        detections = self.detector.detect({"detections": current_detections})
        
        # B. Track (Mock ByteTrack)
        tracked_detections = self.tracker.track(detections, self.current_tick)
        
        # Process and enrich each tracked detection
        active_ids = set()
        for det in tracked_detections:
            obj_id = det["id"]
            active_ids.add(obj_id)
            
            bbox = BoundingBox(**det["boundingBox"])
            
            # C. Distance estimation (Mock MiDaS)
            distance = self.depth_estimator.estimate_depth(bbox, None)
            
            # Find zone
            center_x = bbox.x + bbox.width / 2
            center_y = bbox.y + bbox.height / 2
            zone = self.get_zone(center_x, center_y)
            
            # D. Behavior analysis (Mock Video Transformer)
            behavior, behavior_conf = self.behavior_analyzer.analyze_behavior(
                det.get("path_history", []), det["speed"], zone
            )
            # If behavior override is explicitly active from script, preserve it
            if det["behavior"] in ["Running", "Loitering", "Leaving object", "Abandoned"]:
                behavior = det["behavior"]
                
            # E. Threat Assessment (Mock rule-based explainable scorer)
            env_factors = {"night_mode": self.night_mode, "low_visibility": self.low_visibility}
            threat_score, threat_level, threat_reasons = self.threat_analyzer.assess_threat(
                {
                    "class": det["class"],
                    "zone": zone,
                    "behavior": behavior,
                    "speed": det["speed"]
                },
                env_factors
            )
            
            # Trigger Alert rules based on thresholds or status transitions
            prev_obj = self.objects.get(obj_id)
            
            # Trigger zone change alerts
            if prev_obj and prev_obj.get("zone") != zone:
                if zone == "Red":
                    self.trigger_alert(obj_id, det["class"], "Restricted-zone entry (RED)", "CRITICAL", 0.98, "Contact crossed inner RED high-priority security boundary.")
                elif zone == "Yellow":
                    self.trigger_alert(obj_id, det["class"], "Observation zone entry (YELLOW)", "HIGH", 0.92, "Contact crossed outer YELLOW security envelope.")
            elif not prev_obj and zone in ["Yellow", "Red"]:
                # Spawned directly in restricted zone
                self.trigger_alert(obj_id, det["class"], f"Spawned in restricted zone ({zone})", "HIGH", 0.90, f"Contact acquired directly within {zone} envelope.")

            # Trigger behavior alerts
            if prev_obj and prev_obj.get("behavior") != behavior:
                if behavior == "Running":
                    self.trigger_alert(obj_id, det["class"], "Unusual movement: Running", "HIGH", 0.95, "Contact speed surged indicating running behavior.")
                elif behavior == "Loitering":
                    self.trigger_alert(obj_id, det["class"], "Loitering detected", "MEDIUM", 0.91, "Contact remained stationary in sensitive observation envelope.")
                elif behavior == "Leaving object":
                    self.trigger_alert(obj_id, det["class"], "Abandoned item drop", "CRITICAL", 0.99, "Contact detached and left behind a secondary item signature.")

            # Record state
            first_seen = prev_obj["first_seen"] if prev_obj else datetime.now().strftime("%H:%M:%S")
            duration = prev_obj["tracking_duration"] + time_step if prev_obj else 0.0

            self.objects[obj_id] = {
                "id": obj_id,
                "class": det["class"],
                "confidence": det["confidence"],
                "boundingBox": det["boundingBox"],
                "distance": distance,
                "speed": det["speed"],
                "direction": det["direction"],
                "behavior": behavior,
                "zone": zone,
                "threatScore": threat_score,
                "threatLevel": threat_level,
                "first_seen": first_seen,
                "last_seen": datetime.now().strftime("%H:%M:%S"),
                "tracking_duration": round(duration, 1),
                "path_history": det.get("path_history", []),
                "threat_reasons": threat_reasons
            }

        # Clear out items that despawned
        despawned_ids = set(self.objects.keys()) - active_ids
        for did in despawned_ids:
            # Before deleting, record event
            self.add_event(f"Object #{did} contact lost", "Low", "AI_PIPELINE", did)
            del self.objects[did]

    def spawn_abandoned_bag(self, bag_id: int, x: float, y: float):
        w, h = 0.03, 0.03
        self.objects[bag_id] = {
            "id": bag_id,
            "class": "Bag",
            "confidence": 0.99,
            "boundingBox": {"x": x - w/2, "y": y - h/2, "width": w, "height": h},
            "distance": 15.0,
            "speed": 0.0,
            "direction": "Static",
            "behavior": "Abandoned",
            "zone": self.get_zone(x, y),
            "threatScore": 65,
            "threatLevel": "HIGH",
            "first_seen": datetime.now().strftime("%H:%M:%S"),
            "last_seen": datetime.now().strftime("%H:%M:%S"),
            "tracking_duration": 0.0,
            "path_history": [(x, y)],
            "threat_reasons": ["Suspicious item drop/abandoned object (+35)", "Restricted zone entry (RED ZONE) (+40)"]
        }
        self.trigger_alert(bag_id, "Bag", "Object abandoned", "CRITICAL", 0.99, "Static contact left behind by registered operator.")

    def get_direction(self, path: List[Tuple[float, float]], progress: float) -> str:
        if len(path) < 2 or progress <= 0:
            return "Unknown"
        # Figure out current heading
        segments = len(path) - 1
        idx = min(segments - 1, int(progress * segments))
        p1 = path[idx]
        p2 = path[idx + 1]
        
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]  # positive Y is down in image coordinates
        
        angle = math.atan2(-dy, dx) * 180 / math.pi  # -dy so positive is UP screen
        # Map angle to compass points
        if -22.5 <= angle < 22.5: return "East"
        elif 22.5 <= angle < 67.5: return "North-East"
        elif 67.5 <= angle < 112.5: return "North"
        elif 112.5 <= angle < 157.5: return "North-West"
        elif angle >= 157.5 or angle < -157.5: return "West"
        elif -157.5 <= angle < -112.5: return "South-West"
        elif -112.5 <= angle < -67.5: return "South"
        else: return "South-East"

    def get_analytics(self) -> Dict[str, Any]:
        """Compiles standard analytical values based on history."""
        # Standard mock lists for visual analytics charts
        # 1. Threat score over time
        # 2. Objects detected over time
        # 3. Object-class distribution
        # 4. Behavior distribution
        # 5. Event frequency
        time_points = [f"T-{i*10}s" for i in range(10, -1, -1)]
        
        # Calculate active track distribution from current state or historical mock
        class_dist = {"Person": 0, "Vehicle": 0, "Drone": 0, "Tank-like vehicle": 0, "Bag": 0, "Animal": 0}
        for obj in self.objects.values():
            cls = obj["class"]
            if cls in class_dist:
                class_dist[cls] += 1

        behavior_dist = {"Standing": 0, "Walking": 0, "Running": 0, "Loitering": 0, "Abandoned": 0}
        for obj in self.objects.values():
            beh = obj["behavior"]
            if beh in behavior_dist:
                behavior_dist[beh] += 1
            else:
                behavior_dist["Walking"] += 1

        # Build some realistic mock histories that trend with the current scenario
        base_threat_trend = []
        objects_trend = []
        
        # Scenario specific baseline values
        if "Scenario 5" in self.active_scenario:
            base_threat_trend = [20, 25, 30, 45, 60, 75, 80, 85, 95, 98, 100]
            objects_trend = [1, 1, 2, 2, 3, 3, 4, 3, 3, 3, 3]
        elif "Scenario 3" in self.active_scenario:
            base_threat_trend = [10, 10, 15, 20, 35, 55, 60, 75, 80, 80, 80]
            objects_trend = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        elif "Scenario 4" in self.active_scenario:
            base_threat_trend = [15, 15, 20, 45, 55, 65, 70, 75, 75, 75, 75]
            objects_trend = [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
        else:
            base_threat_trend = [10, 12, 15, 15, 18, 20, 18, 15, 16, 20, 22]
            objects_trend = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]

        # Add current actual values at the end of the history
        current_max_threat = max([obj["threatScore"] for obj in self.objects.values()] + [10])
        base_threat_trend[-1] = current_max_threat
        objects_trend[-1] = len(self.objects)

        return {
            "time_labels": time_points,
            "threat_score_history": base_threat_trend,
            "objects_detected_history": objects_trend,
            "class_distribution": [{"name": k, "value": v} for k, v in class_dist.items()],
            "behavior_distribution": [{"name": k, "value": v} for k, v in behavior_dist.items()],
            "event_frequency": {
                "Low": sum(1 for e in self.events if e["severity"] == "Low"),
                "Medium": sum(1 for e in self.events if e["severity"] == "Medium"),
                "High": sum(1 for e in self.events if e["severity"] == "High"),
                "Critical": sum(1 for e in self.events if e["severity"] == "Critical")
            }
        }

    def get_summary(self) -> Dict[str, Any]:
        """Compiles mission summary details."""
        total_alerts = len(self.alerts)
        critical_alerts = sum(1 for a in self.alerts if a["severity"] == "CRITICAL")
        high_alerts = sum(1 for a in self.alerts if a["severity"] == "HIGH")
        avg_threat = round(sum([obj["threatScore"] for obj in self.objects.values()]) / max(1, len(self.objects)), 1)
        
        # Collect distinct key triggers
        triggers = set()
        for a in self.alerts:
            triggers.add(a["event"])
        if not triggers:
            triggers.add("Routine surveillance sweep")

        duration_min = int(self.elapsed_time // 60)
        duration_sec = int(self.elapsed_time % 60)
        
        return {
            "duration": f"{duration_min} min {duration_sec} sec",
            "objects_observed": len(self.objects) + len(self.events) // 3,  # Mock total count
            "tracked_objects": len(self.objects),
            "unusual_events": total_alerts,
            "high_priority_events": high_alerts + critical_alerts,
            "average_threat_score": avg_threat,
            "key_events": list(triggers),
            "system_status": "Active" if self.is_running else "Paused/Completed"
        }
