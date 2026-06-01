"""Minimal email sender.

Uses SMTP when configured (``SMTP_HOST`` set to a non-localhost host *or*
credentials present); otherwise logs the message so dev/unconfigured flows
never fail. The invite + resend paths call :func:`send_email` so an invitation
always "sends" (real or logged).
"""

from __future__ import annotations

import smtplib
from email.message import EmailMessage

from panelos_api.config import get_settings
from panelos_api.core.logging import get_logger

_log = get_logger("panelos_api.email")


def _smtp_configured(host: str, user: str | None) -> bool:
    """True when SMTP looks deliverable (real host or auth credentials)."""

    return bool(user) or host not in ("", "localhost", "127.0.0.1")


def send_email(*, to: str, subject: str, body: str, html: str | None = None) -> bool:
    """Send an email, or log it when SMTP is not configured.

    Returns True when delivered via SMTP, False when only logged. Never raises
    on a delivery failure — it logs and returns False so callers don't break.
    """

    settings = get_settings()
    if not _smtp_configured(settings.SMTP_HOST, settings.SMTP_USER):
        _log.info("email_logged", to=to, subject=subject, body=body)
        return False

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    if html:
        msg.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            if server.has_extn("starttls"):
                server.starttls()
                server.ehlo()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        _log.info("email_sent", to=to, subject=subject)
        return True
    except Exception as exc:  # never break the caller on delivery
        _log.warning("email_send_failed", to=to, subject=subject, error=str(exc))
        return False


def send_invite_email(*, to: str, company_name: str, accept_url: str, role: str) -> bool:
    """Send (or log) a PanelOS invitation email."""

    subject = f"You're invited to {company_name} on PanelOS"
    body = (
        f"You have been invited to join {company_name} on PanelOS as {role}.\n\n"
        f"Accept your invitation and set a password:\n{accept_url}\n\n"
        "This link expires in 14 days."
    )
    return send_email(to=to, subject=subject, body=body)
