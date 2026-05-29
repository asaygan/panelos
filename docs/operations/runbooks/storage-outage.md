# Runbook — Storage Outage

**Symptom:** uploads fail; PDF / QR / label fetches return 5xx.
**Severity:** Sev-2 (degraded but app usable for metadata).

## Triage

1. Check Cloudflare R2 status (or AWS S3 / Azure status per `STORAGE_PROVIDER`).
2. Test from API host: `curl -I "$STORAGE_PRESIGNED_URL"` — what status?
3. Check for credential expiry: `STORAGE_ACCESS_KEY` rotated recently?

## Mitigation paths

### Provider incident

- Acknowledge in Statuspage as "Degraded — uploads paused".
- Disable upload UI via feature flag `flags:env:upload_enabled=false`.
- Read path stays up; presigned GET retries may succeed intermittently.

### Credential issue

```bash
doppler secrets get STORAGE_SECRET_KEY --plain --project panelos --config prod
flyctl secrets set STORAGE_SECRET_KEY=...
```

### Bucket misconfig

- Check CORS for the web origin.
- Check public-read policy on `qr/*` if you’ve enabled CDN passthrough.

## Failover (optional)

PanelOS supports a secondary `STORAGE_PROVIDER_FALLBACK` env var. Setting it routes writes to fallback and asynchronously reconciles when primary returns. Disabled by default; only enable for prolonged outages.

## After mitigation

- Re-enable upload flag.
- Reconcile any pending `label_batches` stuck in `rendering`.
- Verify `pdf_files.sha256` against re-fetched objects on a sample of recent uploads.
