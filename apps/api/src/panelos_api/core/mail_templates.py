"""Transactional email copy (Turkish + English) and a single HTML layout.

``build(kind, locale, to=..., **ctx)`` returns a ready :class:`Mail`. Every
template is: subject, a heading, one or two paragraphs, an optional button.
The same catalog feeds in-app notification titles (see ``notification_text``).
"""

from __future__ import annotations

from html import escape
from typing import Any

from panelos_api.core.email import Mail
from panelos_api.core.i18n import normalize_locale

# kind -> locale -> (subject, heading, body, button label)
_T: dict[str, dict[str, tuple[str, str, str, str]]] = {
    "invite": {
        "tr": (
            "{company} sizi PanelOS'a davet etti",
            "PanelOS'a davet edildiniz",
            "{company}, sizi PanelOS'ta {role} rolüyle ekibine davet etti. "
            "Daveti kabul edip parolanızı belirlemek için aşağıdaki bağlantıyı kullanın. "
            "Bağlantı {days} gün geçerlidir.",
            "Daveti kabul et",
        ),
        "en": (
            "{company} invited you to PanelOS",
            "You're invited to PanelOS",
            "{company} invited you to join their team on PanelOS as {role}. "
            "Use the link below to accept and set your password. "
            "The link is valid for {days} days.",
            "Accept invitation",
        ),
    },
    "password_reset": {
        "tr": (
            "PanelOS parola sıfırlama",
            "Parolanızı sıfırlayın",
            "PanelOS hesabınız için parola sıfırlama talebi aldık. Yeni parola belirlemek için "
            "aşağıdaki bağlantıyı kullanın. Bağlantı {minutes} dakika geçerlidir. Bu talebi siz "
            "yapmadıysanız bu e-postayı yok sayabilirsiniz; parolanız değişmez.",
            "Yeni parola belirle",
        ),
        "en": (
            "Reset your PanelOS password",
            "Reset your password",
            "We received a request to reset the password for your PanelOS account. Use the link "
            "below to choose a new one. The link is valid for {minutes} minutes. If you didn't "
            "ask for this you can ignore this email; your password stays the same.",
            "Choose a new password",
        ),
    },
    "password_changed": {
        "tr": (
            "PanelOS parolanız değiştirildi",
            "Parolanız değiştirildi",
            "PanelOS hesabınızın parolası az önce değiştirildi ve diğer oturumlar kapatıldı. "
            "Bu işlemi siz yapmadıysanız hemen parolanızı sıfırlayın ve yöneticinize haber verin.",
            "Parolayı sıfırla",
        ),
        "en": (
            "Your PanelOS password was changed",
            "Your password was changed",
            "The password of your PanelOS account was just changed and other sessions were "
            "signed out. If this wasn't you, reset your password now and tell your administrator.",
            "Reset password",
        ),
    },
    "revision_submitted": {
        "tr": (
            "Onay bekliyor: {tag} Rev {rev}",
            "Revizyon onayınızı bekliyor",
            "{actor}, {tag} ({panel}) panosu için Rev {rev} revizyonunu onaya gönderdi.",
            "Revizyonu incele",
        ),
        "en": (
            "Awaiting approval: {tag} Rev {rev}",
            "A revision is waiting for your approval",
            "{actor} submitted Rev {rev} of panel {tag} ({panel}) for approval.",
            "Review revision",
        ),
    },
    "revision_approved": {
        "tr": (
            "Onaylandı: {tag} Rev {rev}",
            "Revizyon onaylandı",
            "{actor}, {tag} ({panel}) panosunun Rev {rev} revizyonunu onayladı. "
            "Bu revizyon artık sahada QR ile görünen güncel sürümdür.",
            "Panoyu aç",
        ),
        "en": (
            "Approved: {tag} Rev {rev}",
            "Revision approved",
            "{actor} approved Rev {rev} of panel {tag} ({panel}). "
            "It is now the current version shown in the field via QR.",
            "Open panel",
        ),
    },
    "revision_rejected": {
        "tr": (
            "Reddedildi: {tag} Rev {rev}",
            "Revizyon reddedildi",
            "{actor}, {tag} ({panel}) panosunun Rev {rev} revizyonunu reddetti.{reason}",
            "Revizyonu aç",
        ),
        "en": (
            "Rejected: {tag} Rev {rev}",
            "Revision rejected",
            "{actor} rejected Rev {rev} of panel {tag} ({panel}).{reason}",
            "Open revision",
        ),
    },
    "issue_reported": {
        "tr": (
            "Yeni arıza bildirimi: {tag} — {title}",
            "Yeni arıza bildirimi",
            "{actor}, {tag} ({panel}) panosu için bir arıza bildirdi: “{title}”. Önem: {severity}.",
            "Arızayı aç",
        ),
        "en": (
            "New issue: {tag} — {title}",
            "New issue reported",
            "{actor} reported an issue on panel {tag} ({panel}): “{title}”. Severity: {severity}.",
            "Open issue",
        ),
    },
    "issue_assigned": {
        "tr": (
            "Size atandı: {tag} — {title}",
            "Bir arıza size atandı",
            "{actor}, {tag} ({panel}) panosundaki “{title}” arızasını size atadı.",
            "Arızayı aç",
        ),
        "en": (
            "Assigned to you: {tag} — {title}",
            "An issue was assigned to you",
            "{actor} assigned you the issue “{title}” on panel {tag} ({panel}).",
            "Open issue",
        ),
    },
    "issue_resolved": {
        "tr": (
            "Çözüldü: {tag} — {title}",
            "Arıza çözüldü",
            "{actor}, {tag} ({panel}) panosundaki “{title}” arızasını çözüldü olarak işaretledi.",
            "Arızayı aç",
        ),
        "en": (
            "Resolved: {tag} — {title}",
            "Issue resolved",
            "{actor} marked the issue “{title}” on panel {tag} ({panel}) as resolved.",
            "Open issue",
        ),
    },
    "maintenance_due": {
        "tr": (
            "Bakım zamanı: {tag} — {title}",
            "Planlı bakım zamanı geldi",
            "{tag} ({panel}) panosu için “{title}” bakımının tarihi: {due}.",
            "Panoyu aç",
        ),
        "en": (
            "Maintenance due: {tag} — {title}",
            "Scheduled maintenance is due",
            "“{title}” for panel {tag} ({panel}) is due on {due}.",
            "Open panel",
        ),
    },
}

