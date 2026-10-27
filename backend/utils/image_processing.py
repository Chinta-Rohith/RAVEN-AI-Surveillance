"""
Image Processing Utilities for RAVEN
Implements ROI extraction, resizing, and normalization for VaL_CNN validation.
"""

from typing import List, Optional, Tuple
import cv2
import numpy as np
import torch


def crop_roi(frame: np.ndarray, bbox: List[int], padding_ratio: float = 0.05) -> Optional[np.ndarray]:
    """
    Crops candidate region of interest from the frame with optional border margin.
    bbox: [x1, y1, x2, y2]
    """
    if frame is None or len(bbox) != 4:
        return None

    h, w = frame.shape[:2]
    x1, y1, x2, y2 = bbox

    # Apply padding around target
    bw = x2 - x1
    bh = y2 - y1
    pad_x = int(bw * padding_ratio)
    pad_y = int(bh * padding_ratio)

    cx1 = max(0, x1 - pad_x)
    cy1 = max(0, y1 - pad_y)
    cx2 = min(w, x2 + pad_x)
    cy2 = min(h, y2 + pad_y)

    if cx2 <= cx1 or cy2 <= cy1:
        return None

    roi = frame[cy1:cy2, cx1:cx2]
    return roi


def preprocess_val_roi(
    roi: np.ndarray,
    target_size: Tuple[int, int] = (64, 64),
    device: str = "cpu"
) -> Optional[torch.Tensor]:
    """
    Resizes ROI to 64x64 pixels, normalizes, and transforms to PyTorch tensor.
    Shape: (1, 3, 64, 64)
    """
    if roi is None or roi.size == 0:
        return None

    # Resize to 64x64
    resized = cv2.resize(roi, target_size, interpolation=cv2.INTER_AREA)

    # Convert BGR to RGB
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)

    # Convert to float32 [0, 1]
    normalized = rgb.astype(np.float32) / 255.0

    # HWC to CHW
    chw = np.transpose(normalized, (2, 0, 1))

    # Convert to PyTorch Tensor and add batch dimension
    tensor = torch.from_numpy(chw).unsqueeze(0).to(device)
    return tensor
