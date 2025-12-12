# Token Issuer Service

A secure, lightweight OAuth2-compliant token issuing service for the SuperApp ecosystem. This service handles JWT token generation and signing for service-to-service authentication between microapp backends and the SuperApp platform.

## Overview

The Token Issuer Service is a critical component of the SuperApp microservices architecture. It provides:

- **Service Authentication**: Issues JWT tokens for microapp backends to authenticate with SuperApp APIs
- **User Context Tokens**: Generates tokens that carry user identity for microapp frontends
- **JWKS Publishing**: Exposes public keys for token validation by downstream services

### What This Service Does

| Function                 | Description                                 |
| ------------------------ | ------------------------------------------- |
| Token Issuance           | Signs and issues JWTs using RS256 algorithm |
| Client Credentials Grant | OAuth2 flow for service-to-service auth     |
| User Context Grant       | Custom flow for user-scoped microapp tokens |
| JWKS Publishing          | Serves public keys in standard JWKS format  |

### What This Service Does NOT Do

| Function                 | Where It's Handled                   |
| ------------------------ | ------------------------------------ |
| User Authentication      | External IDP (Ex:Asgardeo)           |
| User Identity Management | External IDP (Ex:Asgardeo)           |
| Token Validation         | superapp-backend / Microapp backends |
| Session Management       | Not applicable (stateless tokens)    |

---


## Features

### Core Features

- **OAuth2 Client Credentials Grant** - Standard OAuth2 flow for services
- **Custom User Context Grant** - Tokens with embedded user identity
- **RS256 JWT Signing** - Industry-standard asymmetric signing
- **JWKS Publishing** - Standard endpoint for public key distribution
- **Multi-Key Support** - Load and manage multiple signing keys
- **Zero-Downtime Key Rotation** - Rotate keys without service restart

### Security Features

- **Hashed Client Secrets** - Secrets stored as SHA256 hashes
- **Request Body Limits** - Protection against large payload attacks
- **Structured Logging** - JSON logs with `slog` for audit trails
- **Key ID (kid) in JWT Header** - Enables key identification for validation

---

## Getting Started

### Prerequisites

- **Go** 1.21 or later
- **MySQL** 8.0+ (or compatible)
- **OpenSSL** (for key generation)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd superapp-mobile/token-issure-service

# Install dependencies
go mod download

# Generate development keys (first time only)
./scripts/generate-keys.sh "dev-key-example" "./keys/dev"
```

### Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

#### Environment Variables

| Variable               | Description           | Default     |
| ---------------------- | --------------------- | ----------- |
| `PORT`                 | Server port           | `8081`      |
| `DB_USER`              | Database username     | `root`      |
| `DB_PASSWORD`          | Database password     | `password`  |
| `DB_HOST`              | Database host         | `127.0.0.1` |
| `DB_PORT`              | Database port         | `3306`      |
| `DB_NAME`              | Database name         | `superapp`  |
| `TOKEN_EXPIRY_SECONDS` | Token validity period | `3600`      |

#### Key Configuration (Choose One)

**Option 1: Single Key Mode** (Simple, backward compatible)

```bash
PRIVATE_KEY_PATH=./keys/dev/dev-key-example_private.pem
PUBLIC_KEY_PATH=./keys/dev/dev-key-example_public.pem
JWKS_PATH=./keys/dev/dev-key-example_jwks.json
```

**Option 2: Directory Mode** (Recommended for production)

```bash
KEYS_DIR=./keys/dev
ACTIVE_KEY_ID=dev-key-example
```

### Running the Service

```bash
# Development
go run cmd/server/main.go

# Build and run
go build -o bin/token-issuer cmd/server/main.go
./bin/token-issuer
```

The service will start on `http://localhost:8081` (or configured port).

---

## API Reference

### Hot Key Reload (Zero-Downtime Rotation)

You can rotate keys without restarting the service by using the reload endpoint. This is useful for production environments where zero downtime is required.

1. **Generate new keys** in the keys directory (e.g., `key-2_private.pem`, `key-2_public.pem`).
2. **Trigger reload**:
   ```bash
   curl -X POST http://localhost:8081/admin/reload-keys
   ```
3. **Verify**: The service will load the new keys and add them to the JWKS.
4. **Update Active Key**: Set the new key as active to start signing tokens with it:
   ```bash
   curl -X POST "http://localhost:8081/admin/active-key?key_id=key-2"
   ```
   Both keys remain valid for verification, allowing seamless rotation without invalidating existing tokens.

> **Note:** The `admin/reload-keys` endpoint re-scans the directory specified by `KEYS_DIR`. Ensure the new key files are present before calling it.

### 1. OAuth Token Endpoint

Issues tokens for service-to-service authentication using OAuth2 Client Credentials grant.

**Endpoint:** `POST /oauth/token`