_FOOTER = {
    "tr": "Bu e-posta PanelOS tarafından otomatik gönderildi.",
    "en": "This email was sent automatically by PanelOS.",
}


class _Safe(dict[str, Any]):
    """format_map helper: a missing placeholder renders empty instead of raising."""

    def __missing__(self, key: str) -> str:
        return ""


def texts(kind: str, locale: str | None, **ctx: Any) -> tuple[str, str, str, str]:
    """(subject, heading, body, button) for ``kind`` in ``locale``."""

    loc = normalize_locale(locale)
    subject, heading, body, button = _T[kind][loc]
    safe = _Safe({k: ("" if v is None else str(v)) for k, v in ctx.items()})
    return (
        subject.format_map(safe),
        heading.format_map(safe),
        body.format_map(safe),
        button.format_map(safe),
    )


def _html(heading: str, body: str, button: str, url: str | None, footer: str) -> str:
    cta = (
        f'<p style="margin:28px 0 8px"><a href="{escape(url, quote=True)}" '
        'style="background:#e8590c;color:#ffffff;text-decoration:none;font-weight:600;'
        f'padding:12px 20px;border-radius:8px;display:inline-block">{escape(button)}</a></p>'
        f'<p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all">'
        f"{escape(url)}</p>"
        if url
        else ""
    )
    return (
        '<!doctype html><html><body style="margin:0;background:#f4f5f7;'
        'font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td '
        'align="center" style="padding:32px 16px"><table role="presentation" width="100%" '
        'style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb">'
        '<tr><td style="padding:28px 32px"><div style="font-size:14px;font-weight:700;'
        'letter-spacing:.02em;color:#e8590c;margin-bottom:20px">PanelOS</div>'
        f'<h1 style="font-size:20px;margin:0 0 12px">{escape(heading)}</h1>'
        f'<p style="font-size:15px;line-height:1.6;margin:0;color:#374151">{escape(body)}</p>'
        f"{cta}</td></tr></table>"
        f'<p style="font-size:12px;color:#9ca3af;margin:16px 0 0">{escape(footer)}</p>'
        "</td></tr></table></body></html>"
    )


def build(kind: str, locale: str | None, *, to: str, url: str | None = None, **ctx: Any) -> Mail:
    """Compose the message for ``kind`` (see ``_T``) addressed to ``to``."""

    loc = normalize_locale(locale)
    subject, heading, body, button = texts(kind, loc, **ctx)
    text = f"{heading}\n\n{body}\n" + (f"\n{button}: {url}\n" if url else "")
    return Mail(
        to=to, subject=subject, text=text, html=_html(heading, body, button, url, _FOOTER[loc])
    )
