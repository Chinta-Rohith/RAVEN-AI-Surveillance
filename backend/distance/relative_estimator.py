"""
RAVEN Relative Distance Estimation Module
Approximates target distance using monocular pinhole camera geometry:
D = (F * W_real) / W_pixel
Clearly identified as an academic approximation, not ground truth.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class DistanceEstimate:
    distance_m: float
    confidence_label: str  # "Estimated Relative Distance (Approximation)"
    assumed_width_m: float
    pixel_width: float
    focal_length_px: float
    is_calibrated: bool


class RelativeDistanceEstimator:
    """
    Computes relative distance to detected UAVs using bounding box geometry.
    """

    def __init__(self, focal_length_px: float = 800.0, assumed_uav_width_m: float = 0.50):
        self.focal_length_px = float(focal_length_px)
        self.assumed_uav_width_m = float(assumed_uav_width_m)
        self.is_calibrated = False

    def estimate(self, bbox: List[int]) -> DistanceEstimate:
        """
        Estimates distance to target from bounding box width.
        bbox: [x1, y1, x2, y2]
        """
        x1, y1, x2, y2 = bbox
        pixel_width = max(1.0, float(x2 - x1))

        # D = (F * W_real) / W_pixel
        distance_m = (self.focal_length_px * self.assumed_uav_width_m) / pixel_width
        distance_m = max(1.0, min(1000.0, distance_m))  # Realistic clamp [1m to 1000m]

        return DistanceEstimate(
            distance_m=round(distance_m, 1),
            confidence_label="Estimated Relative Distance (Approximation)",
            assumed_width_m=self.assumed_uav_width_m,
            pixel_width=round(pixel_width, 1),
            focal_length_px=self.focal_length_px,
            is_calibrated=self.is_calibrated
        )

    def calibrate(self, measured_pixel_width: float, known_distance_m: float) -> float:
        """Calibrates focal length using a known reference target distance."""
        if known_distance_m > 0 and measured_pixel_width > 0:
            self.focal_length_px = (measured_pixel_width * known_distance_m) / self.assumed_uav_width_m
            self.is_calibrated = True
        return self.focal_length_px
