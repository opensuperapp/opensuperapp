# Push Notifications Guide

Learn how to send push notifications to users from your microapp backend.

---

## Overview

The SuperApp provides a notification service that allows microapp backends to send push notifications to users. The service uses **OAuth2 Client Credentials** flow for authentication.

---

## Prerequisites

Before you can send notifications, you need:

1. **OAuth2 Credentials** - Contact the SuperApp admin to register your microapp
2. **Backend Service** - A server-side application (never send from client-side)
3. **HTTPS Endpoint** - SuperApp notification API endpoint

---

## Authentication Flow

### Step 1: Obtain Credentials

Contact the SuperApp administrator to register your microapp and receive:

- `client_id` - Your microapp identifier
- `client_secret` - Secret key for authentication

!!! danger "Security Warning"
    **Never expose your `client_secret` in:**
    
    - Client-side code
    - Public repositories
    - Browser applications
    - Mobile app code
    
    Always use server-to-server authentication only!

### Step 2: Request Access Token

Exchange your credentials for a JWT access token.

**Endpoint:** `POST /oauth/token` (Public - No authentication required)

```bash
curl -X POST https://api.superapp.com/oauth/token \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=client_credentials" \
    -d "client_id=YOUR_CLIENT_ID" \
    -d "client_secret=YOUR_CLIENT_SECRET"
```


**Response:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1Ni...",
  "token_type": "Bearer",
  "expires_in": 7200
}
```

**Token Properties:**

- Valid for **2 hours** (7200 seconds)
- Should be cached and reused
- Request a new token before expiry

---

## Sending Notifications

### Step 3: Send Push Notification

Use the access token to send notifications to users.

**Endpoint:** `POST /api/v1/services/notifications/send` (Requires Bearer token)

```bash
curl -X POST https://api.superapp.com/api/v1/services/notifications/send \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
    "user_emails": ["user@example.com"],
    "title": "Order Update",
    "body": "Your order #12345 has shipped!",
    "data": {
        "orderId": "12345",
        "action": "view_order"
    }'
```

### Request Payload

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_emails` | string[] | Yes | Array of user email addresses |
| `title` | string | Yes | Notification title |
| `body` | string | Yes | Notification body text |
| `data` | object | No | Custom key-value pairs for deep linking |

### Response

```json
{
  "success": 2,
  "failed": 0,
  "message": "Notifications sent successfully"
}
```

---

## Best Practices

### 1. Token Management

✅ **Do:**
- Cache tokens and reuse until expiry
- Refresh tokens before they expire
- Implement retry logic for 401 errors

❌ **Don't:**
- Request a new token for every notification
- Store tokens in client-side code
- Hardcode credentials

### 2. Security

✅ **Do:**
- Use environment variables for credentials
- Always use HTTPS
- Use Basic Auth header for production
- Implement rate limiting

❌ **Don't:**
- Commit secrets to version control
- Send credentials in URL parameters
- Expose API in client-side code

### 3. Error Handling

```javascript
async function sendWithRetry(notifier, userEmails, title, body, data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await notifier.sendNotification(userEmails, title, body, data);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

### 4. Notification Content

✅ **Do:**
- Keep titles under 50 characters
- Keep body under 200 characters
- Use meaningful data for deep linking
- Test on actual devices

❌ **Don't:**
- Send HTML in notifications
- Include sensitive data
- Send too frequently

---

## API Reference

### Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/oauth/token` | POST | None | Get access token |
| `/api/v1/services/notifications/send` | POST | Bearer | Send notification |

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 400 | Bad Request | Check payload format |
| 401 | Unauthorized | Token expired or invalid |
| 403 | Forbidden | Invalid credentials |
| 429 | Too Many Requests | Implement rate limiting |
| 500 | Server Error | Retry with backoff |

---

## Troubleshooting

### Token Issues

**Problem:** Getting 401 Unauthorized

**Solutions:**
- Verify your `client_id` and `client_secret`
- Check if token has expired
- Ensure you're using Bearer authentication
- Contact admin to verify your client is active

### Notification Not Received

**Possible causes:**
- User hasn't installed the SuperApp
- User has disabled notifications
- Invalid user email
- Device token not registered

**Debug steps:**
1. Check API response for success/failed counts
2. Verify user email is correct
3. Test with a known working user
4. Check device notification settings

---

## Additional Resources

- [OAuth2 Client Credentials Flow](https://oauth.net/2/grant-types/client-credentials/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [API Reference](../api/reference.md)
