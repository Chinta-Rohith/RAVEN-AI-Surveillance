"""
VaL_CNN Dataset Loader
Loads binary patch dataset:
    dataset/
        train/
            drone/
            background/
        val/
            drone/
            background/
        test/
            drone/
            background/
"""

from pathlib import Path
from typing import Tuple, List
from PIL import Image
import torch
from torch.utils.data import Dataset
from torchvision import transforms


def get_transforms(is_train: bool = True):
    if is_train:
        return transforms.Compose([
            transforms.Resize((64, 64)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomRotation(degrees=10),
            transforms.ColorJitter(brightness=0.15, contrast=0.15),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    else:
        return transforms.Compose([
            transforms.Resize((64, 64)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])


class VaLCNNDataset(Dataset):
    """Binary patch classification dataset for Drone (1) vs Background (0)."""

    def __init__(self, root_dir: str, split: str = "train"):
        self.root_dir = Path(root_dir) / split
        self.transform = get_transforms(is_train=(split == "train"))
        self.samples: List[Tuple[Path, int]] = []

        # Background class = 0
        bg_dir = self.root_dir / "background"
        if bg_dir.exists():
            for f in bg_dir.glob("*.*"):
                if f.suffix.lower() in [".jpg", ".png", ".jpeg"]:
                    self.samples.append((f, 0))

        # Drone class = 1
        drone_dir = self.root_dir / "drone"
        if drone_dir.exists():
            for f in drone_dir.glob("*.*"):
                if f.suffix.lower() in [".jpg", ".png", ".jpeg"]:
                    self.samples.append((f, 1))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        img_path, label = self.samples[idx]
        image = Image.open(img_path).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image, label
