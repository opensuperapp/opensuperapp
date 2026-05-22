# Core Service - Developer Guide

## Overview

The Core Service is the main backend API for the Super App Project. It handles all business logic including microapp management, user configurations, push notifications, and file storage.

**Key Responsibilities:**

- Microapp CRUD operations and versioning
- User configuration management
- Push notifications via Firebase Cloud Messaging
- File storage (database-based)
- Authentication and authorization (dual IDP support)
- Device token management

**Tech Stack:**

- **Language:** Go 1.25.4
- **HTTP Router:** Chi v5
- **ORM:** GORM
- **Database:** MySQL 8.0+
- **Authentication:** JWT (Asgardeo + Internal IDP)
- **Push Notifications:** Firebase Admin SDK

---

## Prerequisites

### Required Software

- **Go:** 1.25.4 or higher ([Download](https://golang.org/dl/))
- **MySQL:** 8.0 or higher ([Download](https://dev.mysql.com/downloads/mysql/))
- **Git:** For version control
- **Firebase Project:** With Admin SDK credentials

### Optional Tools

- **Air:** For hot reload during development
- **Postman/Insomnia:** For API testing
- **MySQL Workbench:** For database management

---

## Environment Setup

### 1. Clone and Navigate

```bash
cd /path/to/superapp-mobile/services/core
```

### 2. Install Dependencies

```bash
go mod download
```

### 3. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your preferred editor
```

### 4. Environment Variables Reference

```bash
# Database Configuration
DB_USER=root                      # MySQL username
DB_PASSWORD=your_password         # MySQL password
DB_HOST=localhost                 # Database host
DB_PORT=3306                      # Database port
DB_NAME=superapp-database         # Database name
DB_MAX_OPEN_CONNS=25              # Max open connections
DB_MAX_IDLE_CONNS=5               # Max idle connections
DB_CONN_MAX_LIFETIME_MIN=30       # Connection max lifetime (minutes)
DB_CONN_MAX_IDLE_TIME_MIN=5       # Connection max idle time (minutes)
DB_CONNECT_RETRIES=5              # Connection retry attempts

# Server Configuration
SERVER_PORT=9090                  # HTTP server port

# External IDP (Asgardeo) - for user authentication
EXTERNAL_IDP_JWKS_URL=https://api.asgardeo.io/t/your-org/oauth2/jwks
EXTERNAL_IDP_ISSUER=https://api.asgardeo.io/t/your-org/oauth2/token

# Internal IDP (Token Service) - for service-to-service auth
INTERNAL_IDP_BASE_URL=http://localhost:8081
INTERNAL_IDP_ISSUER=superapp
INTERNAL_IDP_AUDIENCE=superapp-api

# Service Configuration
USER_SERVICE_TYPE=db              # User service type (db)
FILE_SERVICE_TYPE=db              # File service type (db)

# Firebase Configuration
FIREBASE_CREDENTIALS_PATH=./path/to/firebase-admin-key.json
```

!!! important "Firebase Setup"
    Download your Firebase Admin SDK JSON file from the Firebase Console (Project Settings → Service Accounts → Generate New Private Key) and update the path in `.env`.

---

## Database Setup

### 1. Create Database

```bash
# Connect to MySQL
mysql -u root -p

# Create database
CREATE DATABASE superapp-database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Verify
SHOW DATABASES;

# Exit
exit
```

### 2. Run Migrations

```bash
# From services/core directory
mysql -u root -p superapp-database < migrations/001_init_schema.sql
```

### 3. Verify Tables

```bash
mysql -u root -p superapp-database

SHOW TABLES;
# Expected tables:
# - micro_apps
# - micro_app_versions
# - micro_app_roles
# - micro_app_configs
# - device_tokens
# - notification_logs
# - micro_apps_storage

exit
```

---

## Running Locally

### Method 1: Direct Run

```bash
# From services/core directory
go run cmd/server/main.go
```

Output:

```
2025/12/03 20:00:00 INFO Starting server port=9090
```

### Method 2: With Hot Reload (Recommended)

```bash
# Install air if not already installed
go install github.com/air-verse/air@latest

# Run with hot reload
air
```

Air will watch for file changes and automatically rebuild and restart the server.

### Method 3: Build and Run

```bash
# Build binary
go build -o bin/core-service cmd/server/main.go

# Run binary
./bin/core-service
```

---

## Building for Production

### 1. Build Optimized Binary

```bash
# Build with optimizations
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
  -ldflags="-w -s" \
  -o bin/core-service \
  cmd/server/main.go
```

Flags explained:

- `CGO_ENABLED=0` - Disable CGO for static binary
- `GOOS=linux` - Target OS
- `GOARCH=amd64` - Target architecture
- `-ldflags="-w -s"` - Strip debug info (smaller binary)

### 2. Docker Build

```dockerfile
# Example Dockerfile
FROM golang:1.25.4-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-w -s" -o core-service cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/core-service .
COPY --from=builder /app/migrations ./migrations
EXPOSE 9090
CMD ["./core-service"]
```

Build and run:

```bash
docker build -t core-service:latest .
docker run -p 9090:9090 --env-file .env core-service:latest
```

---

## Testing

### Run All Tests

```bash
# Run all tests
go test ./...

# Run with verbose output
go test -v ./...

# Run with coverage
go test -cover ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Run Specific Package Tests

```bash
# Test handlers
go test ./internal/api/v1/handler/...

# Test services
go test ./internal/services/...

# Test auth middleware
go test ./internal/auth/...
```

---

## Additional Resources

- [Go Documentation](https://golang.org/doc/)
- [Chi Router](https://github.com/go-chi/chi)
- [GORM Documentation](https://gorm.io/docs/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Swagger/OpenAPI](https://swagger.io/docs/)
