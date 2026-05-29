# Alerting

SLO-based alerts to **PagerDuty**. We page on burn rate, not threshold crossings.

## SLOs

| Service | SLI | SLO | Window |
|---|---|---|---|
| API | availability (non-5xx ratio on healthy paths) | 99.9% | 30 days rolling |
| API | read latency p95 | < 300 ms | 30 days rolling |
| API | upload finalize p95 | < 800 ms | 30 days rolling |
| QR resolver | availability | 99.95% | 30 days rolling |
| Worker | job success ratio | 99.5% | 7 days rolling |
| DB | query error rate | < 0.1% | 7 days rolling |

## Alert routing

| Severity | Trigger | Action |
|---|---|---|
| Sev-1 | burn rate × 14.4 over 1h (consumes >2% of 30d budget) | Page primary on-call immediately |
| Sev-2 | burn rate × 6 over 6h | Page primary on-call during business hours |
| Sev-3 | burn rate × 1 over 3d | Ticket, address next sprint |

Plus categorical alerts:

| Trigger | Severity |
|---|---|
| Audit chain mismatch on verifier job | Sev-1 |
| Failed deploy with rollback triggered | Sev-2 |
| Backup job failed (single occurrence) | Sev-2 |
| Backup job failed 2 consecutive runs | Sev-1 |
| Webhook delivery > 1000 events queued > 30m | Sev-3 |
| Storage provider 5xx > 5% for 10m | Sev-2 |

## On-call

- Two-engineer rotation, weekly handoff Mondays 10:00 local.
- Primary acks within 5 min, mitigates within 30 min target.
- Secondary covers if primary doesn’t ack within 10 min.

## Quiet hours

None for Sev-1. Sev-2 paged only 08:00–20:00 local (engineer’s timezone). Sev-3 never pages.

## Postmortems

Mandatory for Sev-1 and Sev-2. Template in [incident-response](./incident-response.md).
