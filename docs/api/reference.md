# API Reference

Complete reference for all API endpoints in the OpenSuperApp SuperApp Mobile platform.

## Base URLs

| Service | Base URL | Purpose |
|---------|----------|---------|
| **Core Service** | `http://localhost:9090` | Main API |
| **Token Service** | `http://localhost:8081` | Authentication |

---

## API Overview

### Core Service Endpoints

| Method | Endpoint | Description | Auth | Details |
|--------|----------|-------------|------|---------|
| **User Management** |||||
| GET | `/api/v1/users/me` | Get current user info | User | [↓](#get-current-user-info) |
| GET | `/api/v1/users` | Get all users | User | [↓](#get-all-users) |
| POST | `/api/v1/users` | Create/update user | User | [↓](#create-or-update-user) |
| DELETE | `/api/v1/users/{email}` | Delete user | User | [↓](#delete-user) |
| **MicroApp Management** |||||
| GET | `/api/v1/microapps` | Get all MicroApps | User | [↓](#get-all-microapps) |
| GET | `/api/v1/microapps/{id}` | Get MicroApp by ID | User | [↓](#get-microapp-by-id) |
| POST | `/api/v1/microapps` | Create/update MicroApp | User | [↓](#create-or-update-microapp) |
| DELETE | `/api/v1/microapps/{id}` | Deactivate MicroApp | User | [↓](#deactivate-microapp) |
| **User Configuration** |||||
| GET | `/api/v1/user-config` | Get user configuration | User | [↓](#get-user-configuration) |
| POST | `/api/v1/user-config` | Update user configuration | User | [↓](#update-user-configuration) |
| **Push Notifications** |||||
| POST | `/api/v1/notifications/register` | Register device token | User | [↓](#register-device-token) |
| POST | `/api/v1/services/notifications/send` | Send push notification | Service | [↓](#send-notification-service-endpoint) |
| **Token Exchange** |||||
| POST | `/api/v1/oauth/exchange` | Exchange user token for MicroApp token | User | [↓](#exchange-user-token-for-microapp-token) |
| GET | `/api/v1/.well-known/jwks.json` | Get JWKS (public keys) | Public | [↓](#get-jwks-public-keys) |
| **File Management** |||||
| POST | `/api/v1/files` | Upload file | User | [↓](#upload-file) |
| DELETE | `/api/v1/files` | Delete file | User | [↓](#delete-file) |
| GET | `/api/v1/public/micro-app-files/download/{fileName}` | Download file | Public | [↓](#download-file-public) |

### Token Service Endpoints

| Method | Endpoint | Description | Auth | Details |
|--------|----------|-------------|------|---------|
| POST | `/oauth/token` | Get service token (Client Credentials) | Basic Auth | [↓](#oauth-token-client-credentials) |
| POST | `/oauth/clients` | Create OAuth client | None | [↓](#create-oauth-client) |
| POST | `/oauth/token/user` | Get user context token | None | [↓](#user-context-token) |
| GET | `/.well-known/jwks.json` | Get JWKS | Public | [↓](#get-jwks) |

---

## Core Service API

### Authentication

All user-authenticated endpoints require an `Authorization` header:

```
Authorization: Bearer <External_IdP_user_token>
```

Service-authenticated endpoints require a service token:

```
Authorization: Bearer <service_token>
```

---

## User Management

### Get Current User Info

Retrieves the authenticated user's profile information.

**Endpoint**: `GET /api/v1/users/me`

**Authentication**: User token (Asgardeo)

**Response** (200 OK):
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "userThumbnail": "https://example.com/avatar.jpg",
  "location": "New York, USA"
}
```

---

### Get All Users

Retrieves all users in the system (admin function).

**Endpoint**: `GET /api/v1/users`

**Authentication**: User token (Asgardeo)

**Response** (200 OK):
```json
[
  {
    "email": "user1@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userThumbnail": "https://example.com/avatar1.jpg",
    "location": "New York, USA"
  },
  {
    "email": "user2@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "userThumbnail": "https://example.com/avatar2.jpg",
    "location": "San Francisco, USA"
  }
]
```

---

### Create or Update User

Creates a new user or updates an existing one.

**Endpoint**: `POST /api/v1/users`

**Authentication**: User token (Asgardeo)

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "email": "newuser@example.com",
  "firstName": "Alice",
  "lastName": "Johnson",
  "userThumbnail": "https://example.com/avatar.jpg",
  "location": "Boston, USA"
}
```

**Response** (201 Created):
```json
{
  "message": "User created/updated successfully"
}
```

---

### Delete User

Removes a user from the system.

**Endpoint**: `DELETE /api/v1/users/{email}`

**Authentication**: User token (Asgardeo)

**Response** (200 OK):
```json
{
  "message": "User deleted successfully"
}
```

---

## MicroApp Management

### Get All MicroApps

Retrieves all available MicroApps, filtered by user's group membership.

**Endpoint**: `GET /api/v1/microapps`

**Authentication**: User token (Asgardeo)

**Response** (200 OK):
```json
[
  {
    "id": "microapp-news",
    "name": "News Portal",
    "description": "Latest news and updates",
    "icon": "https://example.com/news-icon.png",
    "isActive": true,
    "versions": [
      {
        "version": "1.0.0",
        "downloadUrl": "https://example.com/news-v1.0.0.zip",
        "isLatest": true
      }
    ],
    "roles": ["user", "admin"],
    "configs": {
      "apiEndpoint": "https://news-api.example.com",
      "theme": "dark"
    }
  }
]
```

---

### Get MicroApp by ID

Retrieves detailed information about a specific MicroApp.

**Endpoint**: `GET /api/v1/microapps/{id}`

**Authentication**: User token (Asgardeo)

**Response** (200 OK):
```json
{
  "id": "microapp-news",
  "name": "News Portal",
  "description": "Latest news and updates",
  "icon": "https://example.com/news-icon.png",
  "isActive": true,
  "versions": [
    {
      "version": "1.0.0",
      "downloadUrl": "https://example.com/news-v1.0.0.zip",
      "isLatest": true
    }
  ],
  "roles": ["user", "admin"],
  "configs": {
    "apiEndpoint": "https://news-api.example.com"
  }
}
```

---

### Create or Update MicroApp

Creates a new MicroApp or updates an existing one (admin function).

**Endpoint**: `POST /api/v1/microapps`

**Authentication**: User token (Asgardeo)

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "id": "microapp-weather",
  "name": "Weather App",
  "description": "Real-time weather forecasts",
  "icon": "https://example.com/weather-icon.png",
  "isActive": true,
  "versions": [
    {
      "version": "1.0.0",
      "downloadUrl": "https://example.com/weather-v1.0.0.zip",
      "isLatest": true
    }
  ],
  "roles": ["user"],
  "configs": {
    "apiKey": "weather-api-key-123"
  }
}
```

**Response** (201 Created):
```json
{
  "message": "Microapp created/updated successfully"
}
```

---

### Deactivate MicroApp

Deactivates a MicroApp, making it unavailable to users.

**Endpoint**: `DELETE /api/v1/microapps/{id}`

**Authentication**: User token (Asgardeo)

**Response** (200 OK):
```json
{
  "message": "Microapp deactivated successfully"
}
```

---

## User Configuration

### Get User Configuration

Retrieves user-specific configuration and preferences.

**Endpoint**: `GET /api/v1/user-config`

**Authentication**: User token (Asgardeo)

**Response** (200 OK):
```json
{
  "userEmail": "user@example.com",
  "downloadedMicroapps": ["microapp-news", "microapp-weather"],
  "favoriteMicroapps": ["microapp-news"],
  "preferences": {
    "theme": "dark",
    "notifications": true
  }
}
```

---

### Update User Configuration

Updates user-specific configuration.

**Endpoint**: `POST /api/v1/user-config`

**Authentication**: User token (Asgardeo)

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "downloadedMicroapps": ["microapp-news", "microapp-weather", "microapp-events"],
  "favoriteMicroapps": ["microapp-news", "microapp-weather"],
  "preferences": {
    "theme": "light",
    "notifications": false
  }
}
```

**Response** (200 OK):
```json
{
  "message": "User configuration updated successfully"
}
```

---

## Push Notifications

### Register Device Token

Registers a device token for push notifications.

**Endpoint**: `POST /api/v1/notifications/register`

**Authentication**: User token (Asgardeo)

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "email": "user@example.com",
  "token": "fcm-device-token-xyz123",
  "platform": "android"
}
```

**Response** (201 Created):
```
(Empty body)
```

---

### Send Notification (Service Endpoint)

Sends push notifications to specified users. Called by MicroApp backends.

**Endpoint**: `POST /api/v1/services/notifications/send`

**Authentication**: Service token (from Token Service)

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "userEmails": ["user1@example.com", "user2@example.com"],
  "title": "New Article Published",
  "body": "Check out the latest news!",
  "data": {
    "articleId": "123",
    "category": "technology"
  }
}
```

**Response** (200 OK):
```json
{
  "success": 2,
  "failed": 0,
  "message": "Notifications sent successfully"
}
```

---

## Token Exchange

### Exchange User Token for MicroApp Token

Exchanges an Asgardeo user token for a MicroApp-scoped token.

**Endpoint**: `POST /api/v1/oauth/exchange`

**Authentication**: User token (Asgardeo)

**Content-Type**: `application/x-www-form-urlencoded`

**Request Body**:
```
microapp_id=microapp-news&scope=read write
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImRldi1rZXkiLCJ0eXAiOiJKV1QifQ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

### Get JWKS (Public Keys)

Retrieves JSON Web Key Set for token validation.

**Endpoint**: `GET /api/v1/.well-known/jwks.json`

**Authentication**: None (public endpoint)

**Response** (200 OK):
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
    }
  ]
}
```

---

## File Management

### Upload File

Uploads a file (binary data) to the system.

**Endpoint**: `POST /api/v1/files?fileName={filename}`

**Authentication**: User token (Asgardeo)

**Content-Type**: `application/octet-stream`

**Request Body**: Binary file data

**Response** (201 Created):
```json
{
  "message": "File uploaded successfully.",
  "downloadUrl": "http://localhost:9090/public/micro-app-files/download/myfile.zip"
}
```

---

### Delete File

Deletes a file from the system.

**Endpoint**: `DELETE /api/v1/files?fileName={filename}`

**Authentication**: User token (Asgardeo)

**Response** (204 No Content):
```
(Empty body)
```

---

### Download File (Public)

Downloads a file. Public endpoint for MicroApp distribution.

**Endpoint**: `GET /public/micro-app-files/download/{fileName}`

**Authentication**: None (public endpoint)

**Response** (200 OK):
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="myfile.zip"

<binary file data>
```

---

## Token Service API

### OAuth Token (Client Credentials)

Issues a service token for MicroApp backend authentication.

**Endpoint**: `POST /oauth/token`

**Authentication**: Basic Auth (client_id:client_secret)

**Content-Type**: `application/x-www-form-urlencoded`

**Request**:
```bash
curl -X POST http://localhost:8081/oauth/token \
  -u "microapp-news:secret123" \
  -d "grant_type=client_credentials"
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImRldi1rZXkiLCJ0eXAiOiJKV1QifQ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

### Create OAuth Client

Creates a new OAuth2 client for MicroApp backend authentication.

**Endpoint**: `POST /oauth/clients`

**Authentication**: None (admin function - should be protected in production)

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "client_id": "microapp-weather",
  "name": "Weather MicroApp Backend",
  "scopes": "read write notifications:send"
}
```

**Response** (201 Created):
```json
{
  "client_id": "microapp-weather",
  "client_secret": "aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW",
  "name": "Weather MicroApp Backend",
  "scopes": "read write notifications:send",
  "is_active": true
}
```

> ⚠️ **Important**: The `client_secret` is only returned once. Store it securely.

---

### User Context Token

Generates a token with user context for MicroApp frontends.

**Endpoint**: `POST /oauth/token/user`

**Authentication**: None (called by Core Service)

**Content-Type**: `application/x-www-form-urlencoded`

**Request Body**:
```
grant_type=user_context&user_email=user@example.com&microapp_id=microapp-news&scope=read write
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImRldi1rZXkiLCJ0eXAiOiJKV1QifQ...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

### Get JWKS

Retrieves public keys for token validation.

**Endpoint**: `GET /.well-known/jwks.json`

**Authentication**: None (public endpoint)

**Response** (200 OK):
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
    }
  ]
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "invalid_request",
  "error_description": "Missing required parameter: microapp_id"
}
```

### 401 Unauthorized
```json
{
  "error": "unauthorized",
  "error_description": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "forbidden",
  "error_description": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "not_found",
  "error_description": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "server_error",
  "error_description": "An internal error occurred"
}
```

---

## API Endpoint Summary

### Core Service (`/api/v1`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Get current user info | User |
| GET | `/users` | Get all users | User |
| POST | `/users` | Create/update user | User |
| DELETE | `/users/{email}` | Delete user | User |
| GET | `/microapps` | Get all MicroApps | User |
| GET | `/microapps/{id}` | Get MicroApp by ID | User |
| POST | `/microapps` | Create/update MicroApp | User |
| DELETE | `/microapps/{id}` | Deactivate MicroApp | User |
| GET | `/user-config` | Get user configuration | User |
| POST | `/user-config` | Update user configuration | User |
| POST | `/notifications/register` | Register device token | User |
| POST | `/oauth/exchange` | Exchange token | User |
| GET | `/.well-known/jwks.json` | Get public keys | Public |
| POST | `/files` | Upload file | User |
| DELETE | `/files` | Delete file | User |
| GET | `/public/micro-app-files/download/{fileName}` | Download file | Public |

### Core Service - Service Routes (`/api/v1/services`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/notifications/send` | Send push notification | Service |

### Token Service

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/oauth/token` | Get service token | Basic Auth |
| POST | `/oauth/clients` | Create OAuth client | None |
| POST | `/oauth/token/user` | Get user context token | None |
| GET | `/.well-known/jwks.json` | Get public keys | Public |
| POST | `/admin/reload-keys` | Reload signing keys | None |
| POST | `/admin/active-key` | Set active signing key | None |

---

## Rate Limiting

> ⚠️ **Production Recommendation**: Implement rate limiting to prevent abuse.

Suggested limits:
- **User endpoints**: 100 requests/minute per user
- **Service endpoints**: 1000 requests/minute per client
- **Public endpoints**: 10 requests/minute per IP

---

## Next Steps

- **[Architecture Overview](../architecture/overview.md)**: Understand how these APIs work together
- **[Installation Guide](../getting-started/installation.md)**: Set up the development environment
- **[MicroApp Developer Guide](https://github.com/LSFLK/superapp-mobile/blob/main/frontend/docs/MICROAPP_DEVELOPER_GUIDE.md)**: Build MicroApps that use these APIs
