import time
import math
from typing import List, Dict, Any, Tuple
from app.services.interfaces import (
    ObjectDetector, ObjectTracker, DepthEstimator, BehaviorAnalyzer, ThreatAnalyzer, AgentOrchestrator
)
from app.models.object import BoundingBox

class MockObjectDetector(ObjectDetector):
    def detect(self, frame_data: Any) -> List[Dict[str, Any]]:
        # This is driven directly by the simulation engine which passes active scenario objects
        return frame_data.get("detections", [])

class MockTracker(ObjectTracker):
    def __init__(self):
        self.tracks: Dict[int, List[Tuple[float, float]]] = {}

    def track(self, detections: List[Dict[str, Any]], frame_id: int) -> List[Dict[str, Any]]:
        tracked_results = []
        for det in detections:
            obj_id = det.get("id")
            bbox = det.get("boundingBox")
            # Calculate center position
            center_x = bbox["x"] + bbox["width"] / 2
            center_y = bbox["y"] + bbox["height"] / 2
            
            if obj_id not in self.tracks:
                self.tracks[obj_id] = []
            
            self.tracks[obj_id].append((center_x, center_y))
            # Keep history to last 50 frames
            if len(self.tracks[obj_id]) > 50:
                self.tracks[obj_id].pop(0)

            tracked_det = det.copy()
            tracked_det["path_history"] = self.tracks[obj_id]
            tracked_results.append(tracked_det)
            
        return tracked_results

class MockDepthEstimator(DepthEstimator):
    def estimate_depth(self, bounding_box: BoundingBox, frame_depth_map: Any) -> float:
        # Distance calculation is simulated using bounding box height and y position.
        # As objects move lower on screen (closer to camera) or box gets larger, they are closer.
        # A simple model: distance = 50.0 * (1.0 - bounding_box.height)
        # We clamp it to a realistic surveillance camera distance range: 5m to 120m.
        base_dist = 60.0 * (1.1 - bounding_box.height)
        # Add slight perspective effect from vertical position
        perspective_mod = 10.0 * (1.0 - bounding_box.y)
        dist = max(3.0, min(150.0, base_dist + perspective_mod))
        return round(dist, 1)

class MockBehaviorAnalyzer(BehaviorAnalyzer):
    def analyze_behavior(self, object_history: List[Tuple[float, float]], speed: float, current_zone: str) -> Tuple[str, float]:
        # Analyze movements
        if len(object_history) < 2:
            return "Standing", 0.90

        # Calculate variance in position to detect loitering
        xs = [p[0] for p in object_history[-10:]]
        ys = [p[1] for p in object_history[-10:]]
        variance = (max(xs) - min(xs))**2 + (max(ys) - min(ys))**2

        # Behavior logic
        if speed > 4.5:
            return "Running", 0.95
        elif speed > 1.2:
            return "Walking", 0.98
        elif variance < 0.001 and len(object_history) >= 15:
            # Object is in same area for a while
            if current_zone in ["Yellow", "Red"]:
                return "Loitering", 0.92
            else:
                return "Standing", 0.90
        else:
            return "Walking", 0.85

class MockThreatAnalyzer(ThreatAnalyzer):
    def assess_threat(self, tracked_object: Dict[str, Any], environmental_factors: Dict[str, Any]) -> Tuple[int, str, List[str]]:
        score = 10  # Base level
        reasons = ["Base operational presence"]
        
        class_name = tracked_object.get("class")
        zone = tracked_object.get("zone", "Green")
        behavior = tracked_object.get("behavior", "Walking")
        speed = tracked_object.get("speed", 0.0)

        # 1. Zone Monitoring rules
        if zone == "Red":
            score += 40
            reasons.append("Restricted zone entry (RED ZONE) (+40)")
        elif zone == "Yellow":
            score += 20
            reasons.append("Observation zone entry (YELLOW ZONE) (+20)")

        # 2. Behavior rules
        if behavior == "Running":
            score += 15
            reasons.append("Rapid movement/Running behavior detected (+15)")
        elif behavior == "Loitering":
            score += 20
            reasons.append("Loitering in monitored area (+20)")
        elif behavior == "Leaving object":
            score += 35
            reasons.append("Suspicious item drop/abandoned object (+35)")
        elif behavior == "Rapid movement":
            score += 25
            reasons.append("Highly anomalous acceleration (+25)")
        elif behavior == "Group movement":
            score += 15
            reasons.append("Coordinated group maneuvering (+15)")

        # 3. Object specific weights
        if class_name == "Drone":
            score += 15
            reasons.append("Airborne contact (Drone) surveillance classification (+15)")
        elif class_name == "Tank-like vehicle":
            score += 20
            reasons.append("Heavy armor/vehicle signature (+20)")

        # 4. Environmental modifiers
        is_night = environmental_factors.get("night_mode", False)
        low_visibility = environmental_factors.get("low_visibility", False)
        if is_night or low_visibility:
            score += 10
            reasons.append("Low visibility environmental offset (+10)")

        # Clamp score between 0 and 100
        score = min(100, max(0, score))

        # Assign category
        if score <= 30:
            level = "LOW"
        elif score <= 60:
            level = "MEDIUM"
        elif score <= 80:
            level = "HIGH"
        else:
            level = "CRITICAL"

        return score, level, reasons

class MockAgentOrchestrator(AgentOrchestrator):
    def orchestrate(self, pipeline_data: Dict[str, Any]) -> Dict[str, Any]:
        # Return status and log step details showing execution flow
        return {
            "flow": [
                {"agent": "Detection Agent", "status": "ACTIVE", "log": "YOLOv11: Scanned frame coordinates, found contacts."},
                {"agent": "Tracking Agent", "status": "ACTIVE", "log": "ByteTrack: Maintained existing track association IDs."},
                {"agent": "Distance Agent", "status": "ACTIVE", "log": "MiDaS: Depth map interpolation completed."},
                {"agent": "Behavior Agent", "status": "ACTIVE", "log": "ActionNet: Trajectory velocities analyzed."},
                {"agent": "Threat Agent", "status": "ACTIVE", "log": "RuleEngine: Evaluated safety boundaries & zones."},
                {"agent": "Summary Agent", "status": "ACTIVE", "log": "SessionLogger: Compiled logs for active tracks."}
            ]
        }
