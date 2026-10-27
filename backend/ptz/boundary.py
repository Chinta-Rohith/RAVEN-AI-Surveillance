"""
RAVEN PTZ Boundary Region Detection
Implements the 10% image border margin trigger described in DeTrAck (IEEE Access 2025).
"""

from typing import List, Tuple
from dataclasses import dataclass


@dataclass
class BoundaryStatus:
    in_boundary: bool
    approaching_boundary: bool
    dx: float  # Pixel delta from image center
    dy: float  # Pixel delta from image center
    normalized_dx: float  # Normalized delta [-1.0, 1.0]
    normalized_dy: float  # Normalized delta [-1.0, 1.0]
    boundary_edge: str  # "NONE", "LEFT", "RIGHT", "TOP", "BOTTOM", "CORNER"


class BoundaryDetector:
    """
    Monitors tracked UAV position relative to the 10% frame margins.
    Triggers PTZ pan/tilt recentering commands when the target enters or nears the boundary.
    """

    def __init__(self, boundary_ratio: float = 0.10):
        self.boundary_ratio = boundary_ratio
        self.approach_ratio = boundary_ratio * 1.5  # 15% warning threshold

    def evaluate(self, bbox: List[int], frame_width: int, frame_height: int) -> BoundaryStatus:
        """
        Evaluates bounding box position relative to image center and outer boundary margins.
        """
        x1, y1, x2, y2 = bbox
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0

        center_x = frame_width / 2.0
        center_y = frame_height / 2.0

        dx = cx - center_x
        dy = cy - center_y

        norm_dx = dx / max(1.0, center_x)
        norm_dy = dy / max(1.0, center_y)

        # Boundary limits (10% margins)
        x_min_boundary = frame_width * self.boundary_ratio
        x_max_boundary = frame_width * (1.0 - self.boundary_ratio)
        y_min_boundary = frame_height * self.boundary_ratio
        y_max_boundary = frame_height * (1.0 - self.boundary_ratio)

        in_boundary = (
            cx <= x_min_boundary or
            cx >= x_max_boundary or
            cy <= y_min_boundary or
            cy >= y_max_boundary
        )

        # Approaching boundary limits (15% margins)
        x_min_approach = frame_width * self.approach_ratio
        x_max_approach = frame_width * (1.0 - self.approach_ratio)
        y_min_approach = frame_height * self.approach_ratio
        y_max_approach = frame_height * (1.0 - self.approach_ratio)

        approaching = (
            cx <= x_min_approach or
            cx >= x_max_approach or
            cy <= y_min_approach or
            cy >= y_max_approach
        )

        edge_parts = []
        if cx <= x_min_boundary:
            edge_parts.append("LEFT")
        elif cx >= x_max_boundary:
            edge_parts.append("RIGHT")

        if cy <= y_min_boundary:
            edge_parts.append("TOP")
        elif cy >= y_max_boundary:
            edge_parts.append("BOTTOM")

        boundary_edge = "-".join(edge_parts) if edge_parts else "NONE"

        return BoundaryStatus(
            in_boundary=in_boundary,
            approaching_boundary=approaching,
            dx=round(dx, 2),
            dy=round(dy, 2),
            normalized_dx=round(norm_dx, 4),
            normalized_dy=round(norm_dy, 4),
            boundary_edge=boundary_edge
        )
