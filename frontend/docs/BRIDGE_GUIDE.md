# Bridge Communication Guide

## Overview

The Bridge is a communication layer that enables secure, bidirectional messaging between the SuperApp (React Native) and embedded MicroApps (web applications running in WebViews). This architecture allows MicroApps to access native device capabilities and SuperApp services while maintaining security boundaries.

### Underlying Technology

The Bridge leverages React Native's WebView component and the `postMessage` API for cross-context communication:

- **Message Passing**: Uses `window.ReactNativeWebView.postMessage()` for MicroApp → SuperApp communication
- **Promise System**: Promise-based responses for SuperApp → MicroApp communication
- **Type Safety**: Auto-generated TypeScript definitions ensure compile-time safety
- **Registry Pattern**: Centralized function registry for maintainable bridge management

### Architecture

```
┌─────────────────┐    postMessage    ┌─────────────────┐
│   MicroApp      │ ────────────────► │   SuperApp      │
│   (WebView)     │                   │   (React Native)│
│                 │ ◄───────────────  │                 │
└─────────────────┘     Promises      └─────────────────┘
```

## Developer Roles

### SuperApp Developer

Responsible for maintaining the bridge infrastructure and implementing native functionality. This includes:

- Adding new bridge functions to the registry
- Implementing native handlers with device/platform access
- Managing security and permissions
- Updating bridge types and documentation

### MicroApp Developer

Develops web applications that integrate with the SuperApp through the bridge. Responsibilities include:

- Using bridge APIs to access native features via promises
- Handling asynchronous responses with async/await
- Managing bridge state and error conditions
- Following security best practices for cross-origin communication

## For SuperApp Developers: Adding Bridge Functions

### Bridge Function Structure

Each bridge function is defined in `frontend/utils/bridgeRegistry.ts` with the following interface:

```typescript
interface BridgeFunction {
  topic: string; // Unique identifier for the function
  handler: (params: any, context: BridgeContext) => Promise<void> | void;
  // Method names are auto-generated from topic:
  // - request: `request${capitalize(topic)}`
  // - resolve: `resolve${capitalize(topic)}`
  // - reject: `reject${capitalize(topic)}`
  // - helper: `get${capitalize(topic)}`
}
```

### Context Object

The handler receives a `BridgeContext` object, which provides convenient access to relevant data and utility methods for bridge operations. This context includes:

```typescript
interface BridgeContext {
  // Core data
  topic: string; // Current bridge topic (auto-injected)
  appID: string; // Current MicroApp ID
  token: string | null; // Authentication token

  // UI controls
  setScannerVisible: (visible: boolean) => void; // Control QR scanner visibility

  // Communication
  sendResponseToWeb: (method: string, data?: any, requestId?: string) => void; // Send custom response to MicroApp
  pendingTokenRequests: ((token: string) => void)[]; // Token request queue

  // Convenience methods that auto-generate method names from topic
  resolve: (data?: any, requestId?: string) => void; // Auto-generates resolve method name
  reject: (error: string, requestId?: string) => void; // Auto-generates reject method name

  // Optional features (available based on context)
  promptAsync?: () => Promise<any>; // Google authentication prompt
  router?: { back: () => void }; // Navigation router
  insets?: {
    // Safe area insets for device
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  qrScanCallback?: (qrCode: string) => void; // QR scanner result callback
}
```

### Adding a New Bridge Function

Each bridge function lives in its own file under `frontend/utils/bridgeHandlers/`, and `frontend/utils/bridgeHandlers/index.ts` aggregates all handlers into the `BRIDGE_REGISTRY` array which the runtime uses.

1. Create a handler file:

- Path: `frontend/utils/bridgeHandlers/<your_topic>.ts`
- Export a `BRIDGE_FUNCTION` object with `topic` and `handler`. Example template:

