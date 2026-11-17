"""Outbound email.

Provider is chosen by ``EMAIL_PROVIDER``:

* ``log``  — development: the message is logged, nothing is sent.
* ``smtp`` — any SMTP relay (``SMTP_*`` settings).
* ``ses``  — AWS SES v2 using the instance role (no credentials in env).

Sending never raises: a mail outage must not fail the request that triggered
the mail. Failures are logged and reported through the return value.
"""

from __future__ import annotations

import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from functools import lru_cache
from typing import Any

from anyio import to_thread

from panelos_api.config import get_settings
from panelos_api.core.logging import get_logger

_log = get_logger("panelos_api.email")


@dataclass(slots=True, frozen=True)
class Mail:
    to: str
    subject: str
    text: str
    html: str | None = None


@lru_cache(maxsize=1)
def _ses_client(region: str) -> Any:
    import boto3

    return boto3.client("sesv2", region_name=region)


def _send_ses(mail: Mail) -> None:
    s = get_settings()
    body: dict[str, Any] = {"Text": {"Data": mail.text, "Charset": "UTF-8"}}
    if mail.html:
        body["Html"] = {"Data": mail.html, "Charset": "UTF-8"}
    _ses_client(s.SES_REGION or s.S3_REGION).send_email(
        FromEmailAddress=s.EMAIL_FROM,
        Destination={"ToAddresses": [mail.to]},
        Content={"Simple": {"Subject": {"Data": mail.subject, "Charset": "UTF-8"}, "Body": body}},
    )


def _send_smtp(mail: Mail) -> None:
    s = get_settings()
    msg = EmailMessage()
    msg["From"] = s.EMAIL_FROM
    msg["To"] = mail.to
    msg["Subject"] = mail.subject
    msg.set_content(mail.text)
    if mail.html:
        msg.add_alternative(mail.html, subtype="html")
    with smtplib.SMTP(s.SMTP_HOST, s.SMTP_PORT, timeout=15) as server:
        server.ehlo()
        if server.has_extn("starttls"):
            server.starttls()
            server.ehlo()
        if s.SMTP_USER and s.SMTP_PASSWORD:
            server.login(s.SMTP_USER, s.SMTP_PASSWORD)
        server.send_message(msg)


def send_mail(mail: Mail) -> bool:
    """Deliver (or log) one message. Returns True only when actually sent."""

    provider = get_settings().EMAIL_PROVIDER
    if provider == "log":
        # Never log the body: it carries one-time links (invite / password reset).
        _log.info("email_logged", to=mail.to, subject=mail.subject)
        return False
    try:
        if provider == "ses":
            _send_ses(mail)
        else:
            _send_smtp(mail)
    except Exception as exc:
        _log.warning("email_send_failed", provider=provider, to=mail.to, error=str(exc))
        return False
    _log.info("email_sent", provider=provider, to=mail.to, subject=mail.subject)
    return True


async def send_mail_async(mail: Mail) -> bool:
    """Non-blocking variant: the (sync) provider call runs in a worker thread."""

    return await to_thread.run_sync(send_mail, mail)
