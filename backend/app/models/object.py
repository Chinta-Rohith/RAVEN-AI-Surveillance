from pydantic import BaseModel, Field
from typing import List, Tuple, Dict, Any, Optional

class BoundingBox(BaseModel):
    x: float  # Center X or top-left X (0 to 1)
    y: float  # Center Y or top-left Y (0 to 1)
    width: float  # Width (0 to 1)
    height: float  # Height (0 to 1)

class TrackedObject(BaseModel):
    id: int
    class_name: str = Field(..., alias="class")
    confidence: float  # 0.0 to 1.0
    boundingBox: BoundingBox
    distance: float  # Estimated distance in meters
    speed: float  # m/s
    direction: str  # e.g., "North-East"
    behavior: str  # Standing, Walking, Running, Loitering, etc.
    zone: str  # Green, Yellow, Red
    threatScore: int  # 0 to 100
    threatLevel: str  # LOW, MEDIUM, HIGH, CRITICAL
    first_seen: str  # Timestamp
    last_seen: str  # Timestamp
    tracking_duration: float  # Seconds
    path_history: List[Tuple[float, float]] = []  # List of (x, y) coordinates
    threat_reasons: List[str] = []  # List of reasons for the current threat score

    class Config:
        populate_by_name = True
