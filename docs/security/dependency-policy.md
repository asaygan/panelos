# Dependency Policy

PanelOS pins direct dependencies, allows patch/minor updates via Renovate, and audits weekly.

## Pinning

- **Direct deps** pinned by exact version in `pyproject.toml` and `package.json`.
- **Transitive deps** locked in `uv.lock` / `pnpm-lock.yaml`.
- Lockfiles are committed and updated atomically.

## Renovate

`renovate.json` config:

- Group: minor + patch updates batched weekly to a single PR.
- Major updates create individual PRs flagged `dependencies/major`.
- Security advisories create immediate PRs with `priority: high` label.
- `prHourlyLimit: 4` to avoid flood.

## Allowlist

- Direct deps must be on the allowlist (`docs/security/allowed-deps.txt`, future). A new direct dep requires:
  - Quick triage: maintainer activity, last release date, license, alternatives.
  - Approval in PR by security lead.
- Removed direct deps must be removed from the allowlist.

## Forbidden licenses

GPL-3.0 and AGPL-3.0 for libraries linked into the API or web bundles. Acceptable: MIT, Apache-2.0, BSD-2/3, MPL-2.0, ISC.

## Weekly audit

- `pip-audit` against the API.
- `pnpm audit --prod` against the web bundles.
- `trivy fs` against the repo + built Docker images.
- Reports archived in Grafana; high/critical findings create issues automatically.

## CVE response time

| Severity | SLA to patch / mitigate |
|---|---|
| Critical (CVSS 9.0+) | 24 hours |
| High (7.0–8.9) | 7 days |
| Medium (4.0–6.9) | 30 days |
| Low (< 4.0) | next quarterly sweep |

## Supply chain

- All Docker bases are official images pinned by digest.
- SBOMs generated via `docker buildx --sbom=true` on every build.
- Signed releases (cosign) — planned post-MVP.
