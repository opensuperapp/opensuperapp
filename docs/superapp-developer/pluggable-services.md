# Pluggable Services Guide

Learn how to create custom implementations of pluggable services in the SuperApp Core Service.

## Overview

The SuperApp Core Service uses a **pluggable architecture** that allows you to swap implementations of key services without changing the core application logic. This enables you to:

- Use different storage backends (database, S3, Azure Blob Storage)
- Integrate with different user management systems
- Extend functionality without modifying core code

## Available Pluggable Services

### 1. File Service

Handles file storage and retrieval for microapp packages and user uploads.

**Interface**: `fileservice.FileService`

**Built-in Implementations**:
- `db` - Store files in MySQL database (default)

**Configuration**:
```bash
FILE_SERVICE_TYPE=db
FILE_SERVICE_BACKEND_BASE_URL=https://api.superapp.com
```

### 2. User Service

Manages user data and profiles.

**Interface**: `userservice.UserService`

**Built-in Implementations**:
- `db` - Store users in MySQL database (default)

**Configuration**:
```bash
USER_SERVICE_TYPE=db
```

---

## How Pluggable Services Work

The pluggable service system uses a **registry pattern** with these key components:

1. **Interface** - Defines the contract (e.g., `FileService`)
2. **Registry** - Global registry that stores implementations
3. **Registration** - Implementations register themselves in `init()`
4. **Resolution** - Core service retrieves implementation by name

### Dynamic Configuration System

The core service automatically passes **all environment variables with matching prefixes** to your plugin's `New()` function:

**For File Service:**
- Prefix: `FILE_SERVICE_`
- Example: `FILE_SERVICE_BACKEND_BASE_URL`, `FILE_SERVICE_S3_BUCKET_NAME`

**For User Service:**
- Prefix: `USER_SERVICE_`
- Example: `USER_SERVICE_API_URL`, `USER_SERVICE_TIMEOUT`


---

## Creating Plugin Implementations

You can create your plugin implementation **outside the main repository** as a separate Go module. This is recommended for:

- Proprietary implementations
- Third-party integrations
- Reusable plugins across projects

### Step-by-Step: Implementing the File Service Plugin

#### 1. Create External Module

```bash
# Create your plugin repository
mkdir superapp-file-service-plugin
cd superapp-file-service-plugin
go mod init github.com/yourorg/superapp-file-service-plugin
```

#### 2. Implement the Plugin

```go
// file-service-plugin.go
package file_service_plugin

// import the interface from main repo
import (
    fileservice "go-backend/plugins/file-service"
)

// Register your plugin
func init() {
    fileservice.Registry.Register("<your-service-name>", New)
}

// This function will be called when the service is initialized
// It should return an implementation of FileService interface
// and an error if the initialization fails
func New(config map[string]any) (fileservice.FileService, error) {
    // config contains:
    // - FILE_SERVICE_BACKEND_BASE_URL
    // - FILE_SERVICE_S3_BUCKET_NAME
    // - FILE_SERVICE_S3_REGION ...
    // - Any other env vars you define
     
}


// Implement the interface

type newFileService struct {
    client *s3.S3
    otherFields string
}

func (s *newFileService) UploadFile(fileName string, content []byte) (string, error) {
    ...
}

func (s *newFileService) DeleteFile(fileName string) error {
    ...
}
```

#### 3. Publish Your Module

```bash
git init
git add .
git commit -m "Initial custom file service plugin implementation"
git tag v1.0.0
git push origin main --tags
```

#### 4. Import in Main Repo

In the main SuperApp repository:

```bash
# Add your external plugin as a dependency
cd backend-services/core
go get github.com/yourorg/superapp-file-service-plugin@v1.0.0
```

Update `plugins/plugins.go`:

```go
package plugins

import (
    // Default Implementations
    _ "go-backend/plugins/file-service/default-db"
    _ "go-backend/plugins/user-service/default-db"
    
    // Your custom plugin
    _ "github.com/yourorg/superapp-file-service-plugin"
)
```

#### 5. Configure and Use

```bash
# .env
FILE_SERVICE_TYPE=<your-service-name>
FILE_SERVICE_YOUR_CUSTOM_ENV_VAR=your-value
FILE_SERVICE_YOUR_CUSTOM_ENV_VAR_2=your-value
...
```

---


> **Important**: The blank import (`_`) ensures the `init()` function runs and registers your service.


## Creating a Custom User Service

Follow the same process as above.

---
See `backend-services/core/plugins/` for interface definitions.

- See `backend-services/core/plugins/file-service/default-db` for an example implementation.
- See `backend-services/core/plugins/user-service/default-db` for an example implementation.


---

## Next Steps

- [Core Service Guide](backend-core.md) - Core service architecture
- [Deployment Guide](deployment.md) - Production deployment
- [API Reference](../api/reference.md) - API documentation
