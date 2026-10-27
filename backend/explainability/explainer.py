"""
RAVEN Explainable AI (XAI) Module
Provides interpretable explanations for candidate admissions, ensemble weighting,
and Grad-CAM visual heatmaps.
"""

from typing import Dict, Any, Optional, List
import cv2
import numpy as np

from backend.validation.ensemble import ValidatedDetection
from backend.validation.val_cnn import VaLCNNValidator


class ExplainableAIModule:
    """
    Generates human-understandable audit justifications and feature activation heatmaps.
    """

    def __init__(self, validator: Optional[VaLCNNValidator] = None):
        self.validator = validator

    def explain_detection(
        self,
        det: ValidatedDetection,
        target_id: Optional[int] = None,
        situation_state: str = "NORMAL",
        distance_m: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Builds a comprehensive explanation card for a specific detection.
        """
        if det.is_accepted:
            rationale = (
                f"Detection ACCEPTED: YOLO confidence ({det.yolo_confidence:.2f}) and VaL_CNN "
                f"validation probability ({det.val_confidence:.2f}) combined with weighting "
                f"yielded an ensemble score of {det.ensemble_score:.3f}, satisfying the acceptance criteria."
            )
        else:
            rationale = (
                det.rejection_reason or
                f"Candidate REJECTED: Ensemble confidence {det.ensemble_score:.3f} did not meet threshold."
            )

        # Generate Grad-CAM visualization if ROI patch is available
        gradcam_b64: Optional[str] = None
        if det.roi_patch is not None and self.validator is not None:
            try:
                cam_img = self.validator.generate_gradcam(det.roi_patch)
                if cam_img is not None:
                    # Encode to base64 JPEG for direct frontend display
                    import base64
                    _, buf = cv2.imencode(".jpg", cam_img)
                    gradcam_b64 = base64.b64encode(buf).decode("utf-8")
            except Exception as e:
                print(f"[XAI] Grad-CAM generation skipped: {e}")

        return {
            "target_id": target_id,
            "is_accepted": det.is_accepted,
            "yolo_confidence": det.yolo_confidence,
            "val_confidence": det.val_confidence,
            "ensemble_confidence": det.ensemble_score,
            "distance_estimate_m": distance_m,
            "situation_state": situation_state,
            "rationale": rationale,
            "yolo_time_ms": round(det.yolo_time_ms, 2),
            "val_time_ms": round(det.val_time_ms, 2),
            "gradcam_image_base64": gradcam_b64
        }
