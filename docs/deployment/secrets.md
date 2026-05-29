# Secrets Management

**Rule zero:** no secret in git, ever. Not even in private repos, not even encrypted.

## Sources of truth

| Audience | Source | How injected |
|---|---|---|
| Production runtime | **Doppler** project `panelos`, env `prod` | Fly secrets / Vercel env vars synced from Doppler |
| Staging runtime | Doppler env `stg` | same as prod |
| CI | **GitHub OIDC** for cloud creds; Doppler service token for app secrets | per-job, short-lived |
| Local dev | `.env` (gitignored), template `.env.example` | direct file |
| One-off scripts | Doppler CLI: `doppler run -- ./script.sh` | inherits |

## Categories

| Secret | Lifetime | Rotation |
|---|---|---|
| JWT signing keys | 90 days | quarterly, see [rotate-jwt-keys](../operations/runbooks/rotate-jwt-keys.md) |
| DB credentials | per env | yearly or on compromise |
| Storage access keys | per env | yearly |
| Webhook signing secrets | per tenant | on customer request |
| Email API key | per env | yearly |
| Doppler service tokens | 30 days | monthly via scheduled GHA |

## Bootstrap a new environment

1. Create Doppler project + env.
2. Populate from prod template (uses a Doppler config role).
3. Wire GitHub environment to Doppler service token (org secret `DOPPLER_STG_TOKEN`).
4. Wire Fly app: `flyctl secrets import < doppler-export`.

## Alternative: SOPS

Customers self-hosting use **SOPS** with age keys committed under `infra/secrets/`. The Helm chart consumes the decrypted values via a secret reloader. Documented in `infra/k8s/README.md` (scaffold).

## What `pnpm dev` reads

`apps/web` and `apps/api` both read `.env` at workspace root. `pnpm dev` does not touch Doppler. Production servers do not have `.env`.

## What never goes in env vars

- Customer PII.
- Long PEM/cert blocks (use mounted files via Doppler "files" or Vercel secret files).
- Anything > 4 KB.

## Detection

- `gitleaks` in CI on every PR ([pipeline](../ci-cd/pipeline.md)).
- Doppler audit log shipped to Grafana.
