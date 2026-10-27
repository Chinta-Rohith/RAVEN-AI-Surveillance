"""
Unit tests for Rule-Based Situation and Anomaly Analysis.
"""

from backend.anomaly.situation_analyzer import SituationAnalyzer
from backend.tracking.deepsort_tracker import TrackedUAV


def test_situation_analysis_rules():
    analyzer = SituationAnalyzer(
        rapid_velocity_threshold=20.0,
        restricted_zone=[0.40, 0.40, 0.60, 0.60]  # Center box
    )
    frame_w, frame_h = 1000, 1000

    # 1. Target inside restricted zone -> ANOMALY
    uav_restricted = TrackedUAV(
        track_id=1,
        bbox=[490, 490, 510, 510],  # Center (500, 500)
        confidence=0.88,
        yolo_confidence=0.85,
        val_confidence=0.90,
        ensemble_confidence=0.87,
        class_name="uav",
        age=10,
        hits=10,
        time_since_update=0,
        state="Confirmed",
        velocity=(2.0, 1.0)
    )
    report = analyzer.analyze([uav_restricted], frame_w, frame_h)
    assert report.state == "ANOMALY"
    assert "restricted" in report.primary_reason.lower()

    # 2. Target in safe zone with high speed -> WATCH
    uav_fast = TrackedUAV(
        track_id=2,
        bbox=[150, 150, 190, 190],
        confidence=0.90,
        yolo_confidence=0.90,
        val_confidence=0.90,
        ensemble_confidence=0.90,
        class_name="uav",
        age=10,
        hits=10,
        time_since_update=0,
        state="Confirmed",
        velocity=(25.0, 0.0)  # Exceeds 20.0
    )
    report_fast = analyzer.analyze([uav_fast], frame_w, frame_h)
    assert report_fast.state == "WATCH"
    assert "rapid" in report_fast.primary_reason.lower()
