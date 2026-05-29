# Secrets Management (Security View)

Operational details live in [deployment/secrets](../deployment/secrets.md). This page records the *policy*.

## Principles

1. **No secrets in git.** Detected by `gitleaks` in CI and `pre-commit` hook.
2. **Least privilege.** Every secret has a single consumer and a single owner.
3. **Short-lived where possible.** Doppler service tokens rotated monthly. OIDC tokens are per-job.
4. **Rotated on a schedule.** See table.
5. **Rotated immediately on suspected compromise.** See [rotate-jwt-keys](../operations/runbooks/rotate-jwt-keys.md) for the JWT case; analogous procedures for DB, storage.

## Rotation schedule

| Secret | Cadence |
|---|---|
| JWT signing keys | Quarterly |
| Database passwords | Yearly |
| Storage access keys | Yearly |
| Email API key | Yearly |
| Webhook signing secrets (per tenant) | On customer request |
| Doppler service tokens | Monthly |
| OIDC trust between GH and cloud | Reviewed yearly |

## Owners

| Secret category | Owner |
|---|---|
| Auth (JWT, OAuth) | Security lead |
| Infra (DB, Redis, Storage) | Platform lead |
| Third-party APIs (Resend, Stripe) | Founding engineer |
| Customer-supplied (webhook secrets) | Customer success |

## Customer-side secrets

Per-tenant secrets (webhook signing, future API keys) are stored hashed in `api_keys.secret_hash` and revealed exactly once at creation.

## Access logging

- Doppler access events shipped to Grafana.
- Cloud provider secret reads logged via CloudTrail / equivalent.
- Anomaly: secret read outside CI / runtime → page security on-call.

## Breakglass

A sealed envelope (physical or 1Password vault with split keys) contains:
- Doppler root recovery code.
- Cloudflare zone owner credentials.
- Fly org owner recovery codes.
- GitHub org owner recovery codes.

Opening requires two named individuals. Opening is itself an incident.
