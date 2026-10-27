"""
RAVEN YOLO11 UAV Training Pipeline
Fine-tunes YOLO11s on custom UAV surveillance datasets.
"""

from pathlib import Path
import argparse


def train_yolo(
    data_yaml: str = "training/yolo/dataset.yaml",
    model_name: str = "yolo11s.pt",
    epochs: int = 50,
    imgsz: int = 640,
    batch: int = 16,
    device: str = "cpu"
):
    from ultralytics import YOLO

    yaml_path = Path(data_yaml)
    if not yaml_path.exists():
        print(f"[YOLO Training] Dataset configuration '{data_yaml}' not found.")
        return

    print(f"[YOLO Training] Loading base model '{model_name}'...")
    model = YOLO(model_name)

    print(f"[YOLO Training] Starting training: epochs={epochs}, imgsz={imgsz}, batch={batch}, device={device}")
    results = model.train(
        data=str(yaml_path),
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        device=device,
        project="experiments/yolo_runs",
        name="raven_yolo11s_uav"
    )

    best_weight = Path("experiments/yolo_runs/raven_yolo11s_uav/weights/best.pt")
    if best_weight.exists():
        target_dest = Path("models/yolo11s_uav.pt")
        target_dest.parent.mkdir(parents=True, exist_ok=True)
        import shutil
        shutil.copy(str(best_weight), str(target_dest))
        print(f"[YOLO Training] Copied best weights to '{target_dest}'.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--device", type=str, default="cpu")
    args = parser.parse_args()
    train_yolo(epochs=args.epochs, batch=args.batch, device=args.device)
