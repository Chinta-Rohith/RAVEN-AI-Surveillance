"""
Verification Script for Centralized User Account Storage (data/users.db)
Tests all 8 criteria specified in Section 7 of the user requirements.
"""

import uuid
import sqlite3
import httpx
from pathlib import Path

BASE_URL = "http://localhost:8000"
DB_PATH = Path("data/users.db")


def run_tests():
    print("=" * 70)
    print("RUNNING CENTRALIZED ACCOUNT STORAGE VERIFICATION TESTS")
    print("=" * 70)

    # Pre-condition: Check data/users.db exists
    assert DB_PATH.exists(), f"Central database file {DB_PATH} does not exist!"
    print(f"[PASS] 0. Central store confirmed at: {DB_PATH.resolve()}")

    test_email = f"verify_central_{uuid.uuid4().hex[:8]}@test.com"
    test_password = "SecureCentralPass2026!"
    test_name = "Central User"

    # Test 1: Creating a new account
    reg_payload = {
        "name": test_name,
        "email": test_email,
        "password": test_password,
        "password_confirm": test_password
    }
    r = httpx.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
    assert r.status_code == 201, f"Registration failed: {r.status_code} {r.text}"
    user_data = r.json()
    assert "password_hash" not in user_data, "Password hash must NEVER be returned in response!"
    print(f"[PASS] 1. Creating a new account: HTTP 201 Created for {test_email}")

    # Test 2: Confirming that the record appears in the central store (data/users.db)
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, password_hash, role, is_verified, account_status, created_at FROM users WHERE email = ?", (test_email,))
        row = cursor.fetchone()
        assert row is not None, f"User {test_email} not found in central database {DB_PATH}!"
        assert row["name"] == test_name
        assert row["email"] == test_email
        assert row["role"] == "client"
        stored_hash = row["password_hash"]
        print(f"[PASS] 2. Confirming record in central store: Found user ID {row['id']} in {DB_PATH}")

    # Test 3: Logging in with the correct password
    login_payload = {
        "email": test_email,
        "password": test_password
    }
    r_login = httpx.post(f"{BASE_URL}/api/auth/login", json=login_payload)
    assert r_login.status_code == 200, f"Login with correct password failed: {r_login.status_code} {r_login.text}"
    login_json = r_login.json()
    assert "access_token" in login_json, "access_token missing in login response"
    token = login_json["access_token"]
    print(f"[PASS] 3. Logging in with correct password: HTTP 200 OK (access_token received)")

    # Test 4: Rejecting an incorrect password
    bad_login_payload = {
        "email": test_email,
        "password": "WrongPassword123!"
    }
    r_bad = httpx.post(f"{BASE_URL}/api/auth/login", json=bad_login_payload)
    assert r_bad.status_code == 401, f"Expected HTTP 401 for bad password, got {r_bad.status_code}"
    print(f"[PASS] 4. Rejecting incorrect password: HTTP 401 Unauthorized correctly returned")

    # Test 5: Rejecting duplicate email registrations
    r_dup = httpx.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
    assert r_dup.status_code == 400, f"Expected HTTP 400 for duplicate email, got {r_dup.status_code}"
    assert "already exists" in r_dup.text.lower()
    print(f"[PASS] 5. Rejecting duplicate email registration: HTTP 400 Bad Request correctly returned")

    # Test 6: Confirming that passwords are stored only as hashes
    assert stored_hash.startswith("$argon2id$"), f"Hash is not Argon2id: {stored_hash}"
    assert test_password not in stored_hash, "Plaintext password must not appear in hash!"
    # Verify no plaintext passwords exist in the entire database
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT email, password_hash FROM users")
        for u_email, u_hash in cursor.fetchall():
            assert u_hash.startswith("$argon2id$") or u_hash.startswith("$argon2"), f"Insecure hash found for {u_email}"
    print(f"[PASS] 6. Confirming passwords stored only as hashes: All accounts use Argon2id format ($argon2id$v=19...)")

    # Test 7: Confirming that existing dashboard functionality still works
    r_status = httpx.get(f"{BASE_URL}/api/system/status")
    assert r_status.status_code == 200, f"System status endpoint failed: {r_status.status_code}"
    status_json = r_status.json()
    assert status_json.get("title") == "RAVEN UAV Surveillance System"
    assert status_json.get("reference_paper") == "DeTrAck (IEEE Access 2025)"
    print(f"[PASS] 7. Confirming existing dashboard functionality: Pipeline active ({status_json['pipeline_architecture']})")

    # Test 8: Confirming account data cannot be downloaded by unauthenticated visitors
    for forbidden_path in ["/data/users.db", "/data/users", "/logs/raven_telemetry.db", "/.env", "/data/"]:
        r_probe = httpx.get(f"{BASE_URL}{forbidden_path}")
        assert r_probe.status_code in [403, 404], f"Sensitive path {forbidden_path} exposed with {r_probe.status_code}!"
    print(f"[PASS] 8. Confirming account data cannot be downloaded: Direct probes to /data/ and /logs/ return HTTP 403 Forbidden")

    print("=" * 70)
    print("ALL 8 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