```ts
// frontend/utils/bridgeHandlers/example_handler.ts
import { BridgeFunction, BridgeContext } from "./bridgeTypes";

export const BRIDGE_FUNCTION: BridgeFunction = {
  topic: "example_topic",
  handler: async (params: any, context: BridgeContext) => {
    try {
      if (!params) {
        context.reject("Missing parameters");
        return;
      }

      // Your logic here
      const result = { ok: true, received: params };
      context.resolve(result);
    } catch (err) {
      context.reject(err instanceof Error ? err.message : String(err));
    }
  },
};
```

2. Register the handler:

- Import the new file in `frontend/utils/bridgeHandlers/index.ts` and include the exported `BRIDGE_FUNCTION` in the exported `BRIDGE_REGISTRY` array. The registry file is imported by the runtime (`frontend/utils/bridgeRegistry.ts`) so no further changes are necessary.

Smoke test by invoking your bridge function from a micro-app or by loading the WebView and calling `window.nativebridge.request<YourMethod>()`.

### Special Pattern: UI-Triggered Callbacks

Some bridge functions need to handle UI interactions that happen outside the normal message flow (e.g., QR scanner). For these cases, use the callback storage pattern:

```typescript
// Example: QR Scanner Handler
export const BRIDGE_FUNCTION: BridgeFunction = {
  topic: "QR_code",
  handler: async (params, context) => {
    // Show the scanner UI
    context.setScannerVisible(true);

    // Store a callback that will be invoked when QR is scanned
    context.qrScanCallback = (qrCode: string) => {
      context.resolve(qrCode);
    };

    // Note: The actual scanner component will call context.qrScanCallback
    // when a QR code is detected
  },
};
```

The micro-app.tsx file handles retrieving and storing the callback in a ref, which is then invoked by the Scanner component when a code is scanned.

### Best Practices for SuperApp Developers

- **Use descriptive topic names**: Prefer `user_profile` over `data`
- **Implement proper error handling**: Always wrap operations in try/catch
- **Validate parameters**: Check required fields before processing
- **Use async/await**: For operations that may block the UI thread
- **Log operations**: Include console logging for debugging
- **Handle callbacks properly**: For UI-triggered events (like QR scanning), use context callback storage pattern
- **Maintain backward compatibility**: When adding new features, ensure existing MicroApps continue to work

## For MicroApp Developers: Using Bridge APIs

### Initialization

The bridge is automatically injected into MicroApps via WebView JavaScript injection. Access it through:

```javascript
// Check if bridge is available
if (window.nativebridge) {
  // Bridge is ready to use
}
```

### Making Requests

All bridge functions now return promises for cleaner asynchronous handling:

```javascript
// Request token with promise-based API
try {
  const token = await window.nativebridge.requestToken();
} catch (error) {
  console.error("Token request failed:", error);
}

// If you need identity details, decode the JWT payload from token
```

### Promise-based Best Practices

- **Use async/await**: For cleaner, more readable asynchronous code
- **Handle errors**: Always wrap bridge calls in try/catch blocks
- **Type responses**: Use TypeScript for better development experience
- **Avoid blocking**: Don't call bridge functions in render loops

```javascript
// Example with proper error handling
async function loadUserData() {
  try {
    const token = await window.nativebridge.requestToken();
    // const { sub } = decodeJwt(token)
  } catch (error) {
    console.error("Failed to load user data:", error);
    // Handle error appropriately
  }
}
```

## Available Bridge Functions

### Authentication & Identity

#### Token Management

- **Request**: `await window.nativebridge.requestToken()` → `Promise<string>`
- **Purpose**: Retrieve authentication token for API calls
- **Note**: Token is automatically sent when available, also supports request-based retrieval

### User Interface

#### Alert Dialog

- **Request**: `await window.nativebridge.requestAlert({"title": title, "message": message,"buttonText": buttonText})`
- **Purpose**: Display native alert dialog

#### Confirmation Dialog

