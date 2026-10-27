"""
VaL_CNN Evaluation & Validation Script
Computes Precision, Recall, F1-score, and Confusion Matrix on test split.
"""

import json
from pathlib import Path
import torch
from torch.utils.data import DataLoader

from training.val_cnn.model import VaLCNN
from training.val_cnn.dataset import VaLCNNDataset


def evaluate(model_path: str = "models/val_cnn.pt", dataset_dir: str = "datasets/val_cnn"):
    model_p = Path(model_path)
    if not model_p.exists():
        print(f"[VaL_CNN Eval] Model weights not found at '{model_path}'. Model not trained yet.")
        return

    test_ds = VaLCNNDataset(dataset_dir, split="test")
    if len(test_ds) == 0:
        print(f"[VaL_CNN Eval] No test dataset found at '{dataset_dir}/test'.")
        return

    loader = DataLoader(test_ds, batch_size=64, shuffle=False)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model = VaLCNN(num_classes=2).to(device)
    model.load_state_dict(torch.load(str(model_p), map_location=device))
    model.eval()

    tp, fp, tn, fn = 0, 0, 0, 0
    with torch.no_grad():
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            _, preds = outputs.max(1)

            for p, l in zip(preds.cpu().numpy(), labels.cpu().numpy()):
                if p == 1 and l == 1:
                    tp += 1
                elif p == 1 and l == 0:
                    fp += 1
                elif p == 0 and l == 0:
                    tn += 1
                elif p == 0 and l == 1:
                    fn += 1

    total = tp + fp + tn + fn
    accuracy = (tp + tn) / max(1, total)
    precision = tp / max(1, (tp + fp))
    recall = tp / max(1, (tp + fn))
    f1 = (2 * precision * recall) / max(1e-6, (precision + recall))

    report = {
        "model": model_path,
        "total_test_samples": total,
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "confusion_matrix": {
            "true_positive": tp,
            "false_positive": fp,
            "true_negative": tn,
            "false_negative": fn
        }
    }

    out_file = Path("experiments/val_cnn_eval.json")
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w") as f:
        json.dump(report, f, indent=2)

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    evaluate()
