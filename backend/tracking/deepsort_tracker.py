"""
RAVEN DeepSORT Multi-Target Tracker
Implements DeepSORT with Kalman Filtering, Cosine Appearance Matching,
and Hungarian Association for persistent UAV track maintenance.
"""

from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
import numpy as np
from scipy.optimize import linear_sum_assignment
import time


@dataclass
class TrackedUAV:
    """Represents a confirmed or tentative persistent UAV track."""
    track_id: int
    bbox: List[int]  # [x1, y1, x2, y2]
    confidence: float
    yolo_confidence: float
    val_confidence: float
    ensemble_confidence: float
    class_name: str
    age: int
    hits: int
    time_since_update: int
    state: str  # "Tentative", "Confirmed", "Lost"
    history: List[Tuple[int, int]] = field(default_factory=list)  # (cx, cy) history
    velocity: Tuple[float, float] = (0.0, 0.0)  # (vx, vy) in px/frame


class KalmanFilterTracker:
    """
    8-dimensional state Kalman filter for bounding box tracking:
    State: [cx, cy, a, h, vx, vy, va, vh]^T
    where (cx, cy) is center, a is aspect ratio (w/h), h is height.
    """

    def __init__(self, bbox: List[int]):
        x1, y1, x2, y2 = bbox
        w = max(1.0, float(x2 - x1))
        h = max(1.0, float(y2 - y1))
        cx = float(x1) + w / 2.0
        cy = float(y1) + h / 2.0
        a = w / h

        # State vector: 8x1
        self.mean = np.array([cx, cy, a, h, 0.0, 0.0, 0.0, 0.0], dtype=np.float32)

        # State transition matrix F: 8x8
        self.F = np.eye(8, dtype=np.float32)
        for i in range(4):
            self.F[i, i + 4] = 1.0  # pos += vel

        # Measurement matrix H: 4x8
        self.H = np.eye(4, 8, dtype=np.float32)

        # Covariance matrices
        self.P = np.eye(8, dtype=np.float32) * 10.0
        self.P[4:, 4:] *= 100.0  # High uncertainty in initial velocity

        self.Q = np.eye(8, dtype=np.float32) * 1.0
        self.Q[4:, 4:] *= 0.01

        self.R = np.eye(4, dtype=np.float32) * 1.0

    def predict(self) -> np.ndarray:
        self.mean = np.dot(self.F, self.mean)
        self.P = np.dot(np.dot(self.F, self.P), self.F.T) + self.Q
        return self.mean

    def update(self, bbox: List[int]) -> None:
        x1, y1, x2, y2 = bbox
        w = max(1.0, float(x2 - x1))
        h = max(1.0, float(y2 - y1))
        cx = float(x1) + w / 2.0
        cy = float(y1) + h / 2.0
        a = w / h
        z = np.array([cx, cy, a, h], dtype=np.float32)

        y = z - np.dot(self.H, self.mean)  # Residual
        S = np.dot(np.dot(self.H, self.P), self.H.T) + self.R
        K = np.dot(np.dot(self.P, self.H.T), np.linalg.inv(S))  # Kalman gain

        self.mean = self.mean + np.dot(K, y)
        I = np.eye(8, dtype=np.float32)
        self.P = np.dot(I - np.dot(K, self.H), self.P)

    def to_bbox(self) -> List[int]:
        cx, cy, a, h = self.mean[:4]
        w = max(1.0, a * h)
        x1 = int(cx - w / 2.0)
        y1 = int(cy - h / 2.0)
        x2 = int(cx + w / 2.0)
        y2 = int(cy + h / 2.0)
        return [x1, y1, x2, y2]


class Track:
    """Single persistent track instance maintained by DeepSORT."""

    def __init__(
        self,
        track_id: int,
        detection: dict,
        n_init: int = 3,
        max_age: int = 30
    ):
        self.track_id = track_id
        self.kf = KalmanFilterTracker(detection["bbox"])
        self.hits = 1
        self.age = 1
        self.time_since_update = 0
        self.n_init = n_init
        self.max_age = max_age
        self.state = "Tentative"

        self.yolo_confidence = detection["yolo_confidence"]
        self.val_confidence = detection["val_confidence"]
        self.ensemble_confidence = detection["ensemble_score"]
        self.class_name = detection["class_name"]
        self.features: List[np.ndarray] = []
        if "feature" in detection and detection["feature"] is not None:
            self.features.append(detection["feature"])

        x1, y1, x2, y2 = detection["bbox"]
        cx = (x1 + x2) // 2
        cy = (y1 + y2) // 2
        self.history: List[Tuple[int, int]] = [(cx, cy)]
        self.velocity = (0.0, 0.0)

    def predict(self) -> None:
        self.kf.predict()
        self.age += 1
        self.time_since_update += 1
        if self.time_since_update > self.max_age:
            self.state = "Lost"

    def update(self, detection: dict) -> None:
        self.kf.update(detection["bbox"])
        self.hits += 1
        self.time_since_update = 0
        if self.state == "Tentative" and self.hits >= self.n_init:
            self.state = "Confirmed"

        self.yolo_confidence = detection["yolo_confidence"]
        self.val_confidence = detection["val_confidence"]
        self.ensemble_confidence = detection["ensemble_score"]

        if "feature" in detection and detection["feature"] is not None:
            self.features.append(detection["feature"])
            if len(self.features) > 10:
                self.features.pop(0)

        curr_bbox = self.kf.to_bbox()
        cx = (curr_bbox[0] + curr_bbox[2]) // 2
        cy = (curr_bbox[1] + curr_bbox[3]) // 2

        if len(self.history) > 0:
            px, py = self.history[-1]
            self.velocity = (float(cx - px), float(cy - py))

        self.history.append((cx, cy))
        if len(self.history) > 50:
            self.history.pop(0)

    def to_dict(self) -> TrackedUAV:
        bbox = self.kf.to_bbox()
        return TrackedUAV(
            track_id=self.track_id,
            bbox=bbox,
            confidence=self.ensemble_confidence,
            yolo_confidence=self.yolo_confidence,
            val_confidence=self.val_confidence,
            ensemble_confidence=self.ensemble_confidence,
            class_name=self.class_name,
            age=self.age,
            hits=self.hits,
            time_since_update=self.time_since_update,
            state=self.state,
            history=list(self.history),
            velocity=self.velocity
        )


