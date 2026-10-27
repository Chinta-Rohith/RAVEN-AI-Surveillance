"""
VaL_CNN Training Pipeline
Trains the 5-layer Validation CNN from scratch or fine-tunes on custom drone ROI patches.
"""

import os
import sys
import yaml
import json
from pathlib import Path
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader

from training.val_cnn.model import VaLCNN
from training.val_cnn.dataset import VaLCNNDataset


def run_training(config_path: str = "training/val_cnn/config.yaml"):
    with open(config_path, "r") as f:
        cfg = yaml.safe_load(f)

    dataset_dir = Path(cfg.get("dataset_dir", "datasets/val_cnn"))
    if not dataset_dir.exists() or not (dataset_dir / "train").exists():
        print(f"[VaL_CNN Training] ERROR: Dataset directory '{dataset_dir}' does not exist.")
        print("Please structure your dataset as:")
        print("  datasets/val_cnn/")
        print("      train/ drone/ background/")
        print("      val/   drone/ background/")
        print("      test/  drone/ background/")
        return

    train_ds = VaLCNNDataset(str(dataset_dir), split="train")
    val_ds = VaLCNNDataset(str(dataset_dir), split="val")

    if len(train_ds) == 0:
        print(f"[VaL_CNN Training] Dataset at '{dataset_dir}/train' contains 0 valid images. Aborting.")
        return

    device = torch.device("cuda" if torch.cuda.is_available() and cfg.get("device") == "cuda" else "cpu")
    print(f"[VaL_CNN Training] Using device: {device}")
    print(f"[VaL_CNN Training] Training samples: {len(train_ds)}, Validation samples: {len(val_ds)}")

    train_loader = DataLoader(train_ds, batch_size=cfg.get("batch_size", 128), shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=cfg.get("batch_size", 128), shuffle=False) if len(val_ds) > 0 else None

    model = VaLCNN(num_classes=cfg.get("num_classes", 2)).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=float(cfg.get("learning_rate", 0.001)))

    best_val_loss = float("inf")
    patience = cfg.get("early_stopping_patience", 5)
    patience_counter = 0
    history = {"train_loss": [], "val_loss": [], "train_acc": [], "val_acc": []}

    epochs = cfg.get("epochs", 50)
    for epoch in range(1, epochs + 1):
        model.train()
        total_loss, correct, total = 0.0, 0, 0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * images.size(0)
            _, preds = outputs.max(1)
            correct += preds.eq(labels).sum().item()
            total += labels.size(0)

        epoch_train_loss = total_loss / max(1, total)
        epoch_train_acc = correct / max(1, total)
        history["train_loss"].append(round(epoch_train_loss, 4))
        history["train_acc"].append(round(epoch_train_acc, 4))

        epoch_val_loss = epoch_train_loss
        epoch_val_acc = epoch_train_acc
        if val_loader:
            model.eval()
            val_total_loss, val_correct, val_total = 0.0, 0, 0
            with torch.no_grad():
                for v_images, v_labels in val_loader:
                    v_images, v_labels = v_images.to(device), v_labels.to(device)
                    v_outputs = model(v_images)
                    v_loss = criterion(v_outputs, v_labels)
                    val_total_loss += v_loss.item() * v_images.size(0)
                    _, v_preds = v_outputs.max(1)
                    val_correct += v_preds.eq(v_labels).sum().item()
                    val_total += v_labels.size(0)

            epoch_val_loss = val_total_loss / max(1, val_total)
            epoch_val_acc = val_correct / max(1, val_total)

        history["val_loss"].append(round(epoch_val_loss, 4))
        history["val_acc"].append(round(epoch_val_acc, 4))

        print(f"Epoch [{epoch:02d}/{epochs}] "
              f"Train Loss: {epoch_train_loss:.4f} Acc: {epoch_train_acc*100:.1f}% | "
              f"Val Loss: {epoch_val_loss:.4f} Acc: {epoch_val_acc*100:.1f}%")

        if epoch_val_loss < best_val_loss:
            best_val_loss = epoch_val_loss
            patience_counter = 0
            out_path = Path(cfg.get("output_model_path", "models/val_cnn.pt"))
            out_path.parent.mkdir(parents=True, exist_ok=True)
            torch.save(model.state_dict(), str(out_path))
            print(f"  -> Saved new best checkpoint to '{out_path}'")
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"[VaL_CNN Training] Early stopping triggered after {epoch} epochs.")
                break

    # Save metrics report
    metrics_path = Path("experiments/val_cnn_metrics.json")
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    with open(metrics_path, "w") as f:
        json.dump(history, f, indent=2)
    print(f"[VaL_CNN Training] Training complete. Metrics saved to '{metrics_path}'.")


if __name__ == "__main__":
    run_training()
