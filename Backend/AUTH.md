# Authentication and transaction ownership

The API uses opaque bearer tokens. Only SHA-256 token hashes are stored. Passwords use a random salt and Node's `scrypt` with N=32768, r=8, p=1. Session tokens expire after 30 days and can be revoked with logout. A separate import token is intended for the iPhone Shortcut and does not authorize reading transactions.

Run the additive migration once for each database:

```sh
npm run migrate:auth
```

The migration creates `users`, `user_sessions`, and `user_import_tokens`, adds `transactions.user_id`, and changes fingerprint uniqueness from global to per-user. Existing transactions remain unowned and are never returned by the API. After the owner signs up and you verify their email, assign the old rows explicitly:

```sh
node scripts/assign-transactions.js --email=owner@example.com
```

That command assigns every currently unowned transaction. Do not run it on a shared database unless all unowned rows belong to that account.

## API

`POST /api/auth/signup`

```json
{ "email": "owner@example.com", "password": "at least 12 characters" }
```

Returns the user, a 30-day session token, its expiry, and the import token. The import token is shown in plaintext only in this response or after rotation, so save it in the Shortcut.

`POST /api/auth/login` accepts the same body and returns a session token. `GET /api/auth/me`, `POST /api/auth/logout`, and `POST /api/auth/import-token` require a session bearer token. Rotating the import token immediately invalidates its previous value.

Read transactions with the session token:

```http
GET /api/transactions
Authorization: Bearer SESSION_TOKEN
```

Import from the iPhone Shortcut with its dedicated token:

```http
POST /api/transactions/import
Authorization: Bearer IMPORT_TOKEN
Content-Type: application/json

{"message":"Original bank SMS"}
```

The import token cannot call `GET /api/transactions`. A session token can import as well. Duplicate fingerprints are scoped to the authenticated user.

## Deployment configuration

Copy `.env.example` to the host's environment-variable settings. `CORS_ORIGINS` is a comma-separated allowlist of frontend origins. Requests without an Origin header remain allowed for Shortcuts and server tools; browser origins not on the list receive no CORS permission. Set `TRUST_PROXY=1` behind a single trusted hosting proxy so login rate limits use the client address.

`DATABASE_URL` supports hosted PostgreSQL. Set `DATABASE_SSL=true` only when the provider requires TLS. Keep database credentials and tokens outside Git. `EXPO_PUBLIC_*` frontend variables are public and must never contain session or import tokens.

The current rate limiter is process-local and suitable for one free hosting instance. Multiple instances need a shared rate-limit store. Password reset, email verification, session management UI, and account deletion are not implemented yet.
