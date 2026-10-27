"""
Unit tests for VaL_CNN architecture and ROI tensor preparation.
"""

import numpy as np
import torch
from backend.validation.val_cnn import VaLCNNNet
from backend.utils.image_processing import preprocess_val_roi, crop_roi


def test_val_cnn_architecture_forward():
    # 5-layer CNN expects (batch, 3, 64, 64)
    model = VaLCNNNet(num_classes=2)
    dummy_input = torch.randn(2, 3, 64, 64)
    output = model(dummy_input)

    assert output.shape == (2, 2)


def test_roi_preprocessing():
    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    dummy_frame[100:180, 200:290] = 255  # Fake object

    roi = crop_roi(dummy_frame, [200, 100, 290, 180])
    assert roi is not None

    tensor = preprocess_val_roi(roi, target_size=(64, 64))
    assert tensor is not None
    assert tensor.shape == (1, 3, 64, 64)
    assert tensor.max().item() <= 1.0
    assert tensor.min().item() >= 0.0
