from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple
from app.models.object import TrackedObject, BoundingBox

class ObjectDetector(ABC):
    """Interface for Object Detection (e.g., YOLOv11)"""
    @abstractmethod
    def detect(self, frame_data: Any) -> List[Dict[str, Any]]:
        """
        Detects objects in the given frame.
        Returns a list of dicts with: class_name, confidence, boundingBox (x, y, w, h).
        """
        pass

class ObjectTracker(ABC):
    """Interface for Multi-Object Tracking (e.g., ByteTrack/DeepSORT)"""
    @abstractmethod
    def track(self, detections: List[Dict[str, Any]], frame_id: int) -> List[Dict[str, Any]]:
        """
        Associates detections across frames to maintain stable IDs.
        Returns a list of detections updated with unique object IDs and path history.
        """
        pass

class DepthEstimator(ABC):
    """Interface for Monocular Depth Estimation (e.g., MiDaS/ZoeDepth)"""
    @abstractmethod
    def estimate_depth(self, bounding_box: BoundingBox, frame_depth_map: Any) -> float:
        """
        Estimates the distance of the object from the camera in meters.
        """
        pass

class BehaviorAnalyzer(ABC):
    """Interface for Behavior Analysis (e.g., Video Transformers / Action Recognition)"""
    @abstractmethod
    def analyze_behavior(self, object_history: List[Tuple[float, float]], speed: float, current_zone: str) -> Tuple[str, float]:
        """
        Analyzes the trajectory and state of an object to determine its behavior.
        Returns a tuple: (behavior_label, confidence_score)
        """
        pass

class ThreatAnalyzer(ABC):
    """Interface for Threat Assessment"""
    @abstractmethod
    def assess_threat(self, tracked_object: Dict[str, Any], environmental_factors: Dict[str, Any]) -> Tuple[int, str, List[str]]:
        """
        Calculates threat level based on object behavior, position, and environment.
        Returns (threat_score 0-100, threat_level_label, explainable_reasons)
        """
        pass

class AgentOrchestrator(ABC):
    """Interface for Multi-Agent Orchestration (e.g., LangGraph flow control)"""
    @abstractmethod
    def orchestrate(self, pipeline_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Coordinates the execution and data flow of different agents in the pipeline.
        """
        pass
