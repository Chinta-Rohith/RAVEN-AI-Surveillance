"""
RAVEN PTZ Virtual Simulator
Simulates physical PTZ camera kinematics, pan/tilt angles, and response dynamics.
"""

from typing import Dict, Any, Optional
import time
import numpy as np

from backend.ptz.ptz_controller import PTZCommand


class PTZSimulator:
    """
    Simulates a high-precision surveillance PTZ camera mount.
    Maintains physical pan [-180, +180 deg], tilt [-90, +90 deg], and zoom [1x to 30x].
    """

    def __init__(self, max_pan_rate: float = 60.0, max_tilt_rate: float = 40.0):
        self.pan_deg: float = 0.0
        self.tilt_deg: float = 0.0
        self.zoom_level: float = 1.0
        self.max_pan_rate = max_pan_rate    # deg/s at 100% velocity
        self.max_tilt_rate = max_tilt_rate  # deg/s at 100% velocity
        self.is_moving: bool = False
        self.target_id: Optional[int] = None
        self.last_update_time = time.perf_counter()
        self.mode: str = "SIMULATION"

    def update(self, command: Optional[PTZCommand] = None) -> Dict[str, Any]:
        """
        Integrates velocity commands over time to update camera pan and tilt angles.
        """
        now = time.perf_counter()
        dt = max(0.001, min(0.2, now - self.last_update_time))
        self.last_update_time = now

        if command is not None:
            self.target_id = command.target_id
            # Pan speed: [-1.0, 1.0] -> delta degrees
            d_pan = command.pan_speed * self.max_pan_rate * dt
            # Tilt speed: [-1.0, 1.0] -> delta degrees
            d_tilt = command.tilt_speed * self.max_tilt_rate * dt

            self.pan_deg += d_pan
            self.tilt_deg += d_tilt

            # Zoom
            d_zoom = command.zoom_speed * 2.0 * dt
            self.zoom_level = float(np.clip(self.zoom_level + d_zoom, 1.0, 30.0))

            # Clamp angles
            self.pan_deg = float(np.clip(self.pan_deg, -180.0, 180.0))
            self.tilt_deg = float(np.clip(self.tilt_deg, -90.0, 90.0))

            self.is_moving = abs(command.pan_speed) > 0.02 or abs(command.tilt_speed) > 0.02

        return self.get_status()

    def manual_move(self, pan_delta: float, tilt_delta: float, zoom_delta: float = 0.0) -> Dict[str, Any]:
        """Allows direct operator pan/tilt adjustments."""
        self.pan_deg = float(np.clip(self.pan_deg + pan_delta, -180.0, 180.0))
        self.tilt_deg = float(np.clip(self.tilt_deg + tilt_delta, -90.0, 90.0))
        self.zoom_level = float(np.clip(self.zoom_level + zoom_delta, 1.0, 30.0))
        return self.get_status()

    def home(self) -> Dict[str, Any]:
        """Returns camera to home position (0 deg, 0 deg, 1x)."""
        self.pan_deg = 0.0
        self.tilt_deg = 0.0
        self.zoom_level = 1.0
        self.is_moving = False
        return self.get_status()

    def get_status(self) -> Dict[str, Any]:
        return {
            "mode": self.mode,
            "connected": True,
            "pan_deg": round(self.pan_deg, 2),
            "tilt_deg": round(self.tilt_deg, 2),
            "zoom_level": round(self.zoom_level, 1),
            "is_moving": self.is_moving,
            "target_id": self.target_id
        }
