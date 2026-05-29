# Security Policy

## Reporting a vulnerability

If you discover a security issue in PanelOS, please **do not open a public issue**. Email `security@panelos.app` with:

- A description of the issue.
- Steps to reproduce or proof-of-concept.
- The affected version / commit.
- Your contact details for follow-up.

We acknowledge reports within **2 business days** and aim to ship a fix within **30 days** for critical issues, **90 days** for non-critical.

## Supported versions

| Version | Status |
|---|---|
| `main` | Active |
| `0.1.x` | Active (MVP) |

## Disclosure policy

- We follow coordinated disclosure.
- Reporters credited in [CHANGELOG.md](CHANGELOG.md) and our hall of fame after fix is shipped, unless they prefer anonymity.
- See [docs/security/vulnerability-disclosure.md](docs/security/vulnerability-disclosure.md) for the full policy.

## Hardening

- Argon2id password hashing.
- JWT RS256 with rotating refresh tokens.
- TOTP MFA available (enforceable per org).
- PostgreSQL Row-Level Security per tenant.
- All file URLs signed and short-lived.
- Audit log is hash-chained (tamper-evident).
- See [docs/security/](docs/security/) for the full picture.
