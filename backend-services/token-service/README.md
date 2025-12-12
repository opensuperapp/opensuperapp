# Token Issuer Service

A secure, lightweight OAuth2-compliant token issuing service for the SuperApp ecosystem. This service handles JWT token generation and signing for service-to-service authentication between microapp backends and the SuperApp platform.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Service](#running-the-service)
- [API Reference](#api-reference)
  - [OAuth Token Endpoint](#1-oauth-token-endpoint)
  - [Create OAuth Client Endpoint](#2-create-oauth-client-endpoint)
  - [User Context Token Endpoint](#3-user-context-token-endpoint)
  - [JWKS Endpoint](#4-jwks-endpoint)
- [Token Structure](#token-structure)
- [Key Management](#key-management)
  - [Single Key Mode](#single-key-mode)
  - [Directory Mode (Multi-Key)](#directory-mode-multi-key)
  - [Key Rotation](#key-rotation)
- [Security Considerations](#security-considerations)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

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

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SuperApp Ecosystem                              │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   Asgardeo IDP   │ ◄── User Authentication
                    │  (External IDP)  │
                    └────────┬─────────┘
                             │ User Token
                             ▼
┌─────────────┐     ┌────────────────┐     ┌─────────────────────┐
│  Microapp   │────►│   go-backend   │────►│  Token Issuer       │
│  Frontend   │     │   (Gateway)    │     │  Service            │
└─────────────┘     └───────┬────────┘     │  (this service)     │
                            │              ├─────────────────────┤
                            │              │ POST /oauth/token   │
                            │              │ POST /oauth/token/  │
                            │              │      user           │
                            │              │ GET  /.well-known/  │
                            │              │      jwks.json      │
                            │              └──────────┬──────────┘
                            │                         │
                            ▼                         │ Service Token
┌─────────────────────────────────────────────────────┼───────────────────────┐
│                                                     │                       │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────▼─────┐                 │
│  │  Microapp   │     │  Microapp   │     │   Microapp    │                 │
│  │  Backend A  │     │  Backend B  │     │   Backend C   │                 │
│  │             │     │             │     │               │                 │
│  │ Validates   │     │ Validates   │     │  Validates    │                 │
│  │ tokens via  │     │ tokens via  │     │  tokens via   │                 │
│  │ JWKS        │     │ JWKS        │     │  JWKS         │                 │
│  └─────────────┘     └─────────────┘     └───────────────┘                 │
│                                                                             │
│                         Microapp Backends                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Authentication Flows

#### Flow 1: Service-to-Service (Client Credentials)

```
Microapp Backend                    superapp-backend             Token Issuer
      │                                  │                           │
      │ POST /oauth/token                │                           │
      │ {client_id, client_secret}       │                           │
      │ ─────────────────────────────────►                           │
      │                                  │ Forward request           │
      │                                  │ ──────────────────────────►
      │                                  │                           │
      │                                  │      Validate client      │
      │                                  │      Issue JWT            │
      │                                  │                           │
      │                                  │ ◄──────────────────────────
      │                                  │       {access_token}      │
      │ ◄─────────────────────────────────                           │
      │         {access_token}           │                           │
```

#### Flow 2: User Context Token Exchange

```
Microapp         go-backend                           Token Issuer
Frontend              │                                     │
   │                  │                                     │
   │ Exchange user    │                                     │
   │ token for        │                                     │
   │ microapp token   │                                     │
   │ ─────────────────►                                     │
   │                  │ POST /oauth/token/user              │
   │                  │ {user_email, microapp_id}           │
   │                  │ ────────────────────────────────────►
   │                  │                                     │
   │                  │                   Generate token    │
   │                  │                   with user context │
   │                  │                                     │
   │                  │ ◄────────────────────────────────────
   │                  │         {access_token}              │
   │ ◄─────────────────                                     │
   │  {access_token}  │                                     │
```

---

## Features

### Core Features

- ✅ **OAuth2 Client Credentials Grant** - Standard OAuth2 flow for services
- ✅ **Custom User Context Grant** - Tokens with embedded user identity
- ✅ **RS256 JWT Signing** - Industry-standard asymmetric signing
- ✅ **JWKS Publishing** - Standard endpoint for public key distribution
- ✅ **Multi-Key Support** - Load and manage multiple signing keys
- ✅ **Zero-Downtime Key Rotation** - Rotate keys without service restart

### Security Features

- ✅ **Hashed Client Secrets** - Secrets stored using bcrypt with per-secret salts
- ✅ **Request Body Limits** - Protection against large payload attacks
- ✅ **Structured Logging** - JSON logs with `slog` for audit trails
- ✅ **Key ID (kid) in JWT Header** - Enables key identification for validation

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
- **Hashed Storage**: Secrets are hashed using bcrypt (cost factor 12) with automatic per-secret salts before being stored in the database
- **One-Time Visibility**: The plain text secret is only returned once and cannot be retrieved later
- **Timing Attack Protection**: Secret verification uses bcrypt's constant-time comparison

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

See [docs/KEY_ROTATION.md](docs/KEY_ROTATION.md) for detailed instructions.

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

Client secrets are stored using **bcrypt** password hashing with automatic per-secret salts:

```go
// Registration (admin process)
hash, err := bcrypt.GenerateFromPassword([]byte(rawSecret), 12)
if err != nil {
    return err
}
storedHash := string(hash) // ~60 chars, includes salt

// Validation (during token request)
err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(providedSecret))
if err != nil {
    return error // Invalid secret
}
```

**Security benefits:**
- Automatic per-secret salts (prevents rainbow table attacks)
- Configurable cost factor (currently 12 = ~250ms)
- Constant-time comparison (prevents timing attacks)
- Future-proof (cost can increase as hardware improves)
- Industry standard (OWASP recommended)


---

## Database Schema

### OAuth2 Clients Table

```sql
CREATE TABLE oauth2_clients (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    client_id    VARCHAR(255) NOT NULL UNIQUE,
    client_secret TEXT NOT NULL,  -- Bcrypt hash (~60 chars)
    name         VARCHAR(255) NOT NULL,
    scopes       TEXT,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP NULL,

    INDEX idx_client_id_active (client_id, is_active)
);
```

### Sample Data

```sql
INSERT INTO oauth2_clients (client_id, client_secret, name, scopes, is_active) VALUES
('microapp-news', '<bcrypt-hash>', 'News Microapp', 'notifications:send users:read', true),
('microapp-events', '<bcrypt-hash>', 'Events Microapp', 'notifications:send', true);
```

---

## Project Structure

```
token-issure-service/
├── cmd/
│   └── server/
│       └── main.go              # Application entry point
├── internal/
│   ├── api/
│   │   └── v1/
│   │       ├── handler/
│   │       │   ├── key_handler.go        # JWKS endpoint
│   │       │   ├── key_handler_test.go
│   │       │   ├── oauth_handler.go      # Token endpoints
│   │       │   ├── oauth_handler_test.go
│   │       │   ├── user_token_handler.go # User context tokens
│   │       │   └── utils.go              # Shared utilities
│   │       └── router/
│   │           └── router.go             # Route definitions
│   ├── config/
│   │   └── config.go            # Environment configuration
│   ├── models/
│   │   └── oauth2_client.go     # Database models
│   └── services/
│       ├── token_service.go     # Core token signing logic
│       └── user_token.go        # User context token logic
├── keys/
│   └── dev/                     # Development keys (not for prod!)
│       ├── README.md
│       ├── dev-key-example_private.pem
│       ├── dev-key-example_public.pem
│       └── dev-key-example_jwks.json
├── scripts/
│   ├── generate-keys.sh         # Key generation script
│   └── generate-jwks.go         # JWKS generator
├── docs/
│   └── KEY_ROTATION.md          # Key rotation guide
├── .env.example                 # Environment template
├── go.mod
├── go.sum
└── README.md                    # This file
```

---

## Testing

### Run All Tests

```bash
go test ./... -v
```

### Run Specific Tests

```bash
# OAuth handler tests
go test ./internal/api/v1/handler/... -v -run TestOAuthHandler

# Key handler tests
go test ./internal/api/v1/handler/... -v -run TestKeyHandler
```

### Test Coverage

```bash
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

### Test Data

Tests use an in-memory SQLite database and test keys located in:

```
internal/services/testdata/
├── test-key-1_private.pem
├── test-key-1_public.pem
├── test-key-2_private.pem
└── test-key-2_public.pem
```

---

## Deployment

### Docker

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /token-issuer cmd/server/main.go

FROM alpine:3.18
RUN apk --no-cache add ca-certificates
COPY --from=builder /token-issuer /token-issuer
EXPOSE 8081
CMD ["/token-issuer"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: token-issuer
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: token-issuer
          image: token-issuer:latest
          ports:
            - containerPort: 8081
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
          volumeMounts:
            - name: signing-keys
              mountPath: /keys
              readOnly: true
      volumes:
        - name: signing-keys
          secret:
            secretName: token-signing-keys
```

---

## Troubleshooting

### Common Issues

#### "Failed to connect to database"

```bash
# Check MySQL is running
mysql -u root -p -e "SELECT 1"

# Verify connection string
echo $DB_USER:$DB_PASSWORD@tcp($DB_HOST:$DB_PORT)/$DB_NAME
```

#### "Failed to read private key"

```bash
# Check file exists and permissions
ls -la keys/dev/
# Private key should be 600 (owner read/write only)
chmod 600 keys/dev/*_private.pem
```

#### "Active key not found"

```bash
# In directory mode, ensure ACTIVE_KEY_ID matches a file prefix
ls keys/prod/ | grep private
# Should see: prod-key-2024-q1_private.pem

# Set matching ACTIVE_KEY_ID
ACTIVE_KEY_ID=prod-key-2024-q1
```

#### "JWKS not available"

```bash
# Ensure public key is loaded
# Check logs for "Loaded key pair" messages
# Verify public key file exists alongside private key
```

### Health Check

```bash
# Verify service is running
curl http://localhost:8081/.well-known/jwks.json | jq

# Test token issuance (requires valid client)
curl -X POST http://localhost:8081/oauth/token \
  -d "grant_type=client_credentials" \
  -d "client_id=test-client" \
  -d "client_secret=test-secret"
```

---

## License

[Your License Here]

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

---

## Support

For issues and questions, please open a GitHub issue or contact the SuperApp platform team.
