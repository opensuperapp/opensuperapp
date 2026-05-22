# Backend Services

This directory contains all backend services for the LSF Super App platform. The services are designed to be independently deployable microservices that work together to power the mobile application.

📚 **[View Complete Documentation](https://opensource.lk/superapp-mobile/)** - Deployment guides, API references, and architecture details 

## Services

### 🚀 Core Service (`services/core/`)
**Port:** 9090  
**Purpose:** Main backend API service that handles all business logic for the super app

**Key Features:**
- Microapp management and versioning
- User configuration and preferences
- Push notifications via Firebase
- File storage and management
- Dual IDP authentication (Asgardeo + internal token service)

**Tech Stack:** Go, Chi Router, GORM, Firebase Admin SDK


---

### 🔐 Token Service (`services/token-service/`)
**Port:** 8081  
**Purpose:** Internal Identity Provider for service-to-service authentication

**Key Features:**
- JWT token generation and validation
- JWKS endpoint for public key distribution
- Zero-downtime key rotation support
- OAuth2 client credentials flow
- User token exchange for microapp frontends

**Tech Stack:** Go, Chi Router, GORM, JWT

---
