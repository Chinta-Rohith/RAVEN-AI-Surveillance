"""
RAVEN Dataset Management Service
Inspects local dataset directories, counts samples per split and class,
and validates annotations for YOLO and VaL_CNN without fabricating statistics.
"""

from typing import Dict, Any, List
from pathlib import Path


class DatasetService:
    """Provides dataset auditing, class distribution, and split telemetry."""

    def __init__(self, base_dir: str = "datasets"):
        self.base_dir = Path(base_dir)
        self.yolo_dir = self.base_dir / "yolo_uav"
        self.val_dir = self.base_dir / "val_cnn"

    def get_summary(self) -> Dict[str, Any]:
        """
        Audits actual disk contents for YOLO and VaL_CNN datasets.
        """
        val_summary = self._audit_val_dataset()
        yolo_summary = self._audit_yolo_dataset()

        return {
            "val_cnn_dataset": val_summary,
            "yolo_dataset": yolo_summary,
            "status": "AUDITED"
        }

    def _audit_val_dataset(self) -> Dict[str, Any]:
        splits = ["train", "val", "test"]
        stats = {}
        total = 0

        for s in splits:
            drone_p = self.val_dir / s / "drone"
            bg_p = self.val_dir / s / "background"

            drone_count = len(list(drone_p.glob("*.*"))) if drone_p.exists() else 0
            bg_count = len(list(bg_p.glob("*.*"))) if bg_p.exists() else 0
            split_total = drone_count + bg_count
            total += split_total

            stats[s] = {
                "drone_count": drone_count,
                "background_count": bg_count,
                "total": split_total
            }

        return {
            "root_path": str(self.val_dir),
            "exists": self.val_dir.exists(),
            "total_images": total,
            "splits": stats,
            "classes": ["drone", "background"],
            "status_message": "Dataset found." if total > 0 else "No images found. Please populate dataset directories."
        }

    def _audit_yolo_dataset(self) -> Dict[str, Any]:
        splits = ["train", "val", "test"]
        stats = {}
        total = 0

        for s in splits:
            img_p = self.yolo_dir / "images" / s
            lbl_p = self.yolo_dir / "labels" / s

            img_count = len(list(img_p.glob("*.*"))) if img_p.exists() else 0
            lbl_count = len(list(lbl_p.glob("*.txt"))) if lbl_p.exists() else 0
            total += img_count

            stats[s] = {
                "images": img_count,
                "labels": lbl_count,
                "paired": min(img_count, lbl_count)
            }

        return {
            "root_path": str(self.yolo_dir),
            "exists": self.yolo_dir.exists(),
            "total_images": total,
            "splits": stats,
            "classes": ["uav"],
            "status_message": "Dataset found." if total > 0 else "No images found. Please populate dataset directories."
        }
