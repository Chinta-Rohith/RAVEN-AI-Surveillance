"""
RAVEN Telemetry Repository
Provides asynchronous queries and CSV export for surveillance telemetry logs.
"""

from typing import List, Dict, Any, Optional
import io
import csv
import json
from datetime import datetime
import aiosqlite

from backend.database.db import DatabaseManager


class TelemetryRepository:
    """Repository handling read/write operations on telemetry logs."""

    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager

    async def log_event(
        self,
        track_id: int,
        bbox: List[int],
        yolo_conf: float,
        val_conf: float,
        ensemble_conf: float,
        distance_m: Optional[float],
        ptz_pan: float,
        ptz_tilt: float,
        ptz_cmd: str,
        situation: str
    ) -> None:
        """Logs a single tracking event into SQLite."""
        now_iso = datetime.utcnow().isoformat() + "Z"
        bbox_str = json.dumps(bbox)

        query = """
        INSERT INTO telemetry_events (
            timestamp, track_id, bbox, yolo_confidence, val_confidence,
            ensemble_confidence, distance_m, ptz_pan, ptz_tilt, ptz_command, situation_state
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        async with aiosqlite.connect(self.db_manager.db_path) as db:
            await db.execute(
                query,
                (
                    now_iso, track_id, bbox_str, round(yolo_conf, 4), round(val_conf, 4),
                    round(ensemble_conf, 4), distance_m, round(ptz_pan, 2), round(ptz_tilt, 2),
                    ptz_cmd, situation
                )
            )
            await db.commit()

    async def get_recent_events(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieves recent telemetry entries for UI display."""
        query = """
        SELECT id, timestamp, track_id, bbox, yolo_confidence, val_confidence,
               ensemble_confidence, distance_m, ptz_pan, ptz_tilt, ptz_command, situation_state
        FROM telemetry_events
        ORDER BY id DESC
        LIMIT ?
        """
        async with aiosqlite.connect(self.db_manager.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(query, (limit,)) as cursor:
                rows = await cursor.fetchall()
                results = []
                for row in rows:
                    results.append({
                        "id": row["id"],
                        "timestamp": row["timestamp"],
                        "track_id": row["track_id"],
                        "bbox": json.loads(row["bbox"]),
                        "yolo_confidence": row["yolo_confidence"],
                        "val_confidence": row["val_confidence"],
                        "ensemble_confidence": row["ensemble_confidence"],
                        "distance_m": row["distance_m"],
                        "ptz_pan": row["ptz_pan"],
                        "ptz_tilt": row["ptz_tilt"],
                        "ptz_command": row["ptz_command"],
                        "situation_state": row["situation_state"]
                    })
                return results

    async def export_csv(self) -> str:
        """Exports all telemetry entries to RFC-4180 compliant CSV string."""
        events = await self.get_recent_events(limit=5000)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "ID", "Timestamp", "Track_ID", "BBox", "YOLO_Confidence",
            "VaL_Confidence", "Ensemble_Confidence", "Distance_M",
            "PTZ_Pan", "PTZ_Tilt", "PTZ_Command", "Situation_State"
        ])
        for e in events:
            writer.writerow([
                e["id"], e["timestamp"], e["track_id"], str(e["bbox"]),
                e["yolo_confidence"], e["val_confidence"], e["ensemble_confidence"],
                e["distance_m"], e["ptz_pan"], e["ptz_tilt"], e["ptz_command"],
                e["situation_state"]
            ])
        return output.getvalue()
