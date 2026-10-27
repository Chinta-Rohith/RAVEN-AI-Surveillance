"""
Unit tests for DeTrAck Ensemble Scoring formulation.
Tests: S_Ens = alpha * S_YOLO + (1 - alpha) * S_VaL
"""

import pytest
from backend.validation.ensemble import EnsembleEngine
from backend.detection.yolo_detector import CandidateDetection


def test_ensemble_math_calculation():
    alpha = 0.70
    yolo_conf = 0.80
    val_conf = 0.90

    expected_score = (alpha * yolo_conf) + ((1.0 - alpha) * val_conf)  # 0.7*0.8 + 0.3*0.9 = 0.56 + 0.27 = 0.830

    engine = EnsembleEngine(alpha=alpha, accept_threshold=0.50)
    score = engine.calculate_score(yolo_conf=yolo_conf, val_conf=val_conf)

    assert pytest.approx(score, rel=1e-4) == expected_score
    assert pytest.approx(score, rel=1e-4) == 0.830


def test_ensemble_candidate_acceptance_and_rejection():
    engine = EnsembleEngine(alpha=0.70, accept_threshold=0.50)

    # Candidate 1: High YOLO + High VaL -> Accepted
    cand_high = CandidateDetection(bbox=[100, 100, 160, 160], confidence=0.85, class_id=0, class_name="drone")
    res_high = engine.evaluate_candidate(cand_high, val_confidence=0.90)
    assert res_high.is_accepted is True
    assert res_high.ensemble_score >= 0.50
    assert res_high.rejection_reason is None

    # Candidate 2: Low YOLO + Low VaL -> Rejected
    cand_low = CandidateDetection(bbox=[10, 10, 40, 40], confidence=0.25, class_id=0, class_name="bird")
    res_low = engine.evaluate_candidate(cand_low, val_confidence=0.30)
    assert res_low.is_accepted is False
    assert res_low.ensemble_score < 0.50
    assert "Candidate rejected" in res_low.rejection_reason
