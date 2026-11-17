# AWS deployment

Production runs in Frankfurt (`eu-central-1`) on `https://panelos.io`.

| Layer     | Service         | Notes                                                                 |
| --------- | --------------- | --------------------------------------------------------------------- |
| Web       | Amplify Hosting | Next.js SSR (`WEB_COMPUTE`), monorepo build via repo-root `amplify.yml` |
| API       | App Runner      | Container image from ECR, auto-deploys when `:latest` is pushed       |
| Database  | RDS PostgreSQL  | `db.t4g.micro`, Single-AZ                                             |
| Files     | S3              | Private bucket, SSE-S3, versioning on; browsers upload via presigned URLs |
| Registry  | ECR             | Private repository for the API image                                  |
| Email     | SES             | Transactional mail (invites, password reset, notifications)           |
| Identity  | IAM             | App Runner instance role (S3, SES, Secrets Manager); GitHub OIDC role for CI |

Account-specific identifiers (account id, ARNs, hostnames) are deliberately not recorded in this
repository; they live in the AWS console and in GitHub Actions secrets.

## How a change reaches production

1. Push to `main`.
2. `.github/workflows/cd-api-aws.yml` runs the full CI suite (`ci.yml`) and, only if it passes,
   builds the API image and pushes `:latest` + `:<commit-sha>` to ECR.
3. App Runner sees the new `:latest` and deploys it. The container entrypoint
   (`apps/api/scripts/start.sh`) runs `alembic upgrade head` before starting uvicorn; if the
   migration or the health check fails, App Runner keeps the previous version running.
4. Amplify builds and deploys the web app from the same commit.

Rollback: redeploy a previous image by tag (`:<commit-sha>`) in App Runner; redeploy a previous
build in Amplify. Migrations are additive, so the previous API version keeps working against the
newer schema.

## API configuration (App Runner environment)

| Variable | Value |
| --- | --- |
| `APP_ENV` | `production` (hides `/docs`, refuses to boot with the default `JWT_SECRET`) |
| `APP_URL` | `https://panelos.io` — **printed QR codes encode this origin; never change it casually** |
| `JWT_SECRET` | random 64 hex chars (Secrets Manager reference) |
| `DB_HOST` / `DB_NAME` / `DB_USER` | RDS endpoint and database |
| `DB_PASSWORD` | Secrets Manager reference to the RDS-managed secret (`…:password::`) |
| `DB_APP_ROLE` | `panelos_app` — turns Postgres row-level security on for request traffic |
| `STORAGE_PROVIDER` | `s3` |
| `S3_BUCKET` / `S3_REGION` | bucket name / `eu-central-1` (no access keys: instance role) |
| `EMAIL_PROVIDER` | `ses` |
| `EMAIL_FROM` | `PanelOS <no-reply@panelos.io>` (domain verified in SES) |
| `CORS_ORIGINS` | `https://panelos.io,https://www.panelos.io` |
| `SENTRY_DSN` | optional |

Health checks: `GET /api/v1/health` (liveness) and `GET /api/v1/health/ready` (database reachable).

## Web configuration (Amplify environment)

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_BASE` | `/api/v1` |
| `API_INTERNAL_URL` | the App Runner service URL |
| `NEXT_PUBLIC_APP_URL` | `https://panelos.io` |

Amplify exposes app-level variables at build time only; `next.config.ts` bakes
`API_INTERNAL_URL` into the server bundle so server actions and middleware can reach the API.

## Required one-time settings

These are easy to miss and each one breaks a feature when absent:

- **S3 bucket CORS** — browsers PUT files straight to S3. Without this rule schematic and photo
  uploads fail:

  ```json
  [
    {
      "AllowedOrigins": ["https://panelos.io", "https://www.panelos.io"],
      "AllowedMethods": ["PUT", "GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
  ```

- **Instance role policy** — on the files bucket: `s3:GetObject`, `s3:PutObject`,
  `s3:DeleteObject` (objects) and `s3:ListBucket` (bucket); `ses:SendEmail` for the verified
  identity; `secretsmanager:GetSecretValue` for the referenced secrets.
- **SES** — verify the `panelos.io` domain (DKIM records in DNS) and request production access
  (new accounts start in the sandbox and can only mail verified addresses).
- **First tenant** — on an empty database set `BOOTSTRAP_ENABLED=true`, call
  `POST /api/v1/auth/bootstrap` once with the owner's email and password, then set it back to
  `false`.

## Known gaps (tracked, not yet done)

- RDS is publicly reachable (security group allows 5432 from anywhere). Move it to private
  subnets with an App Runner VPC connector, or at minimum restrict the security group.
- No staging environment; no infrastructure-as-code (everything above was created in the console).
- No CloudWatch alarms or WAF. Backups rely on RDS defaults: confirm the retention period and
  rehearse a restore.
- App Runner is not accepting new customers; plan a move to ECS Fargate (same image, same
  environment variables).
- Rate limiting and the maintenance scheduler are in-process: fine for one instance, add a
  shared store before scaling out.
