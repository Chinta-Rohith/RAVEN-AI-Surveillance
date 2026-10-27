"""
RAVEN ONVIF Hardware Client
Handles hardware communication with physical ONVIF Profile S/T PTZ cameras.
Falls back safely to PTZ simulation mode if hardware is unavailable.
"""

from typing import Optional, Dict, Any
from backend.ptz.ptz_controller import PTZCommand
from backend.ptz.simulator import PTZSimulator


class ONVIFClient:
    """
    Manages ONVIF PTZ camera integration with automated error recovery.
    """

    def __init__(
        self,
        host: Optional[str] = None,
        port: int = 80,
        username: Optional[str] = None,
        password: Optional[str] = None,
        fallback_simulator: Optional[PTZSimulator] = None
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.simulator = fallback_simulator or PTZSimulator()
        self.is_hardware_connected = False
        self.ptz_service = None
        self.profile = None
        self.status_message = "ONVIF client initialized."

        if self.host and self.username and self.password:
            self._connect()
        else:
            self.status_message = "No physical ONVIF camera credentials configured. Running in SIMULATION mode."
            print(f"[ONVIFClient] {self.status_message}")

    def _connect(self) -> None:
        """Attempts to connect to the physical camera."""
        try:
            from onvif import ONVIFCamera
            mycam = ONVIFCamera(self.host, self.port, self.username, self.password)
            self.ptz_service = mycam.create_ptz_service()
            media = mycam.create_media_service()
            profiles = media.GetProfiles()
            self.profile = profiles[0]
            self.is_hardware_connected = True
            self.status_message = f"Connected to physical ONVIF camera at {self.host}:{self.port}."
            print(f"[ONVIFClient] {self.status_message}")
        except Exception as e:
            self.is_hardware_connected = False
            self.status_message = f"ONVIF camera unreachable at {self.host}:{self.port} ({e}). Safe fallback to SIMULATION mode."
            print(f"[ONVIFClient] {self.status_message}")

    def send_command(self, command: PTZCommand) -> Dict[str, Any]:
        """Sends continuous move command to ONVIF camera or updates simulation."""
        if self.is_hardware_connected and self.ptz_service and self.profile:
            try:
                request = self.ptz_service.create_type("ContinuousMove")
                request.ProfileToken = self.profile.token
                request.Velocity = {
                    "PanTilt": {
                        "x": command.pan_speed,
                        "y": command.tilt_speed
                    },
                    "Zoom": {
                        "x": command.zoom_speed
                    }
                }
                self.ptz_service.ContinuousMove(request)
            except Exception as err:
                print(f"[ONVIFClient] Command dispatch error: {err}")
                self.is_hardware_connected = False

        # Always update simulator state for dashboard telemetry
        status = self.simulator.update(command)
        status["mode"] = "ONVIF" if self.is_hardware_connected else "SIMULATION"
        status["connected"] = self.is_hardware_connected
        status["status_message"] = self.status_message
        return status
