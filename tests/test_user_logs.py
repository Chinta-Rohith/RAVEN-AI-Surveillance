"""
Automated Verification for data/user_logs.txt
Tests that successful and failed logins append exact 5-column CSV rows with [REDACTED] passwords.
"""

import csv
import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport

from backend.main import app
from backend.auth.db import auth_db

LOG_PATH = Path("data/user_logs.txt")
EXPECTED_HEADER = ["Date & Time", "Entered Username", "Entered Password", "Saved As Username", "IP Address"]


@pytest.mark.asyncio
async def test_user_logs():
    print("Testing data/user_logs.txt integration...")
    await auth_db.init_auth_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Test Successful Login (Known Admin)
        r1 = await client.post("/api/auth/login", json={
            "email": "admin@raven-surveillance.io",
            "password": "AdminSecurity2026!"
        })
        assert r1.status_code == 200, f"Successful login failed: {r1.status_code}"
        print("[PASS] 1. Performed successful login with admin@raven-surveillance.io")

        # 2. Test Failed Login (Known Account, Invalid Password)
        r2 = await client.post("/api/auth/login", json={
            "email": "admin@raven-surveillance.io",
            "password": "IncorrectPassword999!"
        })
        assert r2.status_code == 401, f"Expected 401, got {r2.status_code}"
        print("[PASS] 2. Performed failed login with invalid password on existing account")

        # 3. Test Failed Login (Non-Existent User)
        r3 = await client.post("/api/auth/login", json={
            "email": "unknown_operative@raven-test.org",
            "password": "AnyRandomPassword123!"
        })
        assert r3.status_code == 401, f"Expected 401, got {r3.status_code}"
        print("[PASS] 3. Performed failed login with unknown account")

    # 4. Verify data/user_logs.txt contents
    assert LOG_PATH.exists(), f"{LOG_PATH} does not exist!"

    with open(LOG_PATH, mode="r", newline="", encoding="utf-8") as f:
        reader = list(csv.reader(f))

    assert len(reader) >= 4, f"Expected at least 4 rows (1 header + 3 attempts), found {len(reader)}"
    header = reader[0]
    assert header == EXPECTED_HEADER, f"Header mismatch: {header} vs {EXPECTED_HEADER}"
    print(f"[PASS] 4. Verified exact 5-column header: {header}")

    # Inspect the last 3 rows
    last_three = reader[-3:]

    # Check Attempt 1 (Success)
    row_success = last_three[0]
    assert row_success[1] == "admin@raven-surveillance.io"
    assert row_success[2] == "[REDACTED]"
    assert row_success[3] == "Lead Administrator"
    assert row_success[4] != ""
    print(f"[PASS] 5. Successful row: {row_success}")

    # Check Attempt 2 (Failed password, known account)
    row_fail_pw = last_three[1]
    assert row_fail_pw[1] == "admin@raven-surveillance.io"
    assert row_fail_pw[2] == "[REDACTED]"
    assert row_fail_pw[3] == "Lead Administrator"
    assert row_fail_pw[4] != ""
    print(f"[PASS] 6. Failed password row: {row_fail_pw}")

    # Check Attempt 3 (Failed, unknown account)
    row_fail_unknown = last_three[2]
    assert row_fail_unknown[1] == "unknown_operative@raven-test.org"
    assert row_fail_unknown[2] == "[REDACTED]"
    assert row_fail_unknown[3] == "UNKNOWN"
    assert row_fail_unknown[4] != ""
    print(f"[PASS] 7. Unknown user row: {row_fail_unknown}")

    # Confirm NO plaintext passwords or hashes anywhere in data/user_logs.txt
    raw_content = LOG_PATH.read_text(encoding="utf-8")
    assert "AdminSecurity2026!" not in raw_content
    assert "IncorrectPassword999!" not in raw_content
    assert "AnyRandomPassword123!" not in raw_content
    assert "$argon2" not in raw_content
    print("[PASS] 8. Confirmed ZERO secret leakage (all passwords redacted, no hashes)")

    print("\nALL USER LOG VERIFICATION TESTS PASSED SUCCESSFULLY!")
