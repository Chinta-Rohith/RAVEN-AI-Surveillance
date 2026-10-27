"""
RAVEN Ensemble Scoring Engine
Implements the DeTrAck dual-network ensemble formulation:
S_Ens = alpha * S_YOLO + (1 - alpha) * S_VaL
"""

from typing import List, Optional
from dataclasses import dataclass
import numpy as np

from backend.detection.yolo_detector import CandidateDetection


@dataclass
class ValidatedDetection:
    """Ensemble-validated detection result with full audit trail."""
    bbox: List[int]  # [x1, y1, x2, y2]
    yolo_confidence: float
    val_confidence: float
    ensemble_score: float
    is_accepted: bool
    class_name: str
    class_id: int
    yolo_time_ms: float = 0.0
    val_time_ms: float = 0.0
    rejection_reason: Optional[str] = None
    roi_patch: Optional[np.ndarray] = None


class EnsembleEngine:
    """
    Evaluates candidate detections proposed by YOLO11 and verified by VaL_CNN.
    Default alpha = 0.70 as defined in the DeTrAck paper.
    """

    def __init__(self, alpha: float = 0.70, accept_threshold: float = 0.50):
        self.alpha = float(alpha)
        self.accept_threshold = float(accept_threshold)

    def calculate_score(self, yolo_conf: float, val_conf: float) -> float:
        """
        Computes the weighted ensemble score:
        S_Ens = alpha * S_YOLO + (1 - alpha) * S_VaL
        """
        score = (self.alpha * yolo_conf) + ((1.0 - self.alpha) * val_conf)
        return float(np.clip(score, 0.0, 1.0))

    def evaluate_candidate(
        self,
        candidate: CandidateDetection,
        val_confidence: float,
        val_time_ms: float = 0.0,
        roi_patch: Optional[np.ndarray] = None
    ) -> ValidatedDetection:
        """
        Combines detections, computes ensemble score, and applies decision threshold.
        """
        ensemble_score = self.calculate_score(candidate.confidence, val_confidence)
        is_accepted = ensemble_score >= self.accept_threshold

        rejection_reason = None
        if not is_accepted:
            rejection_reason = (
                f"Candidate rejected: Ensemble score {ensemble_score:.3f} is below "
                f"acceptance threshold {self.accept_threshold:.2f} "
                f"(YOLO: {candidate.confidence:.2f}, VaL_CNN: {val_confidence:.2f})"
            )

        return ValidatedDetection(
            bbox=candidate.bbox,
            yolo_confidence=round(candidate.confidence, 4),
            val_confidence=round(val_confidence, 4),
            ensemble_score=round(ensemble_score, 4),
            is_accepted=is_accepted,
            class_name=candidate.class_name,
            class_id=candidate.class_id,
            yolo_time_ms=candidate.inference_time_ms,
            val_time_ms=val_time_ms,
            rejection_reason=rejection_reason,
            roi_patch=roi_patch
        )
