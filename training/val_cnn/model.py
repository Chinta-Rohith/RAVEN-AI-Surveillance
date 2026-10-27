"""
VaL_CNN Model Architecture
5-layer CNN with dropout layers and 64x64 input resolution, as specified in DeTrAck.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class VaLCNN(nn.Module):
    """
    DeTrAck Validation CNN (VaL_CNN)
    5 Convolutional layers, Batch Normalization, 2 Dropout layers, and Linear Classifier.
    """

    def __init__(self, num_classes: int = 2):
        super().__init__()
        # Layer 1
        self.conv1 = nn.Conv2d(3, 32, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(32)

        # Layer 2
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(64)
        self.pool1 = nn.MaxPool2d(2, 2)  # 64x64 -> 32x32

        # Layer 3
        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(128)

        # Layer 4
        self.conv4 = nn.Conv2d(128, 128, kernel_size=3, padding=1)
        self.bn4 = nn.BatchNorm2d(128)
        self.pool2 = nn.MaxPool2d(2, 2)  # 32x32 -> 16x16
        self.dropout1 = nn.Dropout2d(0.25)

        # Layer 5 (5th hidden conv layer)
        self.conv5 = nn.Conv2d(128, 256, kernel_size=3, padding=1)
        self.bn5 = nn.BatchNorm2d(256)
        self.pool3 = nn.MaxPool2d(2, 2)  # 16x16 -> 8x8
        self.dropout2 = nn.Dropout(0.40)

        # Linear Head
        self.fc1 = nn.Linear(256 * 8 * 8, 128)
        self.fc2 = nn.Linear(128, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = F.relu(self.bn1(self.conv1(x)))
        x = self.pool1(F.relu(self.bn2(self.conv2(x))))

        x = F.relu(self.bn3(self.conv3(x)))
        x = self.dropout1(self.pool2(F.relu(self.bn4(self.conv4(x)))))

        x = self.dropout2(self.pool3(F.relu(self.bn5(self.conv5(x)))))
        x = torch.flatten(x, 1)
        x = F.relu(self.fc1(x))
        x = self.fc2(x)
        return x
