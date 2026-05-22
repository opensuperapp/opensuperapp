# Pluggable Service Architecture Guide

This guide explains how to plug in different service implementations (like File Service, User Service, etc.) without touching the core application logic.

## Overview

The application uses a **compile-time plugin system**. You select which services to include in your build by importing them in a dedicated plugins file, and you select which one to *use* at runtime via environment variables.

## 1. How to Plug in a Service

The **ONLY** file you need to edit to add a new service is:
`plugins/plugins.go`

This file acts as your **build configuration**.

### Example: Adding S3 Support

1.  **Open `plugins/plugins.go`**
2.  **Add the import** for the new service package:

```go
package plugins

import (
    // --- PLUGINS REGISTRY ---
    _ "go-backend/plugins/fileservice/local" // Existing local service
    _ "github.com/myorg/s3-fileservice"      // <--- Add your new service here
)
```

3.  **Configure Environment**
    Set the `FILE_SERVICE_TYPE` in your `.env` file to match the name registered by the new service (e.g., "s3").
    
    **IMPORTANT**: Any custom configuration variables for your service MUST start with the specific prefix for that service type.
    - For File Service: `FILE_SERVICE_`
    - For User Service: `USER_SERVICE_` (Future)

```bash
FILE_SERVICE_TYPE=s3
FILE_SERVICE_S3_BUCKET=my-bucket
FILE_SERVICE_S3_REGION=us-east-1
```

**That's it!** You do not need to touch `main.go`, `router.go`, `config.go`, or any other internal files.

---

## 2. Creating a New Service Implementation

If you are **developing** a new service (e.g., an S3 implementation), follow these steps:

1.  **Create a new package** (e.g., `plugins/fileservice/s3` or in a separate repo).
2.  **Implement the Interface**: Implement `fileservice.FileService`.
3.  **Register in `init()`**:

```go
package s3

import "go-backend/plugins/fileservice"

func init() {
    // Register with the name "s3"
    fileservice.Registry.Register("s3", New)
}

func New(config map[string]any) (fileservice.FileService, error) {
    // Read config and return your implementation
    // 'config' contains environment variables starting with FILE_SERVICE_
    bucket, _ := config["FILE_SERVICE_S3_BUCKET"].(string)
    region, _ := config["FILE_SERVICE_S3_REGION"].(string)
    
    if bucket == "" {
         return nil, fmt.Errorf("FILE_SERVICE_S3_BUCKET is required")
    }

    return &s3FileService{bucket: bucket, region: region}, nil
}
```

Once created, anyone can use it by adding the import to `plugins/plugins.go`.

## 3. Extending to Other Service Types (e.g., User Service)

The architecture is generic. To add a pluggable **User Service**:

1.  **Define Interface**: Create `plugins/userservice/userservice.go` with the interface and a global `Registry`.
2.  **Initialize**: In `router.go`, initialize it using the config prefix `USER_SERVICE_`:

```go
userService, err := userservice.Registry.Get(cfg.UserServiceType, cfg.GetPluginConfig("USER_SERVICE_"))
```

3.  **Implement**: Create implementations (e.g., `plugins/userservice/ldap`) that register themselves.
4.  **Configure**: In `.env`, use `USER_SERVICE_LDAP_HOST`, etc.

## 4. Core Architecture (For Maintainers)

-   **`cmd/server/main.go`**: Entry point. Imports `plugins` package.
-   **`plugins/plugins.go`**: **Plugin Registry**. Contains imports for active services.
-   **`plugins/fileservice`**: Defines the `FileService` interface and global registry.
-   **`internal/registry`**: Generic service registry.
-   **`internal/config`**: Loads all environment variables and filters them by prefix (e.g., `FILE_SERVICE_`, `USER_SERVICE_`) for plugins.
