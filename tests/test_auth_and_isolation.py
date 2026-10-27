"""
RAVEN Authentication, RBAC, and Client Data Isolation Test Suite
Validates all 13 core requirements with isolated test data:
1. Successful registration
2. Duplicate-email rejection
3. Invalid login rejection
4. Successful login and JWT issuance
5. Email verification workflow
6. Password reset workflow
7. Logout and session invalidation
8. Access to protected routes (Bearer / Cookie)
9. Admin-only operations & RBAC enforcement
10. Rejection of unauthorized privilege escalation
11. Client data isolation (Client A accessing Client B records returns 403)
12. Rate limiting & validation failures
13. Existing RAVEN endpoints continue to function
"""

import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from backend.main import app
from backend.auth.db import auth_db
from backend.auth.email_service import EmailService


@pytest_asyncio.fixture(autouse=True)
async def reset_rate_limits():
    """Ensures database is initialized and resets test rate limits between test cases."""
    await auth_db.init_auth_db()
    conn = await auth_db.get_connection()
    try:
        await conn.execute("DELETE FROM login_rate_limits")
        await conn.commit()
    finally:
        await conn.close()


@pytest.mark.asyncio
async def test_01_successful_registration():
    """Test 1: Successful registration creates a client account with least privilege."""
    unique_email = f"client_{uuid.uuid4().hex[:8]}@test.com"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/auth/register",
            json={
                "name": "Alpha Client",
                "email": unique_email,
                "password": "SecurePassword123!",
                "password_confirm": "SecurePassword123!"
            }
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["email"] == unique_email
        assert data["role"] == "client"  # Least required privilege
        assert data["is_verified"] is False
        assert "password" not in data
        assert "password_hash" not in data


@pytest.mark.asyncio
async def test_02_duplicate_email_rejection():
    """Test 2: Rejects registration with an already existing email address."""
    unique_email = f"duplicate_{uuid.uuid4().hex[:8]}@test.com"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # First registration
        resp1 = await client.post(
            "/api/auth/register",
            json={
                "name": "Beta Client",
                "email": unique_email,
                "password": "SecurePassword123!",
                "password_confirm": "SecurePassword123!"
            }
        )
        assert resp1.status_code == 201

        # Attempt duplicate registration with different casing
        resp2 = await client.post(
            "/api/auth/register",
            json={
                "name": "Beta Clone",
                "email": unique_email.upper(),
                "password": "AnotherPassword456!",
                "password_confirm": "AnotherPassword456!"
            }
        )
        assert resp2.status_code == 400
        assert "already exists" in resp2.json()["detail"]


@pytest.mark.asyncio
async def test_03_invalid_login():
    """Test 3: Rejects invalid credentials with generic message to prevent enumeration."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Unknown email
        resp1 = await client.post(
            "/api/auth/login",
            json={"email": f"unknown_{uuid.uuid4().hex[:8]}@test.com", "password": "WrongPassword123!"}
        )
        assert resp1.status_code == 401
        assert resp1.json()["detail"] == "Invalid email or password."


@pytest.mark.asyncio
async def test_04_successful_login():
    """Test 4: Authenticates user and returns valid JWT access token."""
    email = f"login_{uuid.uuid4().hex[:8]}@test.com"
    pwd = "SecurePassword123!"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post(
            "/api/auth/register",
            json={"name": "Login User", "email": email, "password": pwd, "password_confirm": pwd}
        )
        resp = await client.post(
            "/api/auth/login",
            json={"email": email, "password": pwd}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == email


@pytest.mark.asyncio
async def test_05_email_verification():
    """Test 5: Validates single-use email verification token."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        email = f"verify_{uuid.uuid4().hex[:8]}@test.com"
        pwd = "SecurePassword123!"
        await client.post(
            "/api/auth/register",
            json={"name": "Verify User", "email": email, "password": pwd, "password_confirm": pwd}
        )

        # Retrieve test verification token from email service registry
        raw_token = EmailService.get_latest_test_token(email, "email_verify")
        assert raw_token is not None

        # Verify email with token
        verify_resp = await client.post("/api/auth/verify-email", json={"token": raw_token})
        assert verify_resp.status_code == 200
        assert "verified successfully" in verify_resp.json()["message"]

        # Attempting to use the same token again must fail (single-use)
        second_resp = await client.post("/api/auth/verify-email", json={"token": raw_token})
        assert second_resp.status_code == 400


