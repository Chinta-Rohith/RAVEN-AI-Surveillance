"""
Unit tests for PTZ 10% boundary trigger and proportional control law.
"""

import pytest
from backend.ptz.boundary import BoundaryDetector
from backend.ptz.ptz_controller import PTZController


def test_ptz_10_percent_boundary_trigger():
    w, h = 1000, 1000
    detector = BoundaryDetector(boundary_ratio=0.10)

    # 1. Target dead center (cx=500, cy=500) -> Safe
    center_bbox = [480, 480, 520, 520]
    status_center = detector.evaluate(center_bbox, w, h)
    assert status_center.in_boundary is False
    assert status_center.boundary_edge == "NONE"
    assert status_center.dx == 0.0
    assert status_center.dy == 0.0

    # 2. Target at left boundary (cx=50 < 1000 * 0.10 = 100) -> Boundary trigger
    left_bbox = [30, 480, 70, 520]
    status_left = detector.evaluate(left_bbox, w, h)
    assert status_left.in_boundary is True
    assert "LEFT" in status_left.boundary_edge

    # 3. Target at right boundary (cx=950 > 1000 * 0.90 = 900) -> Boundary trigger
    right_bbox = [930, 480, 970, 520]
    status_right = detector.evaluate(right_bbox, w, h)
    assert status_right.in_boundary is True
    assert "RIGHT" in status_right.boundary_edge


def test_ptz_control_calculation():
    controller = PTZController(kp_pan=0.40, kp_tilt=0.40, max_speed=0.80)
    detector = BoundaryDetector(boundary_ratio=0.10)
    w, h = 1000, 1000

    # Target displaced to right edge (cx=950) -> Pan command must be positive (pan right)
    bbox_right = [930, 480, 970, 520]
    b_status = detector.evaluate(bbox_right, w, h)
    cmd = controller.compute_command(b_status, target_id=1)

    assert cmd.pan_speed > 0.0
    assert "RIGHT" in cmd.action

    # Target displaced to top edge (cy=50) -> Tilt command must be positive (tilt up)
    bbox_top = [480, 30, 520, 70]
    b_status_top = detector.evaluate(bbox_top, w, h)
    cmd_top = controller.compute_command(b_status_top, target_id=1)

    assert cmd_top.tilt_speed > 0.0
    assert "UP" in cmd_top.action
