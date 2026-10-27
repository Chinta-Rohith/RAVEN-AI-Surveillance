"""
RAVEN Video Source Abstraction Layer
Supports Webcam, Video File (MP4/AVI), RTSP Camera Streams, and Synthetic Demo.
"""

from abc import ABC, abstractmethod
from typing import Optional, Tuple
import cv2
import numpy as np
import time
import math


class VideoSource(ABC):
    """Abstract base class for all RAVEN video ingestion feeds."""

    def __init__(self, ir_mode: bool = False):
        self.ir_mode = ir_mode
        self.frame_count = 0
        self.fps = 30.0

    @abstractmethod
    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        """Reads the next frame. Returns (success, frame_bgr)."""
        pass

    @abstractmethod
    def release(self) -> None:
        """Releases underlying device or file handle."""
        pass

    def set_ir_mode(self, enabled: bool) -> None:
        """Toggles simulated thermal/IR colormap view."""
        self.ir_mode = enabled

    def _apply_ir_filter(self, frame: np.ndarray) -> np.ndarray:
        """Converts RGB frame into simulated thermal infrared (White-Hot)."""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # Apply CLAHE for enhanced thermal contrast
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        # Apply OpenCV thermal-like colormap (e.g. INFERNO or custom white-hot)
        thermal = cv2.applyColorMap(enhanced, cv2.COLORMAP_INFERNO)
        return thermal


class WebcamSource(VideoSource):
    """Captures live feed from USB webcam."""

    def __init__(self, device_index: int = 0, ir_mode: bool = False):
        super().__init__(ir_mode=ir_mode)
        self.device_index = device_index
        self.cap = cv2.VideoCapture(device_index)
        if self.cap.isOpened():
            self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0

    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        if not self.cap or not self.cap.isOpened():
            return False, None
        ret, frame = self.cap.read()
        if not ret or frame is None:
            return False, None
        self.frame_count += 1
        if self.ir_mode:
            frame = self._apply_ir_filter(frame)
        return True, frame

    def release(self) -> None:
        if self.cap and self.cap.isOpened():
            self.cap.release()


class VideoFileSource(VideoSource):
    """Streams frames from an uploaded or local video file (MP4, AVI, MKV)."""

    def __init__(self, file_path: str, loop: bool = True, ir_mode: bool = False):
        super().__init__(ir_mode=ir_mode)
        self.file_path = file_path
        self.loop = loop
        self.cap = cv2.VideoCapture(file_path)
        if self.cap.isOpened():
            self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0

    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        if not self.cap or not self.cap.isOpened():
            return False, None
        ret, frame = self.cap.read()
        if not ret:
            if self.loop:
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = self.cap.read()
            else:
                return False, None
        if not ret or frame is None:
            return False, None
        self.frame_count += 1
        if self.ir_mode:
            frame = self._apply_ir_filter(frame)
        return True, frame

    def release(self) -> None:
        if self.cap and self.cap.isOpened():
            self.cap.release()


class RTSPSource(VideoSource):
    """Connects to live RTSP surveillance or ONVIF camera stream."""

    def __init__(self, rtsp_url: str, ir_mode: bool = False):
        super().__init__(ir_mode=ir_mode)
        self.rtsp_url = rtsp_url
        self.cap = cv2.VideoCapture(rtsp_url)
        if self.cap.isOpened():
            self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 25.0

    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        if not self.cap or not self.cap.isOpened():
            # Attempt reconnect if stream drop occurred
            self.cap = cv2.VideoCapture(self.rtsp_url)
            if not self.cap.isOpened():
                return False, None
        ret, frame = self.cap.read()
        if not ret or frame is None:
            return False, None
        self.frame_count += 1
        if self.ir_mode:
            frame = self._apply_ir_filter(frame)
        return True, frame

    def release(self) -> None:
        if self.cap and self.cap.isOpened():
            self.cap.release()


