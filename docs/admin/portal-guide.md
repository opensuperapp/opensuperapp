# Admin Portal Guide

Complete guide for SuperApp administrators to manage users, micro-apps, and system configuration.

## Overview

The SuperApp Admin Portal is a web-based interface for managing the SuperApp platform. As an administrator, you can:

- **Manage MicroApps**: Create, upload, version, and configure micro-apps
- **Manage Users**: Create and manage user accounts
- **Create OAuth Clients**: Generate credentials for microapp backends (Coming Soon)

!!! note
    OAuth client creation is required only for microapps that need to send push notifications.

---

## Accessing the Admin Portal

### Login

1. Navigate to the admin portal URL
2. Click "Sign In"
3. Authenticate using your admin credentials
4. You'll be redirected to the admin dashboard

---

## Managing MicroApps

### Creating a New MicroApp

1. **Navigate to MicroApps**

    - Click "MicroApps" in the sidebar
    - Click "+ New MicroApp" button

2. **Fill in Basic Information**

    - **App ID**: unique-app-id (e.g., "news-reader")
    - **Name**: Display name (e.g., "News Reader")
    - **Description**: Brief description of the app
    - **Promo Text**: (optional) Marketing text for app store

3. **Upload Assets**

    - **Icon**: Square image (512x512px recommended)
    - **Banner**: (optional) Wide image (1920x1080px recommended)

4. **Version Details**

    - **Version**: Initial version (e.g., "1.0.0")
    - **Build Number**: Internal build number (auto-incremented)
    - **Release Notes**: Description of changes in this version
    - **App Package**: Upload the ZIP file of the built microapp

5. **Roles & Capabilities**

    - **Roles/Groups**: Assign roles/groups required to access this microapp (use + to add multiple)
    - **Capabilities**: Specify which bridge functions this micro-app can access (use + to add multiple)

6. **Review and Click "Create Micro App"**

### Adding a Version

In Micro Apps Dashboard:

1. **Click on three dots in right below corner of the MicroApp card** in the list
2. **Click "Add New Version"**
3. **Fill in Version Details**
   ```
   Version: 1.0.1 (semantic versioning)
   Build Number: (auto incremented)
   Release Notes: Description of changes
   App Package: Upload new ZIP file
   ```
4. **Click "Add Version"**

### Updating a MicroApp

In Micro Apps Dashboard:

1. **Click on three dots in right below corner of the MicroApp card** in the list
2. **Click "Edit Information"**
3. Update fields as needed
4. Click "Update"

### Deactivating a MicroApp

In Micro Apps Dashboard:

1. **Click on three dots in right below corner of the MicroApp card** in the list
2. **Click "Delete"**
3. Confirm the action
4. The microapp will no longer appear in the mobile app store

---

## Creating OAuth Clients for MicroApps

!!! warning
    This feature under development. OAuth client creation will be available in future releases.


### Step 1: Create OAuth Client

...

> **⚠️ Critical**: The `client_secret` is only shown once. Save it immediately!

### Step 2: Store Credentials Securely

...

### Step 3: Provide to MicroApp Developer

Send the credentials to the microapp backend developer:

```
Client ID: microapp-news
Client Secret: aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW
Token Endpoint: https://api.superapp.com/oauth/token
```

The developer will use these to authenticate their backend with the SuperApp API.

### Available Scopes

| Scope | Description |
|-------|-------------|
| `notifications:send` | Send push notifications to users |

---

## Managing Users

### Creating a User

The SuperApp maintains a local user database to store additional user profile information (like location, thumbnail, preferences) that may not be available from your External IdP. This allows the platform to enrich user profiles and provide a better user experience across microapps.

1. **Navigate to Users**

    - Click "Users" in the sidebar
    - Click "+ Add User" button

2. **Fill in User Details**

    - **Email**: user@example.com
    - **First Name**: John
    - **Last Name**: Doe
    - **Location**: New York, USA (optional)
    - **User Thumbnail**: Profile picture URL (optional)

3. **Click "Create User"**

!!! note 
    Users must also be created in your External IdP for authentication. The SuperApp database stores additional profile information only.

### Bulk User Import
1. **Navigate to Users**

    - Click "Users" in the sidebar
    - Click "+ Add Users" button

2. **Click Bulk Add**
3. **Upload CSV File**

    - Prepare a CSV file with columns: email, first_name, last_name, location, thumbnail_url
    - Click "Upload CSV/JSON" and select your CSV/JSON
    - Click "Create"

### Deleting a User

1. Navigate to the user
2. Click "Delete"
3. Confirm the action

!!! note 
    This only deletes the user from the SuperApp database, not from the External IdP.

---


## Best Practices

### MicroApp Management

- Use semantic versioning (1.0.0, 1.0.1, 1.1.0, 2.0.0)
- Test microapps thoroughly before marking as "latest"
- Keep old versions available for rollback
- Use descriptive names and clear descriptions
- Optimize images (compress icons and banners)
- Document configuration keys for developers

### OAuth Client Management

- Create separate clients for each microapp backend
- Use descriptive names (e.g., "News Reader Backend")
- Grant minimum required scopes (principle of least privilege)
- Rotate secrets periodically (every 90 days recommended)
- Store secrets in secure secret management systems
- Never commit secrets to version control

### User Management

- Use consistent naming conventions
- Verify email addresses
- Assign appropriate roles
- Remove inactive users regularly
- Keep IDP and SuperApp database in sync

---

## Troubleshooting

### MicroApp Not Appearing in Mobile App

**Possible Causes:**
1. MicroApp is deactivated
2. User doesn't have required role
3. Download URL is inaccessible

**Solutions:**
- Check microapp status (should be active)
- Verify user has matching role
- Test download URL in browser

### OAuth Client Authentication Failing

**Possible Causes:**
1. Wrong client ID or secret
2. Client is inactive
3. Token endpoint URL is incorrect

**Solutions:**
- Verify credentials match exactly
- Check client status in database
- Confirm token endpoint

### User Can't Log In

**Possible Causes:**
1. User doesn't exist in IDP
2. Wrong credentials
3. User is disabled

**Solutions:**
- Verify user exists in External IDP and SuperApp database
- Check user status (should be enabled)
- Reset password if needed
- Check IDP logs for errors

---

## Next Steps

- [API Reference](../api/reference.md) - Complete API documentation
