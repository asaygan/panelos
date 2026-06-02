# AWS deployment — App Runner + RDS + S3 + Amplify

Target topology (Frankfurt, `eu-central-1`):

| Layer    | Service           | Notes                                                              |
| -------- | ----------------- | ------------------------------------------------------------------ |
| Web      | Amplify Hosting   | Next.js, monorepo root build via `amplify.yml`                     |
| API      | App Runner        | Container image from ECR, auto-deploy on `:latest` push            |
| DB       | RDS PostgreSQL    | `db.t4g.micro`, Single-AZ, public access + SG allowlist            |
| Storage  | S3                | `panelos-files-prod`, private, SSE-S3                              |
| Registry | ECR               | Private repo `panelos-api`                                         |
| Identity | IAM Role          | App Runner instance role → S3 access (no static keys)              |

## One-time setup

1. **Upgrade AWS plan** to Pay-as-you-go (Free Plan blocks production RDS).
2. **S3 bucket** `panelos-files-prod` in `eu-central-1`, SSE-S3, versioning on, public access blocked.
3. **RDS** `panelos-prod`: PostgreSQL 18, `db.t4g.micro`, 20 GB gp3, auto-generated master password, public access on. Save the endpoint + password.
4. **ECR repo** `panelos-api`. Note the URI.
5. **IAM role for App Runner instance**: trust `tasks.apprunner.amazonaws.com`, attach a policy allowing `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` on `arn:aws:s3:::panelos-files-prod/*`.
6. **IAM role for GitHub OIDC** (for `cd-api-aws.yml`): trust `token.actions.githubusercontent.com` with `repo:asaygan/panelos:ref:refs/heads/main`, policy = ECR push to `panelos-api`.
7. **GitHub secrets**: `AWS_ROLE_ARN`, `AWS_REGION=eu-central-1`, `ECR_REPOSITORY=707578706524.dkr.ecr.eu-central-1.amazonaws.com/panelos-api`.

## App Runner service

- Source: Container registry → Amazon ECR → `panelos-api:latest`
- Deployment: Automatic (on ECR push)
- Service name: `panelos-api`
- vCPU/memory: 1 vCPU / 2 GB (smallest)
- Port: `8000`
- Instance role: the IAM role from step 5
- Environment variables (no static AWS keys):
  - `APP_ENV=production`
  - `DATABASE_URL=postgresql+asyncpg://postgres:<pw>@<rds-endpoint>:5432/postgres`
  - `DATABASE_SYNC_URL=postgresql+psycopg://postgres:<pw>@<rds-endpoint>:5432/postgres`
  - `JWT_SECRET=<gen>`
  - `APP_URL=https://<amplify-domain>`
  - `NEXT_PUBLIC_APP_URL=https://<amplify-domain>`
  - `STORAGE_PROVIDER=s3`
  - `S3_BUCKET=panelos-files-prod`
  - `S3_REGION=eu-central-1`
  - `STORAGE_PUBLIC_BASE_URL=` (leave empty — boto3 mints signed S3 URLs)
  - `RATE_LIMIT_ENABLED=true`

## Amplify Hosting

- Connect GitHub `asaygan/panelos`, branch `main`.
- Monorepo: yes, app root `apps/web`. Uses repo-root `amplify.yml`.
- Environment variables:
  - `NEXT_PUBLIC_API_BASE=/api/v1`
  - `API_INTERNAL_URL=https://<app-runner-url>`
  - `NEXT_PUBLIC_APP_URL=https://<amplify-domain>`

## Data migration (Supabase → RDS)

```bash
# Dump
PGPASSWORD='<supabase-pw>' pg_dump \
  -h <supabase-pooler> -U postgres -d postgres \
  --no-owner --no-privileges --format=custom > panelos.dump

# Restore
PGPASSWORD='<rds-pw>' pg_restore \
  -h <rds-endpoint> -U postgres -d postgres \
  --no-owner --no-privileges --clean --if-exists \
  panelos.dump
```

Verify row counts:

```sql
SELECT 'users' tbl, count(*) FROM users
UNION ALL SELECT 'panels', count(*) FROM panels
UNION ALL SELECT 'projects', count(*) FROM projects
UNION ALL SELECT 'system_groups', count(*) FROM system_groups
UNION ALL SELECT 'cabinets', count(*) FROM cabinets;
```

After cutover and 48h soak, decommission Railway + Vercel + Supabase Storage.
