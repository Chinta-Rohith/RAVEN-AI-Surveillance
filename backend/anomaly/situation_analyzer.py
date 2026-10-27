"""
RAVEN Anomaly and Situation Analysis Engine
Implements rule-based spatial and kinematic evaluation for situational awareness.
Classifies states into: NORMAL, WATCH, or ANOMALY with explicit human-interpretable reasoning.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import numpy as np

from backend.tracking.deepsort_tracker import TrackedUAV


@dataclass
class SituationReport:
    state: str  # "NORMAL", "WATCH", "ANOMALY"
    primary_reason: str
    active_alerts: List[Dict[str, Any]]
    target_states: Dict[int, str]


class SituationAnalyzer:
    """
    Evaluates multi-target trajectories, boundary proximity, approach speeds,
    and configured restricted zones to generate non-kinetic situational alerts.
    """

    def __init__(
        self,
        rapid_velocity_threshold: float = 25.0,  # px/frame
        boundary_loiter_frames: int = 15,
        restricted_zone: Optional[List[float]] = None  # [x_min_norm, y_min_norm, x_max_norm, y_max_norm]
    ):
        self.rapid_velocity_threshold = rapid_velocity_threshold
        self.boundary_loiter_frames = boundary_loiter_frames
        # Default restricted zone in center of frame (e.g., protected airspace)
        self.restricted_zone = restricted_zone or [0.35, 0.35, 0.65, 0.65]
        self.boundary_dwell_counts: Dict[int, int] = {}

    def analyze(
        self,
        tracks: List[TrackedUAV],
        frame_width: int,
        frame_height: int
    ) -> SituationReport:
        alerts: List[Dict[str, Any]] = []
        target_states: Dict[int, str] = {}
        highest_severity = "NORMAL"

        if len(tracks) > 1:
            alerts.append({
                "level": "WATCH",
                "message": f"Multi-target activity: {len(tracks)} active UAVs tracked simultaneously.",
                "track_id": None
            })
            highest_severity = "WATCH"

        for track in tracks:
            t_state = "NORMAL"
            x1, y1, x2, y2 = track.bbox
            cx = (x1 + x2) / 2.0
            cy = (y1 + y2) / 2.0

            norm_cx = cx / max(1.0, frame_width)
            norm_cy = cy / max(1.0, frame_height)

            # 1. Check Restricted Geofence Zone
            rz = self.restricted_zone
            if rz[0] <= norm_cx <= rz[2] and rz[1] <= norm_cy <= rz[3]:
                t_state = "ANOMALY"
                alerts.append({
                    "level": "ANOMALY",
                    "message": f"UAV #{track.track_id} entered configured restricted surveillance zone.",
                    "track_id": track.track_id
                })

            # 2. Check Rapid Velocity / Acceleration
            speed = np.hypot(track.velocity[0], track.velocity[1])
            if speed > self.rapid_velocity_threshold:
                if t_state != "ANOMALY":
                    t_state = "WATCH"
                alerts.append({
                    "level": "WATCH",
                    "message": f"UAV #{track.track_id} exhibiting rapid maneuver ({speed:.1f} px/frame).",
                    "track_id": track.track_id
                })

            # 3. Check Prolonged Boundary Loitering
            is_near_boundary = (
                norm_cx < 0.12 or norm_cx > 0.88 or
                norm_cy < 0.12 or norm_cy > 0.88
            )
            if is_near_boundary:
                dwell = self.boundary_dwell_counts.get(track.track_id, 0) + 1
                self.boundary_dwell_counts[track.track_id] = dwell
                if dwell >= self.boundary_loiter_frames:
                    t_state = "ANOMALY"
                    alerts.append({
                        "level": "ANOMALY",
                        "message": f"UAV #{track.track_id} loitering at frame boundary for >{dwell} frames.",
                        "track_id": track.track_id
                    })
            else:
                self.boundary_dwell_counts[track.track_id] = 0

            # 4. Low Tracking Confidence Warning
            if track.confidence < 0.40 and track.hits > 3:
                alerts.append({
                    "level": "WATCH",
                    "message": f"UAV #{track.track_id} tracking confidence dropped to {track.confidence:.2f}.",
                    "track_id": track.track_id
                })

            target_states[track.track_id] = t_state
            if t_state == "ANOMALY":
                highest_severity = "ANOMALY"
            elif t_state == "WATCH" and highest_severity != "ANOMALY":
                highest_severity = "WATCH"

        # Determine primary summary reason
        if alerts:
            # Pick highest severity alert message
            top_alert = next((a for a in alerts if a["level"] == highest_severity), alerts[0])
            primary_reason = f"{highest_severity}: {top_alert['message']}"
        else:
            primary_reason = "NORMAL: Airspace clear or all UAVs operating in nominal trajectory."

        return SituationReport(
            state=highest_severity,
            primary_reason=primary_reason,
            active_alerts=alerts,
            target_states=target_states
        )