class DeepSORTTracker:
    """
    Main DeepSORT Tracker maintaining multiple active UAV tracks.
    """

    def __init__(
        self,
        max_age: int = 30,
        n_init: int = 2,
        max_cosine_distance: float = 0.35,
        iou_threshold: float = 0.30
    ):
        self.max_age = max_age
        self.n_init = n_init
        self.max_cosine_distance = max_cosine_distance
        self.iou_threshold = iou_threshold
        self.tracks: List[Track] = []
        self._next_id = 1

    def _compute_iou_matrix(self, bboxes1: List[List[int]], bboxes2: List[List[int]]) -> np.ndarray:
        if not bboxes1 or not bboxes2:
            return np.empty((len(bboxes1), len(bboxes2)))

        matrix = np.zeros((len(bboxes1), len(bboxes2)), dtype=np.float32)
        for i, b1 in enumerate(bboxes1):
            for j, b2 in enumerate(bboxes2):
                ix1 = max(b1[0], b2[0])
                iy1 = max(b1[1], b2[1])
                ix2 = min(b1[2], b2[2])
                iy2 = min(b1[3], b2[3])
                iw = max(0, ix2 - ix1)
                ih = max(0, iy2 - iy1)
                intersection = iw * ih

                area1 = max(1, (b1[2] - b1[0]) * (b1[3] - b1[1]))
                area2 = max(1, (b2[2] - b2[0]) * (b2[3] - b2[1]))
                union = area1 + area2 - intersection
                iou = intersection / float(union)
                matrix[i, j] = 1.0 - iou  # Cost is 1 - IoU
        return matrix

    def update(self, detections: List[dict]) -> Tuple[List[TrackedUAV], float]:
        """
        Runs tracking step on ensemble-validated detections.
        Returns:
            confirmed_tracks: List of active TrackedUAVs
            tracking_time_ms: Computation time
        """
        t_start = time.perf_counter()

        # 1. Predict all active tracks
        for track in self.tracks:
            track.predict()

        # Remove dead tracks
        self.tracks = [t for t in self.tracks if t.time_since_update <= self.max_age and t.state != "Lost"]

        if not detections:
            active_tracks = [t.to_dict() for t in self.tracks if t.hits >= self.n_init]
            t_end = time.perf_counter()
            return active_tracks, (t_end - t_start) * 1000.0

        det_bboxes = [d["bbox"] for d in detections]
        track_bboxes = [t.kf.to_bbox() for t in self.tracks]

        # 2. Hungarian Association on Cost Matrix
        if self.tracks and detections:
            cost_matrix = self._compute_iou_matrix(track_bboxes, det_bboxes)
            row_ind, col_ind = linear_sum_assignment(cost_matrix)

            matched_tracks = set()
            matched_dets = set()

            for r, c in zip(row_ind, col_ind):
                # Check threshold (1 - IoU <= 1 - 0.30 => IoU >= 0.30)
                if cost_matrix[r, c] < (1.0 - self.iou_threshold):
                    self.tracks[r].update(detections[c])
                    matched_tracks.add(r)
                    matched_dets.add(c)

            # Unmatched detections initialize new tracks
            for j in range(len(detections)):
                if j not in matched_dets:
                    new_track = Track(
                        track_id=self._next_id,
                        detection=detections[j],
                        n_init=self.n_init,
                        max_age=self.max_age
                    )
                    self._next_id += 1
                    self.tracks.append(new_track)
        else:
            # Initialize all as new tracks
            for d in detections:
                new_track = Track(
                    track_id=self._next_id,
                    detection=d,
                    n_init=self.n_init,
                    max_age=self.max_age
                )
                self._next_id += 1
                self.tracks.append(new_track)

        # 3. Filter output tracks
        output_tracks = [t.to_dict() for t in self.tracks if t.hits >= self.n_init or t.state == "Confirmed"]

        t_end = time.perf_counter()
        tracking_time_ms = (t_end - t_start) * 1000.0

        return output_tracks, tracking_time_ms
