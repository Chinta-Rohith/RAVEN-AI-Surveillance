"""
RAVEN Telemetry Database Engine
Manages SQLite database connection and table migrations for audit logs.
"""

from pathlib import Path
import aiosqlite

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS telemetry_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    track_id INTEGER NOT NULL,
    bbox TEXT NOT NULL,
    yolo_confidence REAL NOT NULL,
    val_confidence REAL NOT NULL,
    ensemble_confidence REAL NOT NULL,
    distance_m REAL,
    ptz_pan REAL,
    ptz_tilt REAL,
    ptz_command TEXT,
    situation_state TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_track_id ON telemetry_events(track_id);
"""


class DatabaseManager:
    """Manages asynchronous SQLite connections and schemas."""

    def __init__(self, db_path: str = "logs/raven_telemetry.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    async def init_db(self) -> None:
        """Initializes database tables."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.executescript(SCHEMA_SQL)
            await db.commit()

    async def get_connection(self) -> aiosqlite.Connection:
        return await aiosqlite.connect(self.db_path)
