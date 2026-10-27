"""
RAVEN Backend Application Entrypoint
Real-time Agentic Vision for UAV Navigation
Built on DeTrAck (IEEE Access 2025): YOLO11 -> VaL_CNN -> DeepSORT -> PTZ/ONVIF
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import asyncio
import json
import os
import shutil
from typing import Set, Dict, Any, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.config import settings
from backend.services.pipeline_service import SurveillancePipelineService
from backend.services.ablation_service import AblationStudyService
from backend.services.dataset_service import DatasetService
from backend.auth.db import auth_db
from backend.auth.routes import auth_router, client_router, admin_router

app = FastAPI(
    title="RAVEN: Real-time Agentic Vision for UAV Navigation",
    description="DeTrAck-based UAV Detection, Validation, Tracking, and PTZ Surveillance System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Authentication, Client Workspace, and Administration Routers
app.include_router(auth_router)
app.include_router(client_router)
app.include_router(admin_router)

# Initialize Core Services
pipeline_service = SurveillancePipelineService()
ablation_service = AblationStudyService()
dataset_service = DatasetService()


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        data = json.dumps(message)
        tasks = [ws.send_text(data) for ws in self.active_connections]
        await asyncio.gather(*tasks, return_exceptions=True)


manager = ConnectionManager()


async def pipeline_loop():
    """Continuous real-time computer vision loop."""
    await pipeline_service.initialize()
    print("[RAVEN Core] Pipeline service initialized. Starting vision loop...")

    while True:
        try:
            if pipeline_service.is_running:
                payload = await pipeline_service.process_frame()
                if payload:
                    await manager.broadcast(payload)

            # Target ~30 FPS (33ms sleep minus execution overhead)
            await asyncio.sleep(0.03)
        except Exception as e:
            print(f"[RAVEN Loop] Error in vision loop: {e}")
            await asyncio.sleep(0.1)


@app.on_event("startup")
async def on_startup():
    await auth_db.init_auth_db()
    asyncio.create_task(pipeline_loop())


# --- Schemas ---
class ConfigUpdate(BaseModel):
    ensemble_alpha: Optional[float] = None
    ensemble_threshold: Optional[float] = None
    ptz_mode: Optional[str] = None
    boundary_ratio: Optional[float] = None
    kp_pan: Optional[float] = None
    kp_tilt: Optional[float] = None


class SourceSelect(BaseModel):
    source_type: str  # "synthetic", "webcam", "video_file", "rtsp"
    path_or_url: Optional[str] = None


class PTZManualCommand(BaseModel):
    action: str  # "PAN_LEFT", "PAN_RIGHT", "TILT_UP", "TILT_DOWN", "ZOOM_IN", "ZOOM_OUT", "HOME"
    step: float = 5.0


class TargetSelect(BaseModel):
    target_id: Optional[int] = None


# --- REST API Endpoints ---

@app.get("/api/system/status")
def get_system_status():
    return {
        "title": "RAVEN UAV Surveillance System",
        "reference_paper": "DeTrAck (IEEE Access 2025)",
        "pipeline_architecture": "YOLO11 -> VaL_CNN -> Ensemble -> DeepSORT -> PTZ/ONVIF",
        "yolo_detector": {
            "loaded": pipeline_service.detector.is_loaded,
            "model_path": pipeline_service.detector.model_path,
            "custom_uav_weights": pipeline_service.detector.is_custom_uav_weights,
            "device": pipeline_service.detector.device
        },
        "val_cnn_validator": {
            "loaded": pipeline_service.validator.weights_loaded,
            "status": pipeline_service.validator.status_message,
            "model_path": pipeline_service.validator.model_path
        },
        "ensemble": {
            "alpha": pipeline_service.ensemble.alpha,
            "formula": f"S_Ens = {pipeline_service.ensemble.alpha:.2f} * S_YOLO + {1.0 - pipeline_service.ensemble.alpha:.2f} * S_VaL",
            "threshold": pipeline_service.ensemble.accept_threshold
        },
        "tracker": {
            "type": "DeepSORT",
            "active_tracks": len(pipeline_service.tracker.tracks)
        },
        "ptz": pipeline_service.ptz_simulator.get_status(),
        "source": {
            "type": pipeline_service.source_type,
            "ir_mode": pipeline_service.ir_mode
        },
        "is_running": pipeline_service.is_running
    }


@app.get("/api/config")
def get_config():
    return {
        "ensemble_alpha": pipeline_service.ensemble.alpha,
        "ensemble_threshold": pipeline_service.ensemble.accept_threshold,
        "boundary_ratio": pipeline_service.boundary_detector.boundary_ratio,
        "ptz_mode": pipeline_service.onvif_client.simulator.mode,
        "kp_pan": pipeline_service.ptz_controller.kp_pan,
        "kp_tilt": pipeline_service.ptz_controller.kp_tilt,
        "ir_mode": pipeline_service.ir_mode,
        "video_source": pipeline_service.source_type
    }


@app.post("/api/config")
def update_config(cfg: ConfigUpdate):
    if cfg.ensemble_alpha is not None:
        pipeline_service.ensemble.alpha = max(0.0, min(1.0, cfg.ensemble_alpha))
    if cfg.ensemble_threshold is not None:
        pipeline_service.ensemble.accept_threshold = max(0.0, min(1.0, cfg.ensemble_threshold))
    if cfg.boundary_ratio is not None:
        pipeline_service.boundary_detector.boundary_ratio = max(0.02, min(0.35, cfg.boundary_ratio))
    if cfg.kp_pan is not None:
        pipeline_service.ptz_controller.kp_pan = max(0.05, min(2.0, cfg.kp_pan))
    if cfg.kp_tilt is not None:
        pipeline_service.ptz_controller.kp_tilt = max(0.05, min(2.0, cfg.kp_tilt))
    return {"status": "SUCCESS", "config": get_config()}


@app.post("/api/source/select")
def select_source(req: SourceSelect):
    return pipeline_service.set_video_source(req.source_type, req.path_or_url)


@app.post("/api/source/ir")
def toggle_ir(enabled: bool = Form(...)):
    pipeline_service.set_ir_mode(enabled)
    return {"status": "SUCCESS", "ir_mode": pipeline_service.ir_mode}


@app.post("/api/source/upload")
async def upload_video(file: UploadFile = File(...)):
    """Uploads a drone video file and sets it as the active video source."""
    upload_dir = Path("datasets/uploaded_videos")
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    pipeline_service.set_video_source("video_file", str(file_path))
    return {
        "status": "SUCCESS",
        "filename": file.filename,
        "path": str(file_path),
        "message": f"Video '{file.filename}' uploaded and active."
    }


@app.post("/api/pipeline/toggle")
def toggle_pipeline(running: bool = Form(...)):
    pipeline_service.is_running = running
    return {"status": "SUCCESS", "is_running": pipeline_service.is_running}


@app.post("/api/pipeline/pause")
def pause_pipeline(paused: bool = Form(...)):
    pipeline_service.is_paused = paused
    return {"status": "SUCCESS", "is_paused": pipeline_service.is_paused}


@app.post("/api/ptz/auto_track")
def toggle_auto_track(enabled: bool = Form(...)):
    pipeline_service.auto_track_enabled = enabled
    return {"status": "SUCCESS", "auto_track_enabled": pipeline_service.auto_track_enabled}


@app.get("/api/camera/diagnostics")
def get_camera_diagnostics():
    return pipeline_service.get_camera_diagnostics()


@app.get("/api/reports/summary")
def get_reports_summary():
    return pipeline_service.get_session_summary()


@app.post("/api/ptz/command")
def manual_ptz(cmd: PTZManualCommand):
    sim = pipeline_service.ptz_simulator
    step = cmd.step
    if cmd.action == "PAN_LEFT":
        sim.manual_move(pan_delta=-step, tilt_delta=0.0)
    elif cmd.action == "PAN_RIGHT":
        sim.manual_move(pan_delta=step, tilt_delta=0.0)
    elif cmd.action == "TILT_UP":
        sim.manual_move(pan_delta=0.0, tilt_delta=step)
    elif cmd.action == "TILT_DOWN":
        sim.manual_move(pan_delta=0.0, tilt_delta=-step)
    elif cmd.action == "ZOOM_IN":
        sim.manual_move(pan_delta=0.0, tilt_delta=0.0, zoom_delta=0.5)
    elif cmd.action == "ZOOM_OUT":
        sim.manual_move(pan_delta=0.0, tilt_delta=0.0, zoom_delta=-0.5)
    elif cmd.action == "HOME":
        sim.home()
    return sim.get_status()


@app.post("/api/ptz/select_target")
def select_target(req: TargetSelect):
    pipeline_service.selected_target_id = req.target_id
    return {"status": "SUCCESS", "selected_target_id": req.target_id}


@app.get("/api/logs/recent")
async def get_recent_logs(limit: int = 100):
    return await pipeline_service.telemetry_repo.get_recent_events(limit=limit)


@app.get("/api/logs/export")
async def export_logs_csv():
    csv_data = await pipeline_service.telemetry_repo.export_csv()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=raven_telemetry_log.csv"}
    )


@app.get("/api/experiments/ablation")
def get_ablation_results():
    return ablation_service.get_latest_results()


@app.post("/api/experiments/run")
def run_ablation_benchmark(frames: int = Form(default=30)):
    return ablation_service.run_benchmark(frames_to_eval=frames)


@app.get("/api/datasets/summary")
def get_dataset_summary():
    return dataset_service.get_summary()


# --- WebSocket Stream ---

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await manager.connect(websocket)
    # Send current payload immediately on connection
    if pipeline_service.last_processed_payload:
        await websocket.send_text(json.dumps(pipeline_service.last_processed_payload))

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                action = msg.get("action")
                if action == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
                elif action == "SELECT_TARGET":
                    pipeline_service.selected_target_id = msg.get("target_id")
                elif action == "TOGGLE_IR":
                    pipeline_service.set_ir_mode(bool(msg.get("enabled", False)))
            except Exception as e:
                print(f"[WS] Error processing message: {e}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
# Serve compiled React frontend if available
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

dist_dir = ROOT_DIR / "frontend" / "dist"
assets_dir = dist_dir / "assets"

if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith("api") or full_path.startswith("ws"):
        raise HTTPException(status_code=404, detail="Not Found")
    
    # Strict security barrier: prevent any public download of data/, logs/, .env, or database files
    norm = full_path.lower().strip()
    if (
        norm.startswith("data") or
        norm.startswith("logs") or
        norm.startswith(".env") or
        ".." in norm or
        norm.endswith(".db") or
        norm.endswith(".sqlite") or
        norm.endswith(".sqlite3")
    ):
        raise HTTPException(status_code=403, detail="Access Forbidden: Protected Storage")

    target_file = dist_dir / full_path
    if full_path and target_file.is_file():
        return FileResponse(str(target_file))
    index_file = dist_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "RAVEN Backend API is running."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
