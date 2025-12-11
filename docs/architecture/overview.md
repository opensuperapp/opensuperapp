# Architecture Overview

This document provides a comprehensive overview of LSF SuperApp Mobile architecture, including major components, technologies, and data flows.

## System Architecture

![System Architecture](../images/architecture_diagram.png)


### Major Components

| Component | Location | Primary Technologies | Key Responsibilities |
|---|---|---|---|
| **Mobile Application** | `frontend/` | React Native, Expo SDK, Redux Toolkit, TypeScript, React Navigation, Expo WebView | User authentication, MicroApp container & lifecycle, WebView bridge, Push notifications, Local secure storage, OpenTelemetry |
| **Core Service** | `backend-services/core/` | Go, Chi Router, GORM, Firebase Admin SDK, JWT validation | MicroApp CRUD & versioning, User management, Device token registration, Push notification dispatch, File I/O, Token exchange, Auth middleware |
| **Token Service** | `backend-services/token-service/` | Go, Chi Router, GORM, JWT, OAuth2 | JWT generation (S2S), JWKS endpoint, OAuth2 client credentials, User context tokens, Zero-downtime key rotation, Client secret management |
| **Admin Portal** | `superapp-admin-portal/` | React, Vite, TypeScript, Axios | MicroApp upload & configuration, Version management, Role-based access control, User management interface |

### Pluggable Services

The SuperApp architecture supports pluggable services, allowing for flexible integration of various functionalities. These services can be independently developed, deployed, and scaled.

*   [Pluggable Services Overview](../superapp-developer/pluggable-services.md)

### API Documentation

See API documentation for more details.

*   [API Documentation](../api/reference.md)

## Database Schema

The SuperApp uses MySQL 8.0+ with a normalized relational schema supporting microapps, users, notifications, and OAuth clients.

### Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ user_config : "has"
    users {
        varchar(100) email PK "Primary Key"
        varchar(50) firstName
        varchar(50) lastName
        varchar(255) userThumbnail
        varchar(100) location
    }
    
    user_config {
        bigint id PK "Auto Increment"
        varchar(191) email FK "Foreign Key"
        varchar(191) config_key
        json config_value
        tinyint active "1=active, 0=inactive"
        varchar(191) created_by
        varchar(191) updated_by
        timestamp created_at
        timestamp updated_at
    }
    
    micro_app ||--o{ micro_app_version : "has versions"
    micro_app ||--o{ micro_app_role : "has roles"
    micro_app ||--o{ micro_app_config : "has config"
    micro_app {
        int id PK "Auto Increment"
        varchar(255) micro_app_id UK "Unique Key"
        varchar(1024) name
        text description
        varchar(1024) promo_text
        varchar(2083) icon_url
        varchar(2083) banner_image_url
        varchar(319) created_by
        varchar(319) updated_by
        datetime created_at
        datetime updated_at
        tinyint active "1=active, 0=deleted"
        tinyint mandatory "1=mandatory, 0=optional"
    }
    
    micro_app_version {
        int id PK "Auto Increment"
        varchar(255) micro_app_id FK "Foreign Key"
        varchar(32) version "e.g., 1.0.0"
        int build "Build number"
        text release_notes
        varchar(2083) icon_url
        varchar(2083) download_url
        varchar(319) created_by
        varchar(319) updated_by
        datetime created_at
        datetime updated_at
        tinyint active
    }
    
    micro_app_role {
        int id PK "Auto Increment"
        varchar(255) micro_app_id FK "Foreign Key"
        varchar(255) role "Role name"
        tinyint active
        varchar(319) created_by
        varchar(319) updated_by
        datetime created_at
        datetime updated_at
    }
    
    micro_app_config {
        bigint id PK "Auto Increment"
        varchar(255) micro_app_id FK "Foreign Key"
        varchar(191) config_key
        json config_value
        tinyint active
        varchar(319) created_by
        varchar(319) updated_by
        datetime created_at
        datetime updated_at
    }
    
    device_tokens {
        bigint id PK "Auto Increment"
        varchar(255) user_email "References users.email"
        text device_token "FCM/APNS token"
        enum platform "ios, android"
        timestamp created_at
        timestamp updated_at
        tinyint is_active
    }
    
    notification_logs {
        bigint id PK "Auto Increment"
        varchar(255) user_email "References users.email"
        varchar(255) title
        text body
        json data
        timestamp sent_at
        varchar(50) status "sent, failed"
        varchar(100) microapp_id "References micro_app"
    }
    
    o_auth2_clients {
        bigint id PK "Auto Increment"
        varchar(255) client_id UK "Unique Key"
        varchar(255) client_secret "SHA256 hashed"
        varchar(255) name
        varchar(1024) scopes "Comma-separated"
        tinyint is_active
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at "Soft delete"
    }
    
    micro_apps_storage {
        varchar(255) file_name PK "Primary Key"
        mediumblob blob_content "Binary file data"
    }
```

### Table Descriptions

#### Core Tables

| Table Name | Description | Primary Key | Foreign Key | Unique Constraints | Other Notes |
|---|---|---|---|---|---|
| **users** | Stores user profile information | `email` | - | - | No timestamps (managed externally by IDP) |
| **user_config** | User-specific configuration settings (JSON) | - | `email` → `users.email` (CASCADE) | (`email`, `config_key`) | - |
| **micro_app** | MicroApp metadata and catalog information | - | - | `micro_app_id` (business identifier) | Soft delete via `active` flag |
| **micro_app_version** | Version history for each microapp | - | `micro_app_id` → `micro_app.micro_app_id` (CASCADE) | (`micro_app_id`, `build`) | - |
| **micro_app_role** | Role-based access control for microapps | - | `micro_app_id` → `micro_app.micro_app_id` (CASCADE) | (`micro_app_id`, `role`) | - |
| **micro_app_config** | Per-microapp configuration (JSON) | - | `micro_app_id` → `micro_app.micro_app_id` (CASCADE) | (`micro_app_id`, `config_key`) | - |

#### Other Tables

| Table Name | Description | Primary Key | Foreign Key | Unique Constraints | Other Notes |
|---|---|---|---|---|---|
| **device_tokens** | FCM/APNS device tokens for push notifications | `id` | - | - | Indexed on: `user_email`, `platform`, `is_active`. No FK (flexible design for external user systems) |
| **notification_logs** | Audit log of all sent notifications | `id` | - | - | Indexed on: `user_email`, `microapp_id`, `sent_at`, `status`. No FK (flexible design) |
| **o_auth2_clients** | OAuth2 client credentials for microapp backends | `id` | - | `client_id` | Soft delete via `deleted_at` timestamp. Secrets stored as SHA256 hash |
| **micro_apps_storage** | Binary file storage for microapp packages | `file_name` | - | - | Stores up to 16MB per file (MEDIUMBLOB) |

### Foreign Key Relationships

```mermaid
graph TD
    users[users<br/>PK: email] -->|CASCADE| user_config[user_config<br/>FK: email]
    
    micro_app[micro_app<br/>PK: micro_app_id] -->|CASCADE| micro_app_version[micro_app_version<br/>FK: micro_app_id]
    micro_app -->|CASCADE| micro_app_role[micro_app_role<br/>FK: micro_app_id]
    micro_app -->|CASCADE| micro_app_config[micro_app_config<br/>FK: micro_app_id]
    

```

**CASCADE Rules:**
- When a `micro_app` is deleted, all related versions, roles, and configs are automatically deleted
- When a `user` is deleted, all their configurations are automatically deleted
- When a `micro_app_id` is updated, it propagates to all related tables

### Indexing Strategy

**Primary Indexes:**

- All tables have primary keys (auto-increment or natural key).  
- Unique constraints on business identifiers (`micro_app_id`, `client_id`, `email`).  

**Foreign Key Indexes:**

- All FK columns are indexed for JOIN performance.  
- Composite unique indexes on (`micro_app_id`, `build`), (`email`, `config_key`).  

**Query Optimization Indexes:**

- `active` flags for soft-delete queries.  
- `user_email` for user-specific lookups.  
- `platform`, `status`, `sent_at` for filtering.  
- `created_at` for time-based queries.  

### Data Types & Constraints

| Type | Usage | Max Size |
|------|-------|----------|
| `VARCHAR(100-319)` | Emails, names | 319 chars (max email) |
| `VARCHAR(2083)` | URLs | 2083 chars (IE max URL) |
| `TEXT` | Large text | 64KB |
| `MEDIUMBLOB` | Binary files | 16MB |
| `JSON` | Structured config | 1GB (theoretical) |
| `DATETIME` | Timestamps | Date + Time |
| `TIMESTAMP` | Auto-updated | Date + Time |
| `TINYINT(1)` | Boolean flags | 0 or 1 |
| `ENUM` | Fixed values | Platform types |

**Character Set:** `utf8mb4` (full Unicode including emojis)  
**Collation:** `utf8mb4_0900_ai_ci` (accent-insensitive, case-insensitive)

---

## Data Flow

### Flow 1: User Authentication

```mermaid
sequenceDiagram
    participant User
    participant App as Mobile App
    participant ExternalIDP as External IDP
    participant CS as Core Service

    User->>App: Opens mobile app
    User->>App: Taps on login
    App->>ExternalIDP: Redirects for authentication
    User->>ExternalIDP: Enters credentials
    ExternalIDP-->>App: Returns user access token (after validation)
    App->>App: Stores token securely
    App->>CS: Calls Core Service with token (fetch user profile)
    CS-->>App: Returns user profile
    App->>User: Displays home screen
```

### Flow 2: MicroApp Loading 

```mermaid
sequenceDiagram
    participant User
    participant App as Mobile App
    participant CS as Core Service
    participant TS as Token Service
    participant MicroAppFE as MicroApp Frontend

    User->>App: Navigates to "My Apps"
    App->>User: Displays installed MicroApps

    User->>App: Taps "Store"
    App->>CS: Requests MicroApp Catalog
    CS-->>App: Returns MicroApp Catalog
    App->>User: Displays MicroApp Store/Catalog

    User->>App: Selects and taps "Install MicroApp X"
    App->>CS: Requests MicroApp X manifest/assets
    CS-->>App: Returns MicroApp X manifest/assets
    App->>App: Stores MicroApp X locally (manifest, assets)
    App->>App: Adds MicroApp X to "My Apps" list
    App->>User: Displays updated "My Apps" list

    User->>App: Taps on installed MicroApp X
    App->>App: Initializes WebView
    App->>TS: Requests MicroApp Token (if needed, with user/MicroApp context)
    TS-->>App: Returns MicroApp Token
    App->>MicroAppFE: Loads MicroApp X in WebView (with token if applicable)
    MicroAppFE-->>App: Loads MicroApp X content
    App->>User: Displays MicroApp X in WebView
```

---

## Authentication Architecture

### Dual IDP Design

The platform uses **two separate Identity Providers**:

| IDP | Purpose | Technology | Audience |
|-----|---------|------------|----------|
| **External IdP** | User authentication | OIDC/OAuth2 | Mobile app users, Admin Portal users |
| **Token Service** (Internal) | Service authentication | OAuth2 + JWT | MicroApp backends |


### Token Types

| Token Type | Issuer | Audience | Subject | Use Case |
|------------|--------|----------|---------|----------|
| **User Token** | External IdP | SuperApp | User email | Mobile app → Core Service |
| **MicroApp Token** | Token Service | MicroApp ID | User email | MicroApp frontend → MicroApp backend |
| **Service Token** | Token Service | `superapp-api` | MicroApp ID | MicroApp backend → Core Service |


### How Tokens are used

#### Pattern 1: User Data Access

```mermaid
sequenceDiagram
    participant MA as Mobile App
    participant CS as Core Service
    participant AJ as External IdP JWKS

    MA->>CS: User Token (for user data)
    CS->>CS: Check JWKS cache
    alt JWKS not cached or expired
        CS->>AJ: Request JWKS
        AJ-->>CS: JWKS
        CS->>CS: Cache JWKS
    end
    alt Token Validation
        CS->>CS: Validate User Token using JWKS
        alt Validation success
            CS-->>MA: User-specific data
        else Validation fails
            CS-->>MA: Error: Invalid Token
        end
    end
```

#### Pattern 2: MicroApp Data Access

```mermaid
sequenceDiagram
    participant MAF as MicroApp Frontend
    participant SAF as SuperApp Frontend
    participant CS as Core Service
    participant TS as Token Service
    participant MAB as MicroApp Backend

    MAF->>SAF: Request MicroApp Token (via Bridge)
    SAF->>CS: Request MicroApp Token
    CS->>CS: Validate User's Access Token (via External IdP JWKS)
    CS->>CS: Extract User Information from Access Token
    CS->>TS: Generate MicroApp Token (microapp_id, user_email)
    TS-->>CS: MicroApp Token
    CS-->>SAF: MicroApp Token
    SAF-->>MAF: MicroApp Token
    MAF->>MAB: API Call (MicroApp Token)
    MAB->>CS: Request Token Service's JWKS
    CS->>TS : Fetch JWKS
    TS-->>CS: JWKS
    CS-->>MAB: JWKS
    MAB->>MAB: Validate MicroApp Token using JWKS
    MAB-->>MAF: send requested data
```

#### Pattern 3: Service-to-Service

```mermaid
sequenceDiagram
    participant MAB as MicroApp Backend
    participant CS as Core Service
    participant TS as Token Service

    MAB->>CS: Request Service specific Access Token (client_id, client_secret)
    CS->>TS: Request Service specific Access Token (client_id, client_secret)
    TS->>TS: Validate client_id and client_secret
    alt Validation successful
        TS-->>TS: Generate Service Token
        TS-->>CS: Service Token
        CS-->>MAB: Service Token
        MAB->>CS: Call Core Service Endpoint (Service Token)
        CS->>CS: Validate Service Token (via Token Service's JWKS)
        alt Token valid
            CS->>CS: Invoke requested service
            CS-->>MAB: Service Response
        else Token invalid
            CS-->>MAB: Error: Invalid Service Token
        end
    else Validation failed
        TS-->>CS: Error: Invalid Credentials
        CS-->>MAB: Error: Service Token Generation Failed
    end
```

## Scalability & Performance

### Horizontal Scaling

- **Stateless Services**: Core and Token services are stateless
- **Database Connection Pooling**: Configurable pool sizes
- **Load Balancing**: Services can run multiple instances

### Caching Strategies

- **JWKS Caching**: Clients cache public keys (1 hour TTL)
- **MicroApp Caching**: Mobile app stores MicroApps locally
- **Database Indexing**: Optimized queries on frequently accessed tables

### Observability

- **OpenTelemetry**: Metrics collection from mobile app
- **Prometheus**: Time-series metrics storage
- **Structured Logging**: JSON logs with `slog` (Go services)

### Key Metrics Collected for monitoring performance   

- `api_request_count_total`  
- `api_request_duration_bucket`  
- `microapp_load_count_total`  
- `auth_token_refresh_count_total`  



## Next Steps

- **[API Reference](../api/reference.md)**: Explore all available endpoints
- **[Installation Guide](../getting-started/installation.md)**: Set up the development environment
- **[MicroApp Development](https://github.com/LSFLK/superapp-mobile/blob/main/frontend/docs/MICROAPP_DEVELOPER_GUIDE.md)**: Build your first MicroApp
