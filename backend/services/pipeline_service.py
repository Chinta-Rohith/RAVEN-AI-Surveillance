"""
RAVEN Core Surveillance Pipeline Service
Integrates:
Video Ingestion -> YOLO11s -> VaL_CNN -> Ensemble -> DeepSORT -> PTZ Controller -> Analytics -> XAI
"""

from typing import Dict, Any, List, Optional
import time
import base64
import cv2
import numpy as np

from backend.config import settings
from backend.services.video_source import (
    VideoSource, WebcamSource, VideoFileSource, RTSPSource, SyntheticDemoSource
)
from backend.detection.yolo_detector import YOLODetector, CandidateDetection
from backend.validation.val_cnn import VaLCNNValidator
from backend.validation.ensemble import EnsembleEngine, ValidatedDetection
from backend.tracking.deepsort_tracker import DeepSORTTracker, TrackedUAV
from backend.ptz.boundary import BoundaryDetector, BoundaryStatus
from backend.ptz.ptz_controller import PTZController, PTZCommand
from backend.ptz.simulator import PTZSimulator
from backend.ptz.onvif_client import ONVIFClient
from backend.distance.relative_estimator import RelativeDistanceEstimator
from backend.anomaly.situation_analyzer import SituationAnalyzer, SituationReport
from backend.explainability.explainer import ExplainableAIModule
from backend.database.db import DatabaseManager
from backend.database.telemetry_repo import TelemetryRepository
from backend.utils.image_processing import crop_roi


