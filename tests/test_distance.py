"""
Unit tests for Relative Distance Estimation.
"""

import pytest
from backend.distance.relative_estimator import RelativeDistanceEstimator


def test_relative_distance_geometry():
    focal_length = 800.0  # px
    assumed_width = 0.50  # meters
    estimator = RelativeDistanceEstimator(focal_length_px=focal_length, assumed_uav_width_m=assumed_width)

    # If pixel width is 100 px:
    # D = (800 * 0.50) / 100 = 4.0 meters
    bbox = [100, 100, 200, 180]  # width = 200 - 100 = 100 px
    est = estimator.estimate(bbox)

    assert pytest.approx(est.distance_m, rel=1e-2) == 4.0
    assert "Estimated Relative Distance" in est.confidence_label
    assert est.pixel_width == 100.0


def test_distance_calibration():
    estimator = RelativeDistanceEstimator(focal_length_px=500.0, assumed_uav_width_m=0.50)
    # Calibrate: measured width 100px at known distance 10.0m => F = (100 * 10) / 0.5 = 2000 px
    new_f = estimator.calibrate(measured_pixel_width=100.0, known_distance_m=10.0)
    assert pytest.approx(new_f, rel=1e-2) == 2000.0
    assert estimator.is_calibrated is True
