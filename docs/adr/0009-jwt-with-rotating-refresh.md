# ADR-0009: JWT access tokens with rotating refresh

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

The web app, future mobile app, and future third-party API consumers all need stateless authentication. Long-lived bearer tokens are dangerous; opaque session tokens at the API are awkward for mobile.

## Decision

- **Access token:** RS256-signed JWT, 15-minute TTL, carries `sub` (user id), `tnt` (active tenant id), `rol` (role), `pid` (membership id).
- **Refresh token:** opaque random 32-byte token, 7-day TTL, **stored hashed in `sessions`**, **rotated on use** — every refresh issues a new refresh and invalidates the old.
- Refresh reuse detection: presenting an old refresh after rotation marks the entire session chain compromised and forces re-login.
- Signing key rotation handled by JWK set with `kid` headers; see runbook [rotate-jwt-keys](../operations/runbooks/rotate-jwt-keys.md).

## Consequences

**Positive**
- Stateless verification on every request.
- Compromised refresh tokens are detectable.
- Mobile can store the refresh in secure enclave; web stores both in HTTP-only Secure cookies.

**Negative**
- Forced 15-minute revocation latency; for instant kill, ops use the `sessions.revoked_at` column which the auth dep checks on each refresh.
- Key rotation is a multi-step ceremony.

## Alternatives considered

1. **Opaque session tokens only** — requires DB lookup on every request; the access JWT path avoids that.
2. **Long-lived JWTs without refresh** — unacceptable revocation latency.
