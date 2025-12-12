# Key Rotation Guide

This guide explains how to generate, manage, and rotate RSA keys for the token-issure-service.

## Table of Contents
- [Quick Start](#quick-start)
- [Key Generation](#key-generation)
- [Key Rotation Process](#key-rotation-process)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### For Local Development

```bash
# Generate development keys
./scripts/generate-keys.sh "dev-key-$(date +%Y%m%d)" "./keys/dev"

# Update .env
PRIVATE_KEY_PATH=./keys/dev/dev-key-20241203_private.pem
PUBLIC_KEY_PATH=./keys/dev/dev-key-20241203_public.pem
JWKS_PATH=./keys/dev/dev-key-20241203_jwks.json
ACTIVE_KEY_ID=dev-key-20241203

# Restart service
go run cmd/server/main.go
```

### For Production

**DO NOT** use the script-generated keys directly in production. Instead:

1. Generate keys on a secure machine (not in the repository)
2. Store private keys in a secrets manager (AWS Secrets Manager, Vault, etc.)
3. Distribute public keys via secure channels

---

## Key Generation

### Using the Script

```bash
./scripts/generate-keys.sh [KEY_ID] [OUTPUT_DIR] [KEY_SIZE]
```

**Parameters:**
- `KEY_ID` (optional): Unique identifier for the key (default: `superapp-key-<timestamp>`)
- `OUTPUT_DIR` (optional): Directory to store keys (default: `./keys`)
- `KEY_SIZE` (optional): RSA key size in bits (default: `2048`, recommended: `4096` for production)

**Example:**
```bash
./scripts/generate-keys.sh "prod-key-2024-q1" "./keys/prod" 4096
```

**Output:**
- `{KEY_ID}_private.pem` - Private key (keep secure!)
- `{KEY_ID}_public.pem` - Public key
- `{KEY_ID}_jwks.json` - JWKS format for distribution

### Manual Generation

If you prefer to generate keys manually:

```bash
# Generate private key
openssl genrsa -out private_key.pem 4096

# Extract public key
openssl rsa -in private_key.pem -pubout -out public_key.pem

# Generate JWKS
go run scripts/generate-jwks.go public_key.pem "my-key-id" > jwks.json
```

---

## Key Rotation Process

### Zero-Downtime Rotation (Recommended)

This process ensures no service interruption during key rotation using directory-based multi-key loading.

#### Prerequisites

Configure the service to use directory mode:
```bash
# .env
KEYS_DIR=./keys/prod
ACTIVE_KEY_ID=prod-key-2024-q1
```

#### Timeline

```
Day 0:  Key-1 (signing + validation)
Day 1:  Key-1 (signing) + Key-2 (validation only)      ← Add new key
Day 2:  Key-1 (validation) + Key-2 (signing)           ← Switch active key
Day 7:  Key-2 (signing + validation)                   ← Remove old key
```

#### Step-by-Step

**Day 0: Current State**
```bash
# Service is running with Key-1
ls keys/prod/
# prod-key-2024-q1_private.pem
# prod-key-2024-q1_public.pem
```

**Day 1: Add New Key (No Restart Required)**

```bash
# 1. Generate new key in the same directory
./scripts/generate-keys.sh "prod-key-2024-q2" "./keys/prod" 4096

# 2. Restart service to load both keys
# Service will now:
# - Sign tokens with Key-1 (active)
# - Validate tokens from both Key-1 and Key-2
# - Serve JWKS with both public keys

# 3. Verify both keys are loaded
curl http://localhost:8081/.well-known/jwks.json | jq '.keys | length'
# Should return: 2
```

**Day 2: Switch Active Key (No Downtime)**

```bash
# 1. Update environment variable
ACTIVE_KEY_ID=prod-key-2024-q2

# 2. Restart service
# New tokens will be signed with Key-2
# Old tokens signed with Key-1 are still valid

# 3. Verify active key
curl -s http://localhost:8081/oauth/token \
  -d "grant_type=client_credentials" \
  -d "client_id=test" \
  -d "client_secret=secret" | \
  jq -r '.access_token' | \
  cut -d. -f1 | base64 -d | jq '.kid'
# Should return: "prod-key-2024-q2"
```

**Day 7: Remove Old Key (After Token Expiry)**

```bash
# 1. Wait for all Key-1 tokens to expire (check TOKEN_EXPIRY_SECONDS)

# 2. Archive old key
mkdir -p keys/archive
mv keys/prod/prod-key-2024-q1_* keys/archive/

# 3. Restart service
# Service now only loads Key-2

# 4. Verify
curl http://localhost:8081/.well-known/jwks.json | jq '.keys | length'
# Should return: 1
```

### Simple Rotation (With Downtime)

If you can tolerate brief downtime:

```bash
# 1. Generate new key
./scripts/generate-keys.sh "new-key" "./keys"

# 2. Update environment variables
PRIVATE_KEY_PATH=./keys/new-key_private.pem
PUBLIC_KEY_PATH=./keys/new-key_public.pem
JWKS_PATH=./keys/new-key_jwks.json
ACTIVE_KEY_ID=new-key

# 3. Restart token-issure-service
# 4. Update go-backend JWKS URL
# 5. Restart go-backend

# All old tokens are now invalid
```

---

## Security Best Practices

### 🔐 Private Key Security

1. **Never commit private keys to version control**
   ```gitignore
   *.pem
   !example_*.pem
   keys/
   !keys/dev/
   ```

2. **Use secrets managers in production**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Google Secret Manager
   - Azure Key Vault

3. **Restrict file permissions**
   ```bash
   chmod 600 private_key.pem  # Read/write for owner only
   ```

4. **Encrypt private keys at rest**
   ```bash
   # Generate encrypted private key
   openssl genrsa -aes256 -out private_key.pem 4096
   ```

### 🔄 Rotation Schedule

- **Development**: Every 6 months
- **Staging**: Every 3 months
- **Production**: Every 90 days
- **After Breach**: Immediately

### 🌍 Environment Separation

Use different keys for each environment:

```
keys/
├── dev/
│   ├── dev-key-2024_private.pem
│   └── dev-key-2024_public.pem
├── staging/
│   ├── staging-key-2024-q1_private.pem
│   └── staging-key-2024-q1_public.pem
└── prod/
    ├── prod-key-2024-q1_private.pem  ← Stored in Vault
    └── prod-key-2024-q1_public.pem
```

### 📋 Key Naming Convention

Use descriptive, timestamped key IDs:

```
{environment}-key-{year}-{quarter|month|date}

Examples:
- dev-key-2024
- staging-key-2024-q1
- prod-key-2024-03-15
```

---

## Troubleshooting

### "Failed to parse private key"

**Cause**: Invalid PEM format or wrong file

**Solution**:
```bash
# Verify key format
openssl rsa -in private_key.pem -check

# Re-generate if corrupted
./scripts/generate-keys.sh
```

### "Key with kid X not found"

**Cause**: ACTIVE_KEY_ID doesn't match loaded key

**Solution**:
```bash
# Check loaded key ID (in logs)
grep "Active signing key" logs/app.log

# Update ACTIVE_KEY_ID to match
ACTIVE_KEY_ID=superapp-key-1
```

### "Token validation failed" (in go-backend)

**Cause**: go-backend has old JWKS

**Solution**:
```bash
# Update go-backend's JWKS URL to point to new JWKS
EXTERNAL_IDP_JWKS_URL=http://token-issure-service:8081/.well-known/jwks.json

# Or manually update JWKS file if using file-based config
```

### "JWKS not available"

**Cause**: JWKS file not found or invalid

**Solution**:
```bash
# Regenerate JWKS from public key
go run scripts/generate-jwks.go public_key.pem "my-key-id" > jwks.json

# Verify JWKS format
cat jwks.json | jq .
```

---

## Advanced: Multi-Key Support (Future Enhancement)

The current implementation supports a single active key. For true zero-downtime rotation, you would need:

1. **Load multiple keys** in `NewTokenService`
2. **Serve all public keys** in JWKS endpoint
3. **Sign with active key**, validate with any key
4. **Hot-reload keys** without restart

This is planned for a future release. For now, use the simple rotation process with brief downtime.

---

## Questions?

If you encounter issues not covered here, check:
- Service logs: `logs/token-issure-service.log`
- go-backend logs: `logs/go-backend.log`
- JWKS endpoint: `http://localhost:8081/.well-known/jwks.json`

For security concerns, contact the security team immediately.