class SurveillancePipelineService:
    """
    Central orchestration service executing the DeTrAck + RAVEN computer vision loop.
    """

    def __init__(self):
        # 1. Video Source
        self.video_source: VideoSource = SyntheticDemoSource(ir_mode=False)
        self.source_type: str = settings.VIDEO_SOURCE_TYPE

        # 2. Detector & Validator
        self.detector = YOLODetector(
            model_path=settings.YOLO_MODEL_PATH,
            confidence_threshold=settings.YOLO_CONFIDENCE_THRESHOLD,
            iou_threshold=settings.YOLO_IOU_THRESHOLD,
            device=settings.DEVICE
        )
        self.validator = VaLCNNValidator(
            model_path=settings.VAL_CNN_MODEL_PATH,
            confidence_threshold=settings.VAL_CNN_CONFIDENCE_THRESHOLD,
            device=settings.DEVICE
        )

        # 3. Ensemble
        self.ensemble = EnsembleEngine(
            alpha=settings.ENSEMBLE_ALPHA,
            accept_threshold=settings.ENSEMBLE_ACCEPT_THRESHOLD
        )

        # 4. Tracker
        self.tracker = DeepSORTTracker(
            max_age=settings.DEEPSORT_MAX_AGE,
            n_init=settings.DEEPSORT_N_INIT,
            max_cosine_distance=settings.DEEPSORT_MAX_COSINE_DISTANCE
        )

        # 5. PTZ Subsystem
        self.boundary_detector = BoundaryDetector(boundary_ratio=settings.PTZ_BOUNDARY_RATIO)
        self.ptz_controller = PTZController(
            kp_pan=settings.KP_PAN,
            kp_tilt=settings.KP_TILT,
            max_speed=settings.PTZ_MAX_SPEED
        )
        self.ptz_simulator = PTZSimulator()
        self.onvif_client = ONVIFClient(
            host=settings.ONVIF_HOST,
            port=settings.ONVIF_PORT,
            username=settings.ONVIF_USERNAME,
            password=settings.ONVIF_PASSWORD,
            fallback_simulator=self.ptz_simulator
        )

        # 6. Research Modules
        self.distance_estimator = RelativeDistanceEstimator(
            focal_length_px=settings.CAMERA_FOCAL_LENGTH,
            assumed_uav_width_m=settings.ASSUMED_UAV_WIDTH_M
        )
        self.situation_analyzer = SituationAnalyzer()
        self.explainer = ExplainableAIModule(validator=self.validator)

        # 7. Database
        self.db_manager = DatabaseManager(db_path=settings.DATABASE_PATH)
        self.telemetry_repo = TelemetryRepository(self.db_manager)

        # State Telemetry
        self.is_running: bool = True
        self.is_paused: bool = False
        self.auto_track_enabled: bool = True
        self.session_start_time: float = time.time()
        self.total_tracks_observed: set = set()
        self.selected_target_id: Optional[int] = None
        self.last_frame_jpeg_b64: str = ""
        self.last_processed_payload: Dict[str, Any] = {}
        self.frame_number: int = 0
        self.fps_smoothed: float = 0.0
        self.ir_mode: bool = False

    async def initialize(self) -> None:
        """Initializes database tables on application startup."""
        await self.db_manager.init_db()

    def set_video_source(self, source_type: str, path_or_url: Optional[str] = None) -> Dict[str, Any]:
        """Switches the active video source."""
        self.source_type = source_type
        if self.video_source:
            self.video_source.release()

        if source_type == "webcam":
            dev_idx = int(path_or_url) if path_or_url and path_or_url.isdigit() else 0
            self.video_source = WebcamSource(device_index=dev_idx, ir_mode=self.ir_mode)
        elif source_type == "video_file" and path_or_url:
            self.video_source = VideoFileSource(file_path=path_or_url, ir_mode=self.ir_mode)
        elif source_type == "rtsp" and path_or_url:
            self.video_source = RTSPSource(rtsp_url=path_or_url, ir_mode=self.ir_mode)
        else:
            self.source_type = "synthetic"
            self.video_source = SyntheticDemoSource(ir_mode=self.ir_mode)

        return {"status": "SUCCESS", "source_type": self.source_type}

    def set_ir_mode(self, enabled: bool) -> None:
        self.ir_mode = enabled
        if self.video_source:
            self.video_source.set_ir_mode(enabled)

    async def process_frame(self) -> Dict[str, Any]:
        """
        Executes one full iteration of the DeTrAck + RAVEN pipeline:
        Video -> YOLO -> VaL_CNN -> Ensemble -> DeepSORT -> PTZ -> Situation -> XAI
        """
        if not self.is_running or self.is_paused:
            return self.last_processed_payload

        t0 = time.perf_counter()
        ret, frame = self.video_source.read()
        if not ret or frame is None:
            # Revert to synthetic if file ends or stream drops
            if self.source_type != "synthetic":
                self.set_video_source("synthetic")
                ret, frame = self.video_source.read()
            if not ret or frame is None:
                return {}

        self.frame_number += 1
        h, w = frame.shape[:2]
        t_capture = (time.perf_counter() - t0) * 1000.0

        # 1. Primary YOLO11 Detection
        candidates, t_yolo, _ = self.detector.detect(frame)

        # 2. VaL_CNN Validation & 3. Ensemble Scoring
        t_val_start = time.perf_counter()
        validated_detections: List[ValidatedDetection] = []
        accepted_detections_for_tracker: List[dict] = []

        for cand in candidates:
            # Crop ROI patch
            roi = crop_roi(frame, cand.bbox)
            val_conf, val_time, _ = self.validator.validate_patch(roi)

            # Evaluate with Alpha-weighted Ensemble
            val_det = self.ensemble.evaluate_candidate(
                candidate=cand,
                val_confidence=val_conf,
                val_time_ms=val_time,
                roi_patch=roi
            )
            validated_detections.append(val_det)

            if val_det.is_accepted:
                accepted_detections_for_tracker.append({
                    "bbox": val_det.bbox,
                    "yolo_confidence": val_det.yolo_confidence,
                    "val_confidence": val_det.val_confidence,
                    "ensemble_score": val_det.ensemble_score,
                    "class_name": val_det.class_name,
                    "feature": None
                })

        t_val = (time.perf_counter() - t_val_start) * 1000.0

        # 4. DeepSORT Multi-Target Tracking
        tracks, t_track = self.tracker.update(accepted_detections_for_tracker)

        # Select primary target for PTZ control
        primary_track: Optional[TrackedUAV] = None
        if tracks:
            if self.selected_target_id:
                primary_track = next((t for t in tracks if t.track_id == self.selected_target_id), tracks[0])
            else:
                primary_track = tracks[0]
                self.selected_target_id = primary_track.track_id
        else:
            self.selected_target_id = None

        # 5. Boundary Detection & PTZ Control
        boundary_status = BoundaryStatus(
            in_boundary=False, approaching_boundary=False,
            dx=0.0, dy=0.0, normalized_dx=0.0, normalized_dy=0.0, boundary_edge="NONE"
        )
        ptz_command = PTZCommand(
            pan_speed=0.0, tilt_speed=0.0, zoom_speed=0.0,
            action="IDLE", reason="No target tracked.", target_id=None
        )

        if primary_track is not None:
            boundary_status = self.boundary_detector.evaluate(primary_track.bbox, frame_width=w, frame_height=h)
            if self.auto_track_enabled:
                ptz_command = self.ptz_controller.compute_command(boundary_status, target_id=primary_track.track_id)
            else:
                ptz_command = PTZCommand(
                    pan_speed=0.0, tilt_speed=0.0, zoom_speed=0.0,
                    action="MANUAL", reason="Auto-tracking disabled. In manual mode.", target_id=primary_track.track_id
                )

        # Dispatch command to hardware or simulator
        ptz_status = self.onvif_client.send_command(ptz_command)

        # 6. Situation & Anomaly Analysis
        situation_report = self.situation_analyzer.analyze(tracks, frame_width=w, frame_height=h)

        # 7. Distance Estimation & Track List Assembly
        track_list_data = []
        for t in tracks:
            self.total_tracks_observed.add(t.track_id)
            dist_est = self.distance_estimator.estimate(t.bbox)
            track_list_data.append({
                "track_id": t.track_id,
                "bbox": t.bbox,
                "confidence": t.confidence,
                "yolo_confidence": t.yolo_confidence,
                "val_confidence": t.val_confidence,
                "ensemble_confidence": t.ensemble_confidence,
                "class_name": t.class_name,
                "age": t.age,
                "hits": t.hits,
                "state": t.state,
                "velocity": t.velocity,
                "history": t.history,
                "distance_m": dist_est.distance_m,
                "situation_state": situation_report.target_states.get(t.track_id, "NORMAL"),
                "is_selected": (t.track_id == self.selected_target_id)
            })

            # Log periodically or on confirmed state to database
            if self.frame_number % 5 == 0:
                try:
                    await self.telemetry_repo.log_event(
                        track_id=t.track_id,
                        bbox=t.bbox,
                        yolo_conf=t.yolo_confidence,
                        val_conf=t.val_confidence,
                        ensemble_conf=t.ensemble_confidence,
                        distance_m=dist_est.distance_m,
                        ptz_pan=ptz_status.get("pan_deg", 0.0),
                        ptz_tilt=ptz_status.get("tilt_deg", 0.0),
                        ptz_cmd=ptz_command.action,
                        situation=situation_report.target_states.get(t.track_id, "NORMAL")
                    )
                except Exception as log_err:
                    pass

        # 8. Explainability Cards
        xai_explanations = []
        for v_det in validated_detections:
            # Find matching track ID if accepted
            matched_id = None
            if v_det.is_accepted:
                for tr in tracks:
                    # Check bbox overlap
                    bx1, by1, bx2, by2 = v_det.bbox
                    tx1, ty1, tx2, ty2 = tr.bbox
                    if abs(bx1 - tx1) < 20 and abs(by1 - ty1) < 20:
                        matched_id = tr.track_id
                        break

            dist_val = self.distance_estimator.estimate(v_det.bbox).distance_m if v_det.is_accepted else None
            sit_state = situation_report.target_states.get(matched_id, "NORMAL") if matched_id else "NORMAL"

            explanation = self.explainer.explain_detection(
                det=v_det,
                target_id=matched_id,
                situation_state=sit_state,
                distance_m=dist_val
            )
            xai_explanations.append(explanation)

        # 9. Digital Twin Spatial Mapping
        digital_twin_objects = []
        for tr in track_list_data:
            # Convert screen coordinates and estimated distance into 2D polar/radar coordinates
            cx = (tr["bbox"][0] + tr["bbox"][2]) / 2.0
            angle_offset_deg = ((cx - w / 2.0) / (w / 2.0)) * 30.0  # Assumed 60 deg horizontal FOV
            cam_pan = ptz_status.get("pan_deg", 0.0)
            azimuth_deg = cam_pan + angle_offset_deg
            rad = np.radians(azimuth_deg)

            r = tr["distance_m"]
            pos_x = float(r * np.sin(rad))
            pos_y = float(r * np.cos(rad))

            digital_twin_objects.append({
                "track_id": tr["track_id"],
                "distance_m": tr["distance_m"],
                "azimuth_deg": round(azimuth_deg, 1),
                "pos_x": round(pos_x, 1),
                "pos_y": round(pos_y, 1),
                "velocity": tr["velocity"],
                "situation_state": tr["situation_state"]
            })

        # Calculate Total Latency and Smoothed FPS
        t_total = (time.perf_counter() - t0) * 1000.0
        inst_fps = 1000.0 / max(1.0, t_total)
        self.fps_smoothed = 0.9 * self.fps_smoothed + 0.1 * inst_fps if self.fps_smoothed > 0 else inst_fps

        # 10. Encode Annotated Frame for Stream
        annotated_frame = self._draw_overlays(
            frame=frame.copy(),
            validated_detections=validated_detections,
            tracks=track_list_data,
            boundary_status=boundary_status,
            ptz_status=ptz_status
        )

        _, buf = cv2.imencode(".jpg", annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
        self.last_frame_jpeg_b64 = base64.b64encode(buf).decode("utf-8")

        # Compile final real-time telemetry payload
        self.last_processed_payload = {
            "frame_number": self.frame_number,
            "timestamp": time.time(),
            "performance": {
                "fps": round(self.fps_smoothed, 1),
                "total_latency_ms": round(t_total, 1),
                "capture_latency_ms": round(t_capture, 1),
                "yolo_latency_ms": round(t_yolo, 1),
                "val_cnn_latency_ms": round(t_val, 1),
                "tracking_latency_ms": round(t_track, 1)
            },
            "source": {
                "type": self.source_type,
                "ir_mode": self.ir_mode,
                "resolution": [w, h]
            },
            "ptz": ptz_status,
            "ptz_command": {
                "action": ptz_command.action,
                "reason": ptz_command.reason,
                "pan_speed": ptz_command.pan_speed,
                "tilt_speed": ptz_command.tilt_speed
            },
            "boundary": {
                "in_boundary": boundary_status.in_boundary,
                "approaching": boundary_status.approaching_boundary,
                "edge": boundary_status.boundary_edge,
                "dx": boundary_status.dx,
                "dy": boundary_status.dy
            },
            "situation": {
                "state": situation_report.state,
                "primary_reason": situation_report.primary_reason,
                "alerts": situation_report.active_alerts
            },
            "tracks": track_list_data,
            "digital_twin": {
                "camera_pan": ptz_status.get("pan_deg", 0.0),
                "camera_tilt": ptz_status.get("tilt_deg", 0.0),
                "objects": digital_twin_objects
            },
            "explainability": xai_explanations,
            "frame_image_base64": self.last_frame_jpeg_b64
        }

        return self.last_processed_payload

    def _draw_overlays(
        self,
        frame: np.ndarray,
        validated_detections: List[ValidatedDetection],
        tracks: List[dict],
        boundary_status: BoundaryStatus,
        ptz_status: Dict[str, Any]
    ) -> np.ndarray:
        """Draws academic DeTrAck bounding boxes, boundary margins, and PTZ reticles."""
        h, w = frame.shape[:2]

        # Draw 10% PTZ boundary guideline (subtle dashed/thin rectangle)
        margin_x = int(w * settings.PTZ_BOUNDARY_RATIO)
        margin_y = int(h * settings.PTZ_BOUNDARY_RATIO)
        boundary_color = (0, 0, 220) if boundary_status.in_boundary else (
            (0, 180, 255) if boundary_status.approaching_boundary else (80, 80, 80)
        )
        cv2.rectangle(frame, (margin_x, margin_y), (w - margin_x, h - margin_y), boundary_color, 1)
        cv2.putText(frame, "PTZ 10% RECENTER BOUNDARY", (margin_x + 6, margin_y + 16),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, boundary_color, 1)

        # Draw center crosshair
        cx, cy = w // 2, h // 2
        cv2.line(frame, (cx - 15, cy), (cx + 15, cy), (100, 255, 100), 1)
        cv2.line(frame, (cx, cy - 15), (cx, cy + 15), (100, 255, 100), 1)

        # Draw tracked targets
        for tr in tracks:
            x1, y1, x2, y2 = tr["bbox"]
            is_selected = tr.get("is_selected", False)
            sit_state = tr.get("situation_state", "NORMAL")

            box_color = (0, 255, 0)  # Green for normal
            if sit_state == "ANOMALY":
                box_color = (0, 0, 255)  # Red for anomaly
            elif sit_state == "WATCH":
                box_color = (0, 200, 255)  # Orange/Yellow for watch

            thickness = 2 if is_selected else 1
            cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, thickness)

            # Draw trajectory tail
            history = tr.get("history", [])
            for i in range(1, len(history)):
                cv2.line(frame, history[i - 1], history[i], box_color, 1)

            # Label overlay displaying paper's three confidence scores: YOLO, VaL_CNN, ENS
            label_top = f"UAV #{tr['track_id']} [ENS: {tr['ensemble_confidence']:.2f}]"
            label_sub = f"YOLO:{tr['yolo_confidence']:.2f} VaL:{tr['val_confidence']:.2f} D:{tr['distance_m']}m"

            cv2.rectangle(frame, (x1, max(0, y1 - 32)), (x1 + max(len(label_top), len(label_sub)) * 8, y1), (20, 20, 20), -1)
            cv2.putText(frame, label_top, (x1 + 3, max(12, y1 - 18)), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1)
            cv2.putText(frame, label_sub, (x1 + 3, max(24, y1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (180, 220, 255), 1)

        # HUD Overlay in top corner
        fps_str = f"FPS: {self.fps_smoothed:.1f} | PTZ: {ptz_status.get('pan_deg', 0.0):+.1f} deg, {ptz_status.get('tilt_deg', 0.0):+.1f} deg"
        cv2.putText(frame, fps_str, (16, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)

        return frame

    def get_session_summary(self) -> Dict[str, Any]:
        """Provides executive reporting metrics for current surveillance session."""
        duration = time.time() - self.session_start_time
        return {
            "session_start_timestamp": self.session_start_time,
            "duration_seconds": round(duration, 1),
            "frames_processed": self.frame_number,
            "average_fps": round(self.fps_smoothed, 1),
            "source_type": self.source_type,
            "detector": "YOLO11s",
            "detector_device": self.detector.device,
            "detector_loaded": self.detector.is_loaded,
            "validator": "VaL_CNN (64x64 ROI)",
            "validator_loaded": self.validator.weights_loaded,
            "ensemble_alpha": self.ensemble.alpha,
            "ensemble_threshold": self.ensemble.accept_threshold,
            "tracker": "DeepSORT (Kalman + Cosine Re-ID)",
            "total_unique_tracks": len(self.total_tracks_observed),
            "active_tracks_count": len(self.tracker.tracks),
            "ptz_mode": self.onvif_client.simulator.mode,
            "ir_mode": self.ir_mode,
            "is_running": self.is_running,
            "is_paused": self.is_paused,
            "auto_track_enabled": self.auto_track_enabled,
            "status": "PAUSED" if self.is_paused else ("OPERATIONAL" if self.is_running else "STOPPED")
        }

    def get_camera_diagnostics(self) -> Dict[str, Any]:
        """Provides detailed hardware and simulation diagnostics for camera and PTZ."""
        w, h = (1280, 720)
        if hasattr(self.video_source, "resolution"):
            w, h = self.video_source.resolution
        return {
            "source_type": self.source_type,
            "resolution": f"{w}x{h}",
            "fps": round(self.fps_smoothed, 1),
            "stream_health": "OPTIMAL" if self.is_running and not self.is_paused else "PAUSED",
            "ptz_mode": self.onvif_client.simulator.mode,
            "onvif_configured": bool(settings.ONVIF_HOST),
            "onvif_host": settings.ONVIF_HOST or "Not configured (Simulation Active)",
            "boundary_ratio": self.boundary_detector.boundary_ratio,
            "pan_deg": round(self.ptz_simulator.pan_deg, 2),
            "tilt_deg": round(self.ptz_simulator.tilt_deg, 2),
            "zoom_level": round(self.ptz_simulator.zoom_level, 1),
            "auto_track_enabled": self.auto_track_enabled,
            "is_simulation": self.onvif_client.simulator.mode == "SIMULATION"
        }