@pytest.mark.asyncio
async def test_06_password_reset_workflow():
    """Test 6: Validates single-use password reset workflow."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        email = f"reset_{uuid.uuid4().hex[:8]}@test.com"
        pwd = "InitialPassword123!"
        await client.post(
            "/api/auth/register",
            json={"name": "Reset User", "email": email, "password": pwd, "password_confirm": pwd}
        )

        # 1. Request reset
        req_resp = await client.post("/api/auth/forgot-password", json={"email": email})
        assert req_resp.status_code == 200

        # 2. Extract single-use token
        raw_token = EmailService.get_latest_test_token(email, "password_reset")
        assert raw_token is not None

        # 3. Reset password
        new_pass = "BrandNewPassword2026!"
        reset_resp = await client.post(
            "/api/auth/reset-password",
            json={"token": raw_token, "new_password": new_pass, "new_password_confirm": new_pass}
        )
        assert reset_resp.status_code == 200

        # 4. Old password should fail
        old_login = await client.post("/api/auth/login", json={"email": email, "password": pwd})
        assert old_login.status_code == 401

        # 5. New password must succeed
        new_login = await client.post("/api/auth/login", json={"email": email, "password": new_pass})
        assert new_login.status_code == 200


@pytest.mark.asyncio
async def test_07_logout_and_session_invalidation():
    """Test 7: Logout adds JWT jti to revocation list, blocking further access."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        email = f"logout_{uuid.uuid4().hex[:8]}@test.com"
        pwd = "SecurePassword123!"
        await client.post(
            "/api/auth/register",
            json={"name": "Logout User", "email": email, "password": pwd, "password_confirm": pwd}
        )
        login_resp = await client.post("/api/auth/login", json={"email": email, "password": pwd})
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Verify access before logout
        me_resp = await client.get("/api/auth/me", headers=headers)
        assert me_resp.status_code == 200

        # Perform logout
        logout_resp = await client.post("/api/auth/logout", headers=headers)
        assert logout_resp.status_code == 200

        # Access with revoked token must fail
        revoked_resp = await client.get("/api/auth/me", headers=headers)
        assert revoked_resp.status_code == 401


@pytest.mark.asyncio
async def test_08_protected_routes():
    """Test 8: Unauthenticated access to protected routes is rejected with 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 401

        resp_reports = await client.get("/api/client/reports")
        assert resp_reports.status_code == 401


@pytest.mark.asyncio
async def test_09_admin_only_operations():
    """Test 9: Clients are blocked from admin routes (403); Admins are granted access."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create fresh client
        c_email = f"client_rbac_{uuid.uuid4().hex[:8]}@test.com"
        pwd = "SecurePassword123!"
        await client.post(
            "/api/auth/register",
            json={"name": "RBAC Client", "email": c_email, "password": pwd, "password_confirm": pwd}
        )
        client_login = await client.post("/api/auth/login", json={"email": c_email, "password": pwd})
        client_headers = {"Authorization": f"Bearer {client_login.json()['access_token']}"}

        # Client attempting to access admin stats -> 403 Forbidden
        client_admin_resp = await client.get("/api/admin/stats", headers=client_headers)
        assert client_admin_resp.status_code == 403

        # Admin login
        admin_login = await client.post(
            "/api/auth/login",
            json={"email": "admin@raven-surveillance.io", "password": "AdminSecurity2026!"}
        )
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        # Admin accessing admin stats -> 200 OK
        admin_resp = await client.get("/api/admin/stats", headers=admin_headers)
        assert admin_resp.status_code == 200
        assert "total_users" in admin_resp.json()