**Content Type:** `application/x-www-form-urlencoded`

#### Request (Recommended - Basic Auth Header)

```bash
curl -X POST http://localhost:8081/oauth/token \
  -u "microapp-news:your-secret-here" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials"
```

This uses HTTP Basic Authentication where:

- `client_id` → Basic Auth username
- `client_secret` → Basic Auth password

The `-u` flag in curl automatically encodes credentials as `Authorization: Basic base64(client_id:client_secret)`

#### Alternative: Form Data (Not Recommended)

```bash
curl -X POST http://localhost:8081/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=microapp-news" \
  -d "client_secret=your-secret-here"
```

> ⚠️ Sending secrets in form body is less secure than Basic Auth header

#### Response (Success - 200)

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImRldi1rZXktZXhhbXBsZSIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### Response (Error - 400/401)

```json
{
  "error": "invalid_client",
  "error_description": "client_id and client_secret are required"
}
```

#### Error Codes

| Code                     | Description                           |
| ------------------------ | ------------------------------------- |
| `invalid_request`        | Malformed request                     |
| `invalid_client`         | Client not found or wrong credentials |
| `unsupported_grant_type` | Grant type not supported              |
| `server_error`           | Internal server error                 |

---

### 2. Create OAuth Client Endpoint

Creates a new OAuth2 client with a securely generated client secret. This endpoint is used to register new microapp backends that need to authenticate with the SuperApp platform.

**Endpoint:** `POST /oauth/clients`

**Content Type:** `application/json`

#### Request

```bash
curl -X POST http://localhost:8081/oauth/clients \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "microapp-weather",
    "name": "Weather Microapp Backend",
    "scopes": "read write notifications:send"
  }'
```

#### Request Body Parameters

| Parameter   | Type   | Required | Description                                                         |
| ----------- | ------ | -------- | ------------------------------------------------------------------- |
| `client_id` | string | Yes      | Unique identifier for the OAuth client (also serves as microapp ID) |
| `name`      | string | Yes      | Human-readable name for the client                                  |
| `scopes`    | string | No       | Comma-separated list of scopes (e.g., "read write admin")           |

#### Response (Success - 201 Created)

```json
{
  "client_id": "microapp-weather",
  "client_secret": "aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW",
  "name": "Weather Microapp Backend",
  "scopes": "read write notifications:send",
  "is_active": true
}
```

> ⚠️ **Important:** The `client_secret` is only returned once during client creation. Store it securely as it cannot be retrieved later.

#### Response (Error - 400 Bad Request)

```json
{
  "error": "invalid_request",
  "error_description": "client_id is required"
}
```

#### Response (Error - 409 Conflict)

```json
{
  "error": "invalid_request",
  "error_description": "client_id already exists"
}
```

#### Security Features

- **Secure Generation**: Client secrets are generated using cryptographically secure random number generation (`crypto/rand`)
- **32-Character Length**: Secrets contain 32 alphanumeric characters (a-z, A-Z, 0-9)
- **Hashed Storage**: Secrets are hashed using SHA-256 before being stored in the database
- **One-Time Visibility**: The plain text secret is only returned once and cannot be retrieved later

### 3. User Context Token Endpoint

Generates tokens with embedded user identity for microapp frontends. This endpoint is called by go-backend during token exchange.

**Endpoint:** `POST /oauth/token/user`

**Content Type:** `application/x-www-form-urlencoded`

#### Request

```bash
curl -X POST http://localhost:8081/oauth/token/user \
  -d "grant_type=user_context" \
  -d "user_email=user@example.com" \
  -d "microapp_id=microapp-news" \
  -d "scope=read write"
```

#### Response (Success - 200)

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImRldi1rZXktZXhhbXBsZSIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### Token Claims

The generated token includes:

```json
{
  "iss": "superapp-idp",
  "sub": "microapp-news",
  "aud": ["superapp-api"],
  "exp": 1701648000,
  "iat": 1701644400,
  "nbf": 1701644400,
  "email": "user@example.com",
  "scope": "read write"
}
```

---

### 4. JWKS Endpoint

Serves the JSON Web Key Set containing public keys for token validation.

**Endpoint:** `GET /.well-known/jwks.json`

