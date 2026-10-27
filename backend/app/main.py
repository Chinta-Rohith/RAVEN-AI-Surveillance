import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Set
from app.simulation.engine import SimulationEngine

app = FastAPI(title="Intelligent Battlefield Surveillance System API")

# Allow CORS for React frontend (Vite defaults to port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local prototype development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Simulation Engine
sim_engine = SimulationEngine()

# Keep track of active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        # Convert dict to JSON string
        data = json.dumps(message)
        # Create a list of tasks to run concurrently
        tasks = [connection.send_text(data) for connection in self.active_connections]
        await asyncio.gather(*tasks, return_exceptions=True)

manager = ConnectionManager()

# Background simulation runner
async def simulation_runner():
    while True:
        try:
            if sim_engine.is_running:
                sim_engine.step()
                # Broadcast the updated state
                await manager.broadcast(get_current_state_payload())
            
            # Base tick rate is 0.5s at 1x speed. Scale with speed multiplier.
            sleep_time = max(0.05, 0.5 / sim_engine.speed_multiplier)
            await asyncio.sleep(sleep_time)
        except Exception as e:
            print(f"Error in simulation loop: {e}")
            await asyncio.sleep(0.5)

@app.on_event("startup")
async def startup_event():
    # Start the background task
    asyncio.create_task(simulation_runner())

def get_current_state_payload() -> Dict[str, Any]:
    # Call agent orchestrator mock to get pipeline logs
    agent_orchestration = sim_engine.orchestrator.orchestrate({})
    
    return {
        "tick": sim_engine.current_tick,
        "elapsed_time": round(sim_engine.elapsed_time, 1),
        "is_running": sim_engine.is_running,
        "active_scenario": sim_engine.active_scenario,
        "speed_multiplier": sim_engine.speed_multiplier,
        "night_mode": sim_engine.night_mode,
        "low_visibility": sim_engine.low_visibility,
        "objects": [obj for obj in sim_engine.objects.values()],
        "alerts": sim_engine.alerts,
        "events": sim_engine.events,
        "orchestration": agent_orchestration,
        "analytics": sim_engine.get_analytics(),
        "summary": sim_engine.get_summary()
    }

# Input schemas for POST endpoints
class ScenarioInput(BaseModel):
    scenario: str

class SpeedInput(BaseModel):
    speed: float

class EnvInput(BaseModel):
    night_mode: bool
    low_visibility: bool

# REST Endpoints
@app.get("/api/system/status")
def get_system_status():
    return {
        "status": "ONLINE",
        "pipeline": "READY",
        "camera": "SIMULATED FEED",
        "active_scenario": sim_engine.active_scenario,
        "is_running": sim_engine.is_running,
        "speed_multiplier": sim_engine.speed_multiplier,
        "night_mode": sim_engine.night_mode,
        "low_visibility": sim_engine.low_visibility
    }

@app.get("/api/objects")
def get_objects():
    return [obj for obj in sim_engine.objects.values()]

@app.get("/api/objects/{object_id}")
def get_object(object_id: int):
    obj = sim_engine.objects.get(object_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    return obj

@app.get("/api/events")
def get_events():
    return sim_engine.events

@app.get("/api/alerts")
def get_alerts():
    return sim_engine.alerts

@app.get("/api/analytics")
def get_analytics():
    return sim_engine.get_analytics()

@app.get("/api/session-summary")
def get_session_summary():
    return sim_engine.get_summary()

# Simulation Controls
@app.post("/api/simulation/start")
def start_simulation():
    sim_engine.start()
    return {"message": "Simulation started", "state": get_current_state_payload()}

@app.post("/api/simulation/pause")
def pause_simulation():
    sim_engine.pause()
    return {"message": "Simulation paused", "state": get_current_state_payload()}

@app.post("/api/simulation/stop")
def stop_simulation():
    sim_engine.stop()
    return {"message": "Simulation stopped", "state": get_current_state_payload()}

@app.post("/api/simulation/reset")
def reset_simulation():
    sim_engine.reset()
    return {"message": "Simulation reset", "state": get_current_state_payload()}

@app.post("/api/simulation/scenario")
def select_scenario(data: ScenarioInput):
    if data.scenario not in sim_engine.scenarios:
        raise HTTPException(status_code=400, detail="Invalid scenario name")
    sim_engine.set_scenario(data.scenario)
    return {"message": f"Scenario changed to {data.scenario}", "state": get_current_state_payload()}

@app.post("/api/simulation/speed")
def change_speed(data: SpeedInput):
    if data.speed not in [0.5, 1.0, 2.0, 4.0]:
        raise HTTPException(status_code=400, detail="Invalid speed. Supported: 0.5, 1.0, 2.0, 4.0")
    sim_engine.set_speed(data.speed)
    return {"message": f"Speed multiplier updated to {data.speed}", "state": get_current_state_payload()}

@app.post("/api/simulation/env")
def update_environment(data: EnvInput):
    sim_engine.night_mode = data.night_mode
    sim_engine.low_visibility = data.low_visibility
    sim_engine.add_event(
        f"Environment changed: Night Mode = {data.night_mode}, Low Visibility = {data.low_visibility}",
        "Low", "SYSTEM"
    )
    return {"message": "Environment updated", "state": get_current_state_payload()}

@app.post("/api/alerts/acknowledge/{alert_id}")
def acknowledge_alert(alert_id: str):
    sim_engine.acknowledge_alert(alert_id)
    return {"message": f"Alert {alert_id} acknowledged"}

# WebSocket endpoint
@app.websocket("/ws/surveillance")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    # Send initial state on connect
    await websocket.send_text(json.dumps(get_current_state_payload()))
    try:
        while True:
            # We can receive control commands or simply maintain connection
            data = await websocket.receive_text()
            try:
                cmd = json.loads(data)
                action = cmd.get("action")
                if action == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
                elif action == "ACK_ALERT":
                    alert_id = cmd.get("alert_id")
                    if alert_id:
                        sim_engine.acknowledge_alert(alert_id)
                        await manager.broadcast(get_current_state_payload())
            except Exception as e:
                print(f"Error handling WS command: {e}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)