@pytest.mark.asyncio
async def test_10_unauthorized_privilege_escalation_rejection():
    """Test 10: Client cannot grant themselves or others the admin role."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        c_email = f"esc_{uuid.uuid4().hex[:8]}@test.com"
        pwd = "SecurePassword123!"
        await client.post(
            "/api/auth/register",
            json={"name": "Escalation Client", "email": c_email, "password": pwd, "password_confirm": pwd}
        )
        client_login = await client.post("/api/auth/login", json={"email": c_email, "password": pwd})
        client_headers = {"Authorization": f"Bearer {client_login.json()['access_token']}"}
        user_id = client_login.json()["user"]["id"]

        # Client attempts PATCH to upgrade their own role
        escalate_resp = await client.patch(
            f"/api/admin/users/{user_id}/role",
            json={"role": "admin"},
            headers=client_headers
        )
        assert escalate_resp.status_code == 403


@pytest.mark.asyncio
async def test_11_client_data_isolation():
    """
    Test 11: Multi-tenant data isolation.
    Client A creates a report. Client B is rejected (403) when attempting to read or delete it.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register Client One
        email_one = f"client1_{uuid.uuid4().hex[:8]}@test.com"
        await client.post(
            "/api/auth/register",
            json={"name": "Client One", "email": email_one, "password": "PasswordOne123!", "password_confirm": "PasswordOne123!"}
        )
        login_one = await client.post("/api/auth/login", json={"email": email_one, "password": "PasswordOne123!"})
        headers_one = {"Authorization": f"Bearer {login_one.json()['access_token']}"}

        # Register Client Two
        email_two = f"client2_{uuid.uuid4().hex[:8]}@test.com"
        await client.post(
            "/api/auth/register",
            json={"name": "Client Two", "email": email_two, "password": "PasswordTwo123!", "password_confirm": "PasswordTwo123!"}
        )
        login_two = await client.post("/api/auth/login", json={"email": email_two, "password": "PasswordTwo123!"})
        headers_two = {"Authorization": f"Bearer {login_two.json()['access_token']}"}

        # Client One creates a private report
        create_resp = await client.post(
            "/api/client/reports",
            headers=headers_one,
            json={
                "title": "Perimeter Patrol Report Alpha",
                "duration_seconds": 120.0,
                "frames_processed": 3600,
                "average_fps": 30.0,
                "average_latency_ms": 32.5,
                "total_unique_tracks": 4,
                "detector": "YOLO11s",
                "validator": "VaL_CNN (64x64 ROI)",
                "ensemble_alpha": 0.70,
                "ensemble_threshold": 0.50
            }
        )
        assert create_resp.status_code == 201
        report_id = create_resp.json()["id"]

        # Client One can view their own report
        one_get = await client.get(f"/api/client/reports/{report_id}", headers=headers_one)
        assert one_get.status_code == 200

        # Client Two attempts to access Client One's report -> Must be rejected with 403 Forbidden!
        two_get = await client.get(f"/api/client/reports/{report_id}", headers=headers_two)
        assert two_get.status_code == 403
        assert "Access denied" in two_get.json()["detail"]

        # Client Two attempts to delete Client One's report -> Must be rejected with 403 Forbidden!
        two_del = await client.delete(f"/api/client/reports/{report_id}", headers=headers_two)
        assert two_del.status_code == 403


@pytest.mark.asyncio
async def test_12_validation_and_rate_limiting():
    """Test 12: Password length/strength validation and login rate limiting."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Weak password (less than 8 chars)
        weak_resp = await client.post(
            "/api/auth/register",
            json={"name": "Weak User", "email": "weak@test.com", "password": "short", "password_confirm": "short"}
        )
        assert weak_resp.status_code in [400, 422]

        # Rapid failed logins trigger rate limit (429)
        ip = "192.168.100.99"
        for _ in range(5):
            await client.post(
                "/api/auth/login",
                json={"email": "brute.force@test.com", "password": "WrongPassword!"},
                headers={"X-Forwarded-For": ip}
            )

        # 6th attempt should be blocked with 429 Too Many Requests
        blocked_resp = await client.post(
            "/api/auth/login",
            json={"email": "brute.force@test.com", "password": "WrongPassword!"},
            headers={"X-Forwarded-For": ip}
        )
        assert blocked_resp.status_code == 429


@pytest.mark.asyncio
async def test_13_existing_raven_endpoints():
    """Test 13: Core computer vision and surveillance endpoints remain functional."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        status_resp = await client.get("/api/system/status")
        assert status_resp.status_code == 200
        assert "reference_paper" in status_resp.json()

        reports_resp = await client.get("/api/reports/summary")
        assert reports_resp.status_code == 200

        diag_resp = await client.get("/api/camera/diagnostics")
        assert diag_resp.status_code == 200