- **Request**: `await window.nativebridge.requestConfirmAlert({title, message, confirmButtonText, cancelButtonText})` → `Promise<"confirm" | "cancel">`
- **Purpose**: Display native confirmation dialog with two options

#### Close WebView

- **Request**: `window.nativebridge.requestCloseWebview()`
- **Purpose**: Navigate back/close the current MicroApp WebView

### Device Features

#### QR Code Scanner

- **Request**: `await window.nativebridge.requestQRCode()` → `Promise<string>`
- **Purpose**: Activate native QR code scanner and get scanned code
- **Returns**: Promise that resolves with the scanned QR code string

#### Device Safe Area Insets

- **Request**: `await window.nativebridge.requestDeviceSafeAreaInsets()` → `Promise<{top, bottom, left, right}>`
- **Purpose**: Get device safe area insets for proper UI layout

### Data Storage

#### Save Local Data

- **Request**: `await window.nativebridge.requestSaveLocalData({key, value})` → `Promise<void>`
- **Purpose**: Persist data using AsyncStorage
- **Note**: Value will be stored as a string

#### Get Local Data

- **Request**: `await window.nativebridge.requestGetLocalData({key})` → `Promise<{value: string | null}>`
- **Purpose**: Retrieve persisted data from AsyncStorage

### Google Services

#### Google Authentication

- **Request**: `await window.nativebridge.requestAuthenticateWithGoogle()` → `Promise<UserInfo>`
- **Purpose**: Initiate Google OAuth flow and get user information

#### Check Google Auth State

- **Request**: `await window.nativebridge.requestCheckGoogleAuthState()` → `Promise<boolean | UserInfo>`
- **Purpose**: Check if user is authenticated with Google

#### Get Google User Info

- **Request**: `await window.nativebridge.requestGoogleUserInfo()` → `Promise<UserInfo>`
- **Purpose**: Get authenticated Google user's information

#### Upload to Google Drive

- **Request**: `await window.nativebridge.requestUploadToGoogleDrive(data)` → `Promise<{id: string}>`
- **Purpose**: Upload data/file to user's Google Drive

#### Restore from Google Drive

- **Request**: `await window.nativebridge.requestRestoreGoogleDriveBackup()` → `Promise<any>`
- **Purpose**: Restore latest backup data from Google Drive

#### File Downloads

- **Request**: `await window.nativebridge.requestDownloadFile({ url, filename? })` → `Promise<{ localPath: string }>`
- **Purpose**: Download a file from a URL (or base64 data) into the device app storage and return the local path; the native layer may optionally offer a share/save UI.
- **Params**:
  - `url` (string): HTTP(S) URL of the file to download
  - `filename` (optional string): Desired filename on the device. If omitted, filename is derived from the URL or a timestamp is used.
- **Returns**: `{ localPath }` — local file URI in the device's document directory
- **Note**: The handler will try to use native sharing APIs when available to let users open or save the file elsewhere.
- **Note**: On Android, the handler attempts to save directly to the public Downloads folder (`/storage/emulated/0/Download`) when permitted; it may request runtime `WRITE_EXTERNAL_STORAGE` on older devices. If permission is denied or unsupported, it falls back to the app's external storage folder (e.g., `Android/data/<package>/files/Download`).
- **Behavior**: When `url` is provided, the bridge opens the URL via the user's browser (`Linking.openURL`) so the browser handles the full download and the MicroApp itself does not perform the write. When `base64` content is provided, the bridge writes the file into the app cache and opens the system share/save dialog so the user can pick where to save the file (e.g., Downloads).
- **Behavior**: When `url` is provided, the bridge opens the URL via the user's browser (`Linking.openURL`) so the browser handles the full download and the MicroApp itself does not perform the write. When `base64` content is provided, the bridge first tries to open a data-URL HTML wrapper that will trigger a browser download (this works in many mobile browsers). If that fails (data URL too large or the browser doesn't support it), the bridge falls back to writing the file into the app cache and opening the system share/save dialog so the user can pick where to save the file (e.g., Downloads).
- **Option**: Pass `saveToDownloads: true` with `base64` payload on Android to use Storage Access Framework (SAF) and let the user pick a directory (choose Downloads) — this saves the file directly into that directory.

