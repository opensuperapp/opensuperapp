# Getting Started with SuperApp

Welcome! This guide will help you get started with the SuperApp platform based on your role.

---

## Choose Your Path

Select the role that best describes what you want to do:

<div class="grid cards" markdown>

-   :material-server-network:{ .lg .middle } __SuperApp Platform Deployer__

    ---

    You're setting up and deploying the complete SuperApp infrastructure for your organization.

    **Your responsibilities:**
    
    - Deploy backend services (Core & Token Service)
    - Set up databases and infrastructure
    - Configure external authentication providers
    - Build and deploy the mobile application
    - Monitor system health and performance
    
    <br>
    **Start here:**

    [:octicons-arrow-right-24: Deployment Guide](../superapp-developer/deployment.md){ .md-button .md-button--primary }
    
    <br>
    **Next:**
    
    - [Architecture Overview](../architecture/overview.md) - Understand the system
    - [Core Service Guide](../superapp-developer/backend-core.md) - Main API service
    - [Token Service Guide](../superapp-developer/backend-token-service.md) - Internal OAuth2/JWT service
    - [Mobile App Guide](../superapp-developer/mobile-app.md) - Mobile app setup
    - [Observability](../superapp-developer/observability.md) - Monitoring setup
    - [Pluggable Backend Services](../superapp-developer/pluggable-services.md) - Custom File and User Management Services
    - [Bridge Guide](../microapp-developer/bridge-api.md) - Bridge Overview

-   :material-code-braces:{ .lg .middle } __MicroApp Developer__

    ---

    You're building web applications that will run inside the SuperApp container.

    **Your responsibilities:**
    
    - Develop web apps using your preferred framework
    - Integrate with SuperApp via the Bridge API
    - Access native device features
    - Package and publish your micro-apps
    - Handle authentication and authorization

    <br>
    **Start here:**

    [:octicons-arrow-right-24: MicroApp Developer Guide](../microapp-developer/getting-started.md){ .md-button .md-button--primary }
    
    <br>
    **Next:**
    
    - [Bridge API Reference](../microapp-developer/bridge-api.md#available-bridge-functions) - Native feature access
    - [Push Notifications](../microapp-developer/push-notifications.md) - Send notifications to users
    - [Sample MicroApps](https://github.com/LSFLK/superapp-mobile/tree/main/sample-microapps)


-   :material-shield-account:{ .lg .middle } __Platform Administrator__

    ---

    You're managing the SuperApp platform, users, and micro-apps through the admin portal.

    **Your responsibilities:**
    
    - Manage micro-app catalog and versions
    - Upload and publish micro-apps
    - Create OAuth clients for micro-app backends
    - Manage user access and permissions
    - Configure platform settings

    <br>
    **Start here:**

    [:octicons-arrow-right-24: Admin Portal Guide](../admin/portal-guide.md){ .md-button .md-button--primary }
    

</div>

---

## Need Help?

!!! question "Not sure which path to choose?"
    - **Want to set up the platform?** → Start with SuperApp Platform Deployer
    - **Want to build apps for the platform?** → Start with MicroApp Developer
    - **Want to manage the platform?** → Start with Platform Administrator

---

## Additional Resources

- [:material-github: GitHub Repository](https://github.com/LSFLK/superapp-mobile) - Source code and issues
- [:material-file-document: Architecture Overview](../architecture/overview.md) - System design and components
- [:material-api: API Reference](../api/reference.md) - Complete API documentation
- [:material-book-open: Full Documentation](../index.md) - Back to documentation home
