# Testing

Pyramid: lots of fast unit tests, fewer integration tests with a real DB, a handful of e2e Playwright tests on critical flows.

## API (`apps/api`)

### Unit

- Pure-function services and helpers.
- Repositories faked via `BaseRepositoryFake`.
- Run: `uv run pytest tests/unit -x`.

### Integration

- Real Postgres via [`testcontainers-python`](https://testcontainers-python.readthedocs.io/), real Redis, fake storage.
- One container per session; transactions rolled back per test.
- Covers: revision state machine, RLS enforcement, audit-chain integrity, presign + finalize.
- Run: `uv run pytest tests/integration -x`.

### Fixtures

In `tests/conftest.py`:

- `pg_container` — session-scoped Postgres testcontainer.
- `db_session` — function-scoped, transactional rollback.
- `client` — `httpx.AsyncClient` against the app.
- `as_user(role)` — issues a real JWT for a seeded user with the given role.
- `seed_min` — loads `tests/fixtures/seed_min.json`.

### RBAC tests

Every router has a parameterized test:

```python
@pytest.mark.parametrize("role,expected", [
    ("owner", 200), ("admin", 200), ("engineer", 200),
    ("technician", 403), ("viewer", 403),
])
async def test_panel_create_rbac(client, as_user, role, expected):
    ...
```

## Web (`apps/web`)

### Unit (vitest)

- Component logic, hooks.
- Snapshot tests reserved for stable primitives only.

### E2E (Playwright)

- Critical flows only: login, create panel, draft → approve revision, generate label batch, scan QR.
- Runs against `pnpm dev` + a seeded test API.
- Headed mode in CI on a Chromium-only matrix.

### Visual regression

Out of MVP scope; planned via Playwright `toHaveScreenshot()` on a subset.

## Mobile (`apps/mobile`)

- Flutter widget tests for the scanner and viewer.
- `flutter test` in CI on Linux runner.

## Coverage targets

| Layer | Target |
|---|---|
| API services | 90% line, 100% on state machine + RBAC dep |
| API routers | 70% (integration covers) |
| Web hooks | 80% |
| Web components | none (visual covers) |

Coverage is reported but **not** a CI gate at MVP — taste over numbers.
