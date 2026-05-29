# Domains and TLS

## Domains

| Surface | Hostname | Provider |
|---|---|---|
| Web app | `panelos.app` | Vercel |
| API | `api.panelos.app` | Fly.io |
| Public QR | `q.panelos.app` (or `panelos.app/q/...`) | Vercel route handler |
| Status | `status.panelos.app` | Statuspage |
| Docs | `docs.panelos.app` (future) | Vercel |

DNS is hosted at **Cloudflare**. CNAME flattening on the apex; AAAA where supported.

## TLS

- **Vercel** issues and renews TLS certs automatically; apex enforced HTTPS.
- **Fly.io** issues LetsEncrypt for `api.panelos.app` and any custom domain we accept.
- **HSTS** with `max-age=63072000; includeSubDomains; preload` on the apex; we are on the HSTS preload list after 6 months of stable HTTPS.

## Custom domains

Enterprise tenants can map their own apex (`panels.acme.com`) to a tenant-aware entry:

1. Customer creates `CNAME panels.acme.com -> tenant.panelos.app`.
2. Admin enables the domain in Settings → Branding.
3. Vercel/Fly provisions the TLS cert (CNAME-based domain verification).
4. Public QR URLs render the custom host if set.

## Certificate transparency monitoring

We subscribe to CT logs for `*.panelos.app` and customer custom domains; any unexpected cert issuance pages an on-call.

## Redirects

| From | To | Code |
|---|---|---|
| `http://*` | `https://*` | 301 |
| `www.panelos.app` | `panelos.app` | 301 |
| `panelos.com` (if owned) | `panelos.app` | 301 |
