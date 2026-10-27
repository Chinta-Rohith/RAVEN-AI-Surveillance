"""
RAVEN Initial Administrator Provisioning Tool
Securely provisions or promotes an administrator account via CLI without hardcoded credentials.

Usage:
    python -m backend.auth.provision_admin --email admin@raven-surveillance.io --name "Lead Administrator" --password "SecureAdmin123!"
"""

import sys
import uuid
import asyncio
import argparse
import getpass
from backend.auth.db import auth_db
from backend.auth.security import hash_password, normalize_email, validate_password_strength


async def provision_admin(name: str, email: str, password: str) -> None:
    """Provisions a new administrator or promotes an existing account to admin."""
    # Ensure database tables exist
    await auth_db.init_auth_db()

    norm_email = normalize_email(email)
    valid_pw, pw_err = validate_password_strength(password)
    if not valid_pw:
        print(f"[ERROR] Password does not meet security requirements: {pw_err}")
        sys.exit(1)

    pw_hash = hash_password(password)

    conn = await auth_db.get_connection()
    try:
        async with conn.execute("SELECT id, role FROM users WHERE email = ?", (norm_email,)) as cursor:
            existing = await cursor.fetchone()

        if existing:
            # Promote existing user to administrator and update password
            await conn.execute(
                """
                UPDATE users
                SET name = ?, password_hash = ?, role = 'admin', is_verified = 1, account_status = 'active'
                WHERE id = ?
                """,
                (name.strip(), pw_hash, existing["id"])
            )
            await conn.commit()
            print(f"[SUCCESS] Existing account '{norm_email}' has been promoted to Administrator.")
        else:
            # Create fresh administrator account
            user_id = str(uuid.uuid4())
            await conn.execute(
                """
                INSERT INTO users (id, name, email, password_hash, role, is_verified, account_status)
                VALUES (?, ?, ?, ?, 'admin', 1, 'active')
                """,
                (user_id, name.strip(), norm_email, pw_hash)
            )
            # Create default workspace config
            await conn.execute(
                """
                INSERT INTO client_configs (user_id, workspace_name)
                VALUES (?, 'Admin Master Workspace')
                """,
                (user_id,)
            )
            await conn.commit()
            print(f"[SUCCESS] New Administrator '{norm_email}' provisioned successfully (ID: {user_id}).")
    finally:
        await conn.close()


def main():
    parser = argparse.ArgumentParser(description="Provision RAVEN Administrator Account")
    parser.add_argument("--name", type=str, default="RAVEN Administrator", help="Admin Full Name")
    parser.add_argument("--email", type=str, help="Admin Email Address")
    parser.add_argument("--password", type=str, help="Admin Password (leave blank to prompt securely)")

    args = parser.parse_args()

    email = args.email
    if not email:
        email = input("Enter Administrator Email: ").strip()

    password = args.password
    if not password:
        password = getpass.getpass("Enter Administrator Password: ")
        confirm = getpass.getpass("Confirm Administrator Password: ")
        if password != confirm:
            print("[ERROR] Passwords do not match.")
            sys.exit(1)

    asyncio.run(provision_admin(name=args.name, email=email, password=password))


if __name__ == "__main__":
    main()