**Usage**:

```js
// From a MicroApp running inside the WebView:
try {
  const { localPath } = await window.nativebridge.requestDownloadFile({
    url: "https://example.com/somefile.pdf",
    filename: "example.pdf",
  });
  console.log("Downloaded to", localPath);
} catch (err) {
  console.error("Download failed", err);
}
```

### TOTP (Time-based One-Time Password)

#### TOTP QR Migration Data

- **Request**: `await window.nativebridge.requestTotpQrMigrationData()` → `Promise<{data: string}>`
- **Purpose**: Get TOTP migration data for QR code generation

### Development & Debugging

#### Native Log

- **Request**: `window.nativebridge.requestNativeLog({level, message, data})`
- **Purpose**: Log messages to native console (only works in development mode)
- **Levels**: `"info"`, `"warn"`, `"error"`

## Security Considerations

- **Input Validation**: Always validate parameters from MicroApps
- **Permission Checks**: Verify user permissions before executing sensitive operations
- **Token Security**: Never log or expose tokens in plain text
- **Cross-Origin**: Bridge only works within authorized WebViews
- **Data Sanitization**: Clean user inputs before processing

## Troubleshooting

### Common Issues

1. **Bridge not available**: Ensure WebView has finished loading and bridge is injected
2. **Promises not resolving**: Check that bridge methods are called correctly with await
3. **TypeScript errors**: Regenerate types after adding new functions
4. **Async operations failing**: Verify proper async/await usage in handlers

### Debugging Steps

1. **Check console logs**: Both native and web consoles show bridge activity
2. **Verify function registration**: Ensure topic names match exactly
3. **Test promise resolution**: Use browser dev tools to inspect promise states
4. **Network monitoring**: Look for postMessage calls in network tab

## Support

For bridge-related issues:

- Check this documentation first
- Review console logs for error messages
- Verify function implementation in registry
- Test with minimal reproduction case

---

## Appendix: Backward Compatibility

### Event-Based Approach (Legacy)

The bridge system maintains backward compatibility with legacy event-based implementations. While the **promise-based approach is recommended** for new development, the bridge continues to support the older pattern.

**Legacy Pattern (Pre-defined Callbacks):**

```javascript
// example usage for `save_local_data` function
window.ReactNativeWebView.postMessage(
  JSON.stringify({
    topic: "save_local_data",
    data: { key, value },
  })
);

// Pre-define callbacks on the bridge object
window.nativebridge.resolveSaveLocalData = (data) => {
  console.log("Success:", data);
};

window.nativebridge.rejectSaveLocalData = (error) => {
  console.error("Failed:", error);
};
```

The bridge auto-generates method names from topics using a `capitalize` function that converts snake_case to PascalCase and appends the relevant prefix afterwards. For example:

- Topic: `save_local_data` → Methods: `requestSaveLocalData`, `resolveSaveLocalData`, `rejectSaveLocalData`
- Topic: `google_login` → Methods: `requestGoogleLogin`, `resolveGoogleLogin`, `rejectGoogleLogin`

When handlers call `context.resolve(data)` or `context.reject(error)`, the bridge:

1. **Resolves/rejects the promise** (modern approach)
2. **Calls the pre-defined callback** if it exists (legacy compatibility)

**Note:** New MicroApps should use the promise-based approach. The event-based pattern with pre-defined callbacks is maintained only for backward compatibility with existing implementations.

---

_This guide is maintained by the SuperApp development team. Last updated: October 2025_</content>.  
<parameter name="filePath">superapp-mobile/frontend/docs/BRIDGE_GUIDE.md

<br>.