class SyntheticDemoSource(VideoSource):
    """
    High-fidelity procedural video generator for academic demonstration.
    Renders realistic surveillance scenery with sky gradients, horizons,
    clouds, ground textures, and 1-2 autonomous UAVs executing flight paths
    (nominal flight, loitering, and boundary approaches).
    Guarantees reliable demonstration without requiring external media files.
    """

    def __init__(self, width: int = 1280, height: int = 720, fps: float = 30.0, ir_mode: bool = False):
        super().__init__(ir_mode=ir_mode)
        self.width = width
        self.height = height
        self.fps = fps
        self.t = 0.0

        # Drone 1 trajectory state
        self.uav1_x = 350.0
        self.uav1_y = 220.0
        self.uav1_vx = 2.4
        self.uav1_vy = 1.2
        self.uav1_size = 52

        # Drone 2 trajectory state (occasional secondary target)
        self.uav2_x = 900.0
        self.uav2_y = 160.0
        self.uav2_vx = -1.8
        self.uav2_vy = 0.8
        self.uav2_size = 38

    def read(self) -> Tuple[bool, Optional[np.ndarray]]:
        self.frame_count += 1
        self.t += 1.0 / self.fps

        # 1. Background Sky gradient (surveillance daytime sky)
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        horizon_y = int(self.height * 0.72)

        # Sky gradient: Deep blue to light haze
        for y in range(horizon_y):
            ratio = y / horizon_y
            b = int(220 - 40 * ratio)
            g = int(185 - 20 * ratio)
            r = int(140 + 20 * ratio)
            frame[y, :] = (b, g, r)

        # Ground / Terrain: Distant hills & earth
        for y in range(horizon_y, self.height):
            ratio = (y - horizon_y) / (self.height - horizon_y)
            b = int(45 + 20 * ratio)
            g = int(80 + 30 * ratio)
            r = int(60 + 25 * ratio)
            frame[y, :] = (b, g, r)

        # 2. Draw distant terrain mountains
        pts_mountain = np.array([
            [0, horizon_y],
            [180, horizon_y - 65],
            [380, horizon_y - 25],
            [620, horizon_y - 90],
            [890, horizon_y - 45],
            [1100, horizon_y - 75],
            [self.width, horizon_y - 30],
            [self.width, horizon_y],
            [0, horizon_y]
        ], np.int32)
        cv2.fillPoly(frame, [pts_mountain], (90, 110, 95))

        # 3. Clouds
        cloud_x1 = int((self.frame_count * 0.4 + 100) % (self.width + 200)) - 100
        cv2.circle(frame, (cloud_x1, 140), 45, (240, 240, 245), -1)
        cv2.circle(frame, (cloud_x1 + 40, 130), 55, (240, 240, 245), -1)
        cv2.circle(frame, (cloud_x1 + 80, 145), 40, (240, 240, 245), -1)

        # 4. Update UAV 1 motion (smooth orbital path with boundary approach)
        self.uav1_x += self.uav1_vx + 0.4 * math.sin(self.t * 0.6)
        self.uav1_y += self.uav1_vy + 0.5 * math.cos(self.t * 0.8)

        # Boundary bounce with margin
        margin = 70
        if self.uav1_x < margin or self.uav1_x > self.width - margin:
            self.uav1_vx *= -1.0
        if self.uav1_y < margin or self.uav1_y > horizon_y - 80:
            self.uav1_vy *= -1.0

        # Draw UAV 1 (realistic quadcopter morphology)
        self._draw_uav(frame, int(self.uav1_x), int(self.uav1_y), self.uav1_size, angle=math.sin(self.t * 2.0) * 0.15)

        # Update UAV 2 motion (smaller, distant UAV)
        self.uav2_x += self.uav2_vx
        self.uav2_y += self.uav2_vy * 0.6
        if self.uav2_x < margin or self.uav2_x > self.width - margin:
            self.uav2_vx *= -1.0
        if self.uav2_y < margin or self.uav2_y > horizon_y - 120:
            self.uav2_vy *= -1.0

        self._draw_uav(frame, int(self.uav2_x), int(self.uav2_y), self.uav2_size, angle=-0.1)

        # Apply IR filter if enabled
        if self.ir_mode:
            frame = self._apply_ir_filter(frame)

        return True, frame

    def _draw_uav(self, img: np.ndarray, cx: int, cy: int, size: int, angle: float = 0.0) -> None:
        """Renders quadcopter fuselage, rotor arms, motors, and spinning propellers."""
        arm_len = size // 2
        body_radius = max(4, size // 7)

        # Dark composite carbon color
        color_body = (35, 35, 38)
        color_motor = (55, 55, 60)
        color_prop = (120, 120, 125)

        # Central fuselage pod
        cv2.circle(img, (cx, cy), body_radius, color_body, -1)

        # 4 diagonal rotor arms (X-frame configuration)
        angles = [math.pi / 4, 3 * math.pi / 4, 5 * math.pi / 4, 7 * math.pi / 4]
        for a in angles:
            rot_a = a + angle
            mx = int(cx + arm_len * math.cos(rot_a))
            my = int(cy + arm_len * math.sin(rot_a) * 0.7)  # Perspective squish

            # Carbon arm
            cv2.line(img, (cx, cy), (mx, my), color_body, max(2, size // 16))
            # Motor bell
            cv2.circle(img, (mx, my), max(3, size // 10), color_motor, -1)
            # Spinning rotor blur (ellipse)
            prop_r = max(6, size // 4)
            cv2.ellipse(img, (mx, my), (prop_r, max(2, prop_r // 3)), int(math.degrees(angle)), 0, 360, color_prop, 1)

    def release(self) -> None:
        pass
