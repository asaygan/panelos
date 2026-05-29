# Runbook — Rotate JWT Keys

PanelOS signs access tokens with RS256. Keys are rotated quarterly or immediately on suspected compromise. See [ADR-0009](../../adr/0009-jwt-with-rotating-refresh.md), [secrets](../../deployment/secrets.md).

## Key set

- JWK set served at `https://api.panelos.app/.well-known/jwks.json`.
- Multiple `kid`s coexist; verifiers select by token header `kid`.
- The newest active key is the **signer**; older ones are **verify-only**.

## Rotation procedure

1. **Generate** new keypair:
   ```bash
   openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out new.pem
   openssl rsa -pubout -in new.pem -out new.pub
   ```
2. **Compute `kid`**: sha256 of the JWK thumbprint, first 16 hex chars.
3. **Upload to Doppler**:
   ```bash
   doppler secrets set JWT_PRIVATE_KEY_NEXT="$(cat new.pem)" --config prod
   doppler secrets set JWT_PUBLIC_KEY_NEXT="$(cat new.pub)" --config prod
   doppler secrets set JWT_KID_NEXT="<kid>" --config prod
   ```
4. **Deploy** API. The app now publishes both keys in JWKS but still signs with the current.
5. **Promote**: after deploy stabilizes (15 min), swap envs:
   ```bash
   doppler secrets set JWT_PRIVATE_KEY="$JWT_PRIVATE_KEY_NEXT" ...
   ```
6. **Deploy again**. API now signs with new key; old key still in JWKS for verification.
7. **Retire** old key after access-token TTL × 4 (one hour is fine):
   ```bash
   doppler secrets delete JWT_PRIVATE_KEY_PREV JWT_KID_PREV
   ```
8. **Deploy** to remove from JWKS.

## Verification

- Sign a token locally with new key; verify against `/.well-known/jwks.json`.
- Tail logs for `kid mismatch` warnings; should be zero after step 7.

## Compromise scenario

If a private key may be leaked:

1. Skip the graceful overlap window — promote immediately.
2. Revoke all refresh tokens: `UPDATE sessions SET revoked_at = now();`.
3. Force a full re-login for all users.
4. Postmortem within 24h.