#### Response (200)

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "dev-key-example",
      "n": "xOw3Yt...",
      "e": "AQAB",
      "alg": "RS256"
    },
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "dev-key-2",
      "n": "yPx4Zu...",
      "e": "AQAB",
      "alg": "RS256"
    }
  ]
}
```

#### Usage in Token Validation

Microapp backends should:

1. Fetch JWKS from `go-backend/.well-known/jwks.json` (proxied)
2. Cache the JWKS with periodic refresh (recommended: 1 hour)
3. Use the `kid` header in incoming JWTs to select the correct key
4. Validate the token signature using the matching public key

---

## Token Structure

### JWT Header

```json
{
  "alg": "RS256",
  "kid": "dev-key-example",
  "typ": "JWT"
}
```

### Service Token Claims (Client Credentials)

```json
{
  "iss": "superapp-idp",
  "sub": "microapp-news",
  "aud": ["superapp-api"],
  "exp": 1701648000,
  "iat": 1701644400,
  "nbf": 1701644400,
  "scope": "notifications:send users:read"
}
```

### User Context Token Claims

```json
{
  "iss": "superapp-idp",
  "sub": "user@example.com",
  "aud": ["microapp-news"],
  "exp": 1701648000,
  "iat": 1701644400,
  "nbf": 1701644400,
  "microapp_id": "microapp-news",
  "scope": "read write"
}
```

### Claim Descriptions

#### Service Token (Client Credentials)

| Claim   | Description                       |
| ------- | --------------------------------- |
| `iss`   | Issuer - always `superapp-idp`    |
| `sub`   | Subject - the microapp/client ID  |
| `aud`   | Audience - `superapp-api`         |
| `exp`   | Expiration time (Unix timestamp)  |
| `iat`   | Issued at (Unix timestamp)        |
| `nbf`   | Not valid before (Unix timestamp) |
| `scope` | Space-separated list of scopes    |

#### User Context Token

| Claim         | Description                          |
| ------------- | ------------------------------------ |
| `iss`         | Issuer - always `superapp-idp`       |
| `sub`         | Subject - the user's email           |
| `aud`         | Audience - the target microapp ID    |
| `exp`         | Expiration time (Unix timestamp)     |
| `iat`         | Issued at (Unix timestamp)           |
| `nbf`         | Not valid before (Unix timestamp)    |
| `microapp_id` | The microapp this token is valid for |
| `scope`       | Space-separated list of scopes       |

---

## Key Management

### Single Key Mode

For simple deployments or development:

```bash
# Directory structure
keys/
└── dev/
    ├── dev-key-example_private.pem  # Keep secure!
    ├── dev-key-example_public.pem
    └── dev-key-example_jwks.json

# Configuration
PRIVATE_KEY_PATH=./keys/dev/dev-key-example_private.pem
PUBLIC_KEY_PATH=./keys/dev/dev-key-example_public.pem
JWKS_PATH=./keys/dev/dev-key-example_jwks.json
```

### Directory Mode (Multi-Key)

For production with key rotation support:

```bash
# Directory structure
keys/
└── prod/
    ├── prod-key-2024-q1_private.pem
    ├── prod-key-2024-q1_public.pem
    ├── prod-key-2024-q2_private.pem  # New key for rotation
    └── prod-key-2024-q2_public.pem

# Configuration
KEYS_DIR=./keys/prod
ACTIVE_KEY_ID=prod-key-2024-q1  # Currently signing key
```

**How it works:**

- All keys in the directory are loaded on startup
- JWKS contains all public keys (enables validation of any key)
- Only the `ACTIVE_KEY_ID` is used for signing new tokens
- Old tokens remain valid until they expire

### Key Rotation

See [https://github.com/LSFLK/superapp-mobile/blob/main/backend-services/token-service/docs/KEY_ROTATION.md](https://github.com/LSFLK/superapp-mobile/blob/main/backend-services/token-service/docs/KEY_ROTATION.md) for detailed instructions.

**Quick Overview:**

```bash
# 1. Generate new key
./scripts/generate-keys.sh "prod-key-2024-q2" "./keys/prod" 4096

# 2. Reload keys (no restart needed)
curl -X POST http://localhost:8081/admin/reload-keys

# 3. Set new key as active
curl -X POST "http://localhost:8081/admin/active-key?key_id=prod-key-2024-q2"

# 4. Wait for old tokens to expire, then remove old key
```

---

## Security Considerations

### Production Checklist

- [ ] **Never commit private keys** - Add `*.pem` to `.gitignore`
- [ ] **Use 4096-bit keys** - More secure than 2048-bit
- [ ] **Store secrets securely** - Use AWS Secrets Manager, Vault, etc.
- [ ] **Rotate keys regularly** - Every 90 days recommended
- [ ] **Use different keys per environment** - dev/staging/prod
- [ ] **Enable TLS** - Run behind HTTPS proxy in production
- [ ] **Limit token expiry** - Default 1 hour, adjust as needed
- [ ] **Monitor token issuance** - Set up alerts for anomalies

### Client Secret Storage

Client secrets are stored as SHA256 hashes:

```go
// Registration (admin process)
hash := sha256.Sum256([]byte(rawSecret))
storedHash := hex.EncodeToString(hash[:])

// Validation (during token request)
hash := sha256.Sum256([]byte(providedSecret))
if hex.EncodeToString(hash[:]) != storedHash {
    return error
}
```
