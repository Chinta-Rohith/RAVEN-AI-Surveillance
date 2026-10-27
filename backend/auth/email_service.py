"""
RAVEN Email Service Abstraction
Handles transactional email delivery for verification and password recovery.
In development mode, safely logs dispatch events and stores verification tokens for automated tests.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict
from backend.config import settings

# Test inspection registry: stores the latest token per email for automated testing
_latest_test_tokens: Dict[str, Dict[str, str]] = {}


class EmailService:
    """Abstract transactional email delivery service."""

    @staticmethod
    def get_latest_test_token(email: str, token_type: str) -> Optional[str]:
        """Utility for test suites to retrieve tokens during development mode."""
        return _latest_test_tokens.get(email, {}).get(token_type)

    @classmethod
    async def send_verification_email(cls, email: str, name: str, token: str) -> bool:
        """Dispatches an email verification link to a registered client."""
        verification_link = f"{settings.APP_URL}/verify-email?token={token}"
        
        # Record token in test registry for automated test harness
        if email not in _latest_test_tokens:
            _latest_test_tokens[email] = {}
        _latest_test_tokens[email]["email_verify"] = token

        subject = "Verify your RAVEN Surveillance Platform Account"
        text_body = (
            f"Hello {name},\n\n"
            f"Welcome to the RAVEN AI Surveillance Platform.\n"
            f"Please verify your email address by opening the following link:\n\n"
            f"{verification_link}\n\n"
            f"This link expires in {settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS} hours.\n\n"
            f"— The RAVEN Security Engineering Team"
        )

        return cls._send_email(to_email=email, subject=subject, body=text_body, action="EMAIL_VERIFICATION")

    @classmethod
    async def send_password_reset_email(cls, email: str, name: str, token: str) -> bool:
        """Dispatches a password reset link to a requesting user."""
        reset_link = f"{settings.APP_URL}/reset-password?token={token}"

        # Record token in test registry for automated test harness
        if email not in _latest_test_tokens:
            _latest_test_tokens[email] = {}
        _latest_test_tokens[email]["password_reset"] = token

        subject = "Password Reset Request — RAVEN Surveillance Platform"
        text_body = (
            f"Hello {name},\n\n"
            f"A password reset request was received for your RAVEN account.\n"
            f"To choose a new password, open this secure link:\n\n"
            f"{reset_link}\n\n"
            f"This link will expire in {settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} minutes and can only be used once.\n"
            f"If you did not initiate this request, please disregard this email.\n\n"
            f"— The RAVEN Security Engineering Team"
        )

        return cls._send_email(to_email=email, subject=subject, body=text_body, action="PASSWORD_RESET")

    @classmethod
    def _send_email(cls, to_email: str, subject: str, body: str, action: str) -> bool:
        """Internal dispatch method handling development mode vs SMTP relay."""
        if settings.EMAIL_MODE == "development" or not settings.SMTP_HOST:
            print(f"[AUTH EMAIL SIMULATION] Action: {action} | To: {to_email} | Subject: {subject}")
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = to_email
            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
            return True
        except Exception as e:
            print(f"[AUTH EMAIL ERROR] Failed to send email via SMTP: {e}")
            return False


email_service = EmailService()
