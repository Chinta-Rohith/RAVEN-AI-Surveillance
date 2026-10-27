"""
RAVEN System Configuration
Supports loading settings from environment variables and .env files.
"""

from pathlib import Path
from typing import Literal, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

    # Security & Authentication (Argon2id + JWT)
    JWT_SECRET_KEY: str = "raven-surveillance-default-dev-secret-key-32-chars-min"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24

    # Security Rate Limiting
    RATE_LIMIT_LOGIN_ATTEMPTS: int = 5
    RATE_LIMIT_WINDOW_SECONDS: int = 300

    # Email Delivery Configuration
    EMAIL_MODE: Literal["development", "smtp"] = "development"
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@raven-surveillance.io"
    SMTP_FROM_NAME: str = "RAVEN AI Surveillance Platform"
    APP_URL: str = "http://localhost:5173"

    # Inference Device
    DEVICE: str = "cpu"  # "cpu", "cuda", or "auto"

    # YOLO11 Primary Detector
    YOLO_MODEL_PATH: str = "models/yolo11s.pt"
    YOLO_CONFIDENCE_THRESHOLD: float = 0.20
    YOLO_IOU_THRESHOLD: float = 0.45

    # VaL_CNN Secondary Validation Network
    VAL_CNN_MODEL_PATH: str = "models/val_cnn.pt"
    VAL_CNN_CONFIDENCE_THRESHOLD: float = 0.50
    VAL_CNN_INPUT_SIZE: int = 64

    # Ensemble Parameters (DeTrAck formulation: S_Ens = alpha * S_YOLO + (1-alpha) * S_VaL)
    ENSEMBLE_ALPHA: float = Field(default=0.70, ge=0.0, le=1.0)
    ENSEMBLE_ACCEPT_THRESHOLD: float = Field(default=0.50, ge=0.0, le=1.0)

    # DeepSORT Tracker Parameters
    DEEPSORT_MAX_AGE: int = 30
    DEEPSORT_N_INIT: int = 3
    DEEPSORT_NN_BUDGET: int = 100
    DEEPSORT_MAX_COSINE_DISTANCE: float = 0.25

    # PTZ Controller & Frame Boundary
    PTZ_BOUNDARY_RATIO: float = 0.10  # 10% edge margin as specified in DeTrAck
    PTZ_MODE: Literal["SIMULATION", "ONVIF"] = "SIMULATION"
    KP_PAN: float = 0.40
    KP_TILT: float = 0.40
    PTZ_MAX_SPEED: float = 0.80

    # ONVIF Camera Settings
    ONVIF_HOST: Optional[str] = None
    ONVIF_PORT: int = 80
    ONVIF_USERNAME: Optional[str] = None
    ONVIF_PASSWORD: Optional[str] = None

    # Video Source
    VIDEO_SOURCE_TYPE: Literal["webcam", "video_file", "rtsp", "synthetic"] = "synthetic"
    VIDEO_FILE_PATH: Optional[str] = None
    RTSP_URL: Optional[str] = None

    # Distance Estimation (Relative pinhole approximation)
    CAMERA_FOCAL_LENGTH: float = 800.0  # pixels
    ASSUMED_UAV_WIDTH_M: float = 0.50   # meters

    # Database Configuration (Centralized User Account Storage)
    DATABASE_PATH: str = "data/users.db"
    AUTH_DATABASE_PATH: str = "data/users.db"


settings = Settings()
