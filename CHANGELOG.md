# Changelog

All notable changes to PanelOS are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Monorepo bootstrap (`apps/web`, `apps/api`, `apps/mobile`, `packages/*`).
- FastAPI backend scaffold: config, auth, panels, revisions, files, QR, labels, RBAC, storage abstraction, audit log.
- Next.js 15 web app implementing all 9 MVP screens from the Claude Design handoff: Login, Dashboard, Panel list, Panel detail, Revisions, Schematic viewer, QR Labels, Settings, Users.
- PostgreSQL schema with row-level security per tenant, immutable QR identity, revision approval state machine.
- Storage provider abstraction with `local`, `s3`, `supabase`, `azure` implementations.
- Label renderers (`engraved`, `print-bw`) with adapter seams for future ZPL / Brother printers.
- Flutter mobile skeleton.
- Docker Compose stack (postgres, redis, minio, mailhog, api, web).
- GitHub Actions: `ci.yml`, `security.yml`, `cd-web.yml`, `cd-api.yml`, `release.yml`.
- Complete documentation tree (architecture, ADRs, API, database, design, development, deployment, operations, security, ci-cd, future).

## [0.1.0] — TBD

Initial MVP release.
