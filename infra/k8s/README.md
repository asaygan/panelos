# Kubernetes

Future. A Helm chart will live here.

For MVP we deploy directly:

- **web** -> Vercel (`.github/workflows/cd-web.yml`)
- **api** + **worker** -> Fly.io (`.github/workflows/cd-api.yml`)
- **postgres** -> Neon
- **redis** -> Upstash
- **object storage** -> Cloudflare R2 (S3-compatible)

We will revisit Kubernetes once the API horizontally scales beyond what Fly Machines
gives us cheaply, or when a customer requires self-hosting.

## Planned layout (sketch)

```
infra/k8s/
  charts/
    panelos/
      Chart.yaml
      values.yaml
      values.staging.yaml
      values.prod.yaml
      templates/
        api-deployment.yaml
        api-service.yaml
        web-deployment.yaml
        worker-deployment.yaml
        ingress.yaml
        configmap.yaml
        secret-external.yaml   # via External Secrets Operator
```
