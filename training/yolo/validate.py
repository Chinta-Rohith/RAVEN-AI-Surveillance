"""
RAVEN YOLO11 UAV Evaluation & Validation
Reports precision, recall, mAP@50, mAP@50-95, inference latency, and FPS.
"""

from pathlib import Path
import json


def validate_yolo(
    model_path: str = "models/yolo11s.pt",
    data_yaml: str = "training/yolo/dataset.yaml",
    imgsz: int = 640
):
    from ultralytics import YOLO

    path = Path(model_path)
    if not path.exists():
        print(f"[YOLO Eval] Model weights '{model_path}' not found on disk. Model not trained yet.")
        return

    yaml_p = Path(data_yaml)
    if not yaml_p.exists():
        print(f"[YOLO Eval] Dataset YAML '{data_yaml}' not found.")
        return

    model = YOLO(str(path))
    metrics = model.val(data=str(yaml_p), imgsz=imgsz, split="test")

    report = {
        "model": model_path,
        "precision": round(float(metrics.box.mp), 4),
        "recall": round(float(metrics.box.mr), 4),
        "mAP50": round(float(metrics.box.map50), 4),
        "mAP50_95": round(float(metrics.box.map), 4),
        "inference_speed_ms": round(float(metrics.speed.get("inference", 0.0)), 2),
        "fps": round(1000.0 / max(0.1, float(metrics.speed.get("inference", 1.0))), 1)
    }

    out_file = Path("experiments/yolo_eval.json")
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w") as f:
        json.dump(report, f, indent=2)

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    validate_yolo()
