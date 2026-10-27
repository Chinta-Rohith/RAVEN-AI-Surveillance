"""
RAVEN Authentication & Client Workspace Pydantic Schemas
Defines request and response validation models with strict typing.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    password_confirm: str = Field(..., min_length=8, max_length=128)

    @field_validator("password_confirm")
    @classmethod
    def passwords_match(cls, v, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match.")
        return v


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=16)
    new_password: str = Field(..., min_length=8, max_length=128)
    new_password_confirm: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password_confirm")
    @classmethod
    def passwords_match(cls, v, info):
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("New passwords do not match.")
        return v


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=16)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
    new_password_confirm: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password_confirm")
    @classmethod
    def passwords_match(cls, v, info):
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("New passwords do not match.")
        return v


class UpdateProfileRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    is_verified: bool
    account_status: str
    created_at: Optional[str] = None
    last_login_at: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class AdminUserUpdateRequest(BaseModel):
    account_status: Optional[str] = Field(None, pattern="^(active|suspended)$")
    role: Optional[str] = Field(None, pattern="^(client|admin)$")


class AdminStatsResponse(BaseModel):
    total_users: int
    verified_users: int
    unverified_users: int
    active_users: int
    suspended_users: int
    admin_users: int
    client_users: int


class AuditLogResponse(BaseModel):
    id: int
    timestamp: str
    user_id: Optional[str] = None
    email: Optional[str] = None
    event_type: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[str] = None


# Client Data Isolation Models
class ClientReportCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    duration_seconds: float = Field(..., ge=0.0)
    frames_processed: int = Field(..., ge=0)
    average_fps: float = Field(..., ge=0.0)
    average_latency_ms: float = Field(..., ge=0.0)
    total_unique_tracks: int = Field(..., ge=0)
    detector: str = "YOLO11s"
    validator: str = "VaL_CNN (64x64 ROI)"
    ensemble_alpha: float = 0.70
    ensemble_threshold: float = 0.50
    notes: Optional[str] = None


class ClientReportResponse(BaseModel):
    id: str
    user_id: str
    title: str
    duration_seconds: float
    frames_processed: int
    average_fps: float
    average_latency_ms: float
    total_unique_tracks: int
    detector: str
    validator: str
    ensemble_alpha: float
    ensemble_threshold: float
    notes: Optional[str] = None
    created_at: str


class ClientConfigUpdate(BaseModel):
    workspace_name: Optional[str] = Field(None, max_length=100)
    ensemble_alpha: Optional[float] = Field(None, ge=0.0, le=1.0)
    ensemble_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    boundary_ratio: Optional[float] = Field(None, ge=0.05, le=0.25)
    kp_pan: Optional[float] = Field(None, ge=0.05, le=1.5)
    kp_tilt: Optional[float] = Field(None, ge=0.05, le=1.5)


class ClientConfigResponse(BaseModel):
    user_id: str
    workspace_name: str
    ensemble_alpha: float
    ensemble_threshold: float
    boundary_ratio: float
    kp_pan: float
    kp_tilt: float
    updated_at: str
