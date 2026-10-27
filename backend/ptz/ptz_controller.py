"""
RAVEN PTZ Controller
Computes pan/tilt control commands using a proportional control law to re-center targets.
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass
import numpy as np

from backend.ptz.boundary import BoundaryStatus


@dataclass
class PTZCommand:
    """PTZ velocity command sent to camera or simulator."""
    pan_speed: float  # [-1.0 (left), 1.0 (right)]
    tilt_speed: float  # [-1.0 (down), 1.0 (up)]
    zoom_speed: float  # [-1.0 (out), 1.0 (in)]
    action: str  # e.g., "PAN_RIGHT_TILT_UP", "HOLD", "CENTERED"
    reason: str
    target_id: Optional[int] = None


class PTZController:
    """
    Proportional-Derivative PTZ Controller based on the DeTrAck boundary formulation.
    """

    def __init__(
        self,
        kp_pan: float = 0.40,
        kp_tilt: float = 0.40,
        max_speed: float = 0.80,
        deadband: float = 0.05
    ):
        self.kp_pan = kp_pan
        self.kp_tilt = kp_tilt
        self.max_speed = max_speed
        self.deadband = deadband

    def compute_command(
        self,
        boundary_status: BoundaryStatus,
        target_id: Optional[int] = None
    ) -> PTZCommand:
        """
        Calculates PTZ pan and tilt speeds to minimize tracking position error.
        """
        # If target is comfortably centered inside the deadband
        norm_dx = boundary_status.normalized_dx
        norm_dy = boundary_status.normalized_dy

        if abs(norm_dx) < self.deadband and abs(norm_dy) < self.deadband:
            return PTZCommand(
                pan_speed=0.0,
                tilt_speed=0.0,
                zoom_speed=0.0,
                action="HOLD_CENTER",
                reason="Target is centered in camera field of view.",
                target_id=target_id
            )

        # Proportional control
        # Target to the right (norm_dx > 0) requires camera pan to the right (+pan_speed)
        raw_pan = self.kp_pan * norm_dx
        # Target below center (norm_dy > 0) requires camera tilt down (-tilt_speed in standard coordinate convention)
        raw_tilt = -self.kp_tilt * norm_dy

        # Clamp speeds
        pan_speed = float(np.clip(raw_pan, -self.max_speed, self.max_speed))
        tilt_speed = float(np.clip(raw_tilt, -self.max_speed, self.max_speed))

        # Only apply full motion when target enters or nears boundary
        if not boundary_status.approaching_boundary and not boundary_status.in_boundary:
            # Soft dampening when inside safe zone
            pan_speed *= 0.35
            tilt_speed *= 0.35

        actions = []
        if pan_speed > 0.05:
            actions.append("PAN_RIGHT")
        elif pan_speed < -0.05:
            actions.append("PAN_LEFT")

        if tilt_speed > 0.05:
            actions.append("TILT_UP")
        elif tilt_speed < -0.05:
            actions.append("TILT_DOWN")

        action_str = "_".join(actions) if actions else "IDLE"

        reason = (
            f"Target {target_id or 'UAV'} at edge '{boundary_status.boundary_edge}' "
            f"offset (dx={boundary_status.dx}px, dy={boundary_status.dy}px). "
            f"Correcting: Pan={pan_speed:.2f}, Tilt={tilt_speed:.2f}."
        )

        return PTZCommand(
            pan_speed=round(pan_speed, 3),
            tilt_speed=round(tilt_speed, 3),
            zoom_speed=0.0,
            action=action_str,
            reason=reason,
            target_id=target_id
        )
