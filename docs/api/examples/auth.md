# API Examples — Auth

Set base URL once:

```bash
BASE=https://api.panelos.app
```

## Login

```bash
curl -s "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"m.voss@northforge.io","password":"panelos123"}'
```

Response:

```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "rftk_...",
  "expires_in": 900,
  "user": { "id": "usr_01HV...", "name": "Marta Voss" },
  "memberships": [
    { "company_id": "cmp_01HV...", "role": "engineer", "company_name": "NorthForge Industrial" }
  ]
}
```

## Refresh

```bash
curl -s "$BASE/api/v1/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d '{"refresh_token":"rftk_..."}'
```

The old refresh is invalidated; reuse is detected and the session chain is killed. See [ADR-0009](../../adr/0009-jwt-with-rotating-refresh.md).

## Switch tenant

```bash
curl -s "$BASE/api/v1/auth/switch-tenant" \
  -H "Authorization: Bearer $ACCESS" \
  -H 'Content-Type: application/json' \
  -d '{"company_id":"cmp_01HV..."}'
```

## Me

```bash
curl -s "$BASE/api/v1/users/me" -H "Authorization: Bearer $ACCESS"
```

## Logout

```bash
curl -s -X POST "$BASE/api/v1/auth/logout" \
  -H "Authorization: Bearer $ACCESS" \
  -d '{"refresh_token":"rftk_..."}'
```
