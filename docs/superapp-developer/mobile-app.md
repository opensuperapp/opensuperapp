# 🚀 Super App Mobile (React Native \+ Expo)

The **Mobile App** is built with React Native + Expo and TypeScript, serving as a secure container for dynamically loaded MicroApps. It provides OAuth 2.0 authentication via External IdP, token-based authorization, and a WebView bridge for MicroApp-to-native communication.

---

## Getting Started

### Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm**  package manager
- **Expo CLI**: `npm install -g @expo/cli`
- **Git** for version control

### Project Setup

<ol>
<li>
<p><strong>Clone the Repository</strong></p>
<div class="language-bash highlight"><pre><code>git clone &lt;repository-url&gt;
cd superapp-mobile/frontend
</code></pre></div>
</li>

<li>
<p><strong>Install Dependencies</strong></p>
<div class="language-bash highlight"><pre><code>npm install
</code></pre></div>
</li>

<li>
<p><strong>Environment Configuration</strong></p>
<div class="language-bash highlight"><pre><code>cp .env.example .env
</code></pre></div>
<p>Fill in the required environment variables in <code>.env</code>:</p>
<ul>
<li>Authentication
<ul>
<li>Explicit endpoints (recommended)
<ul>
<li><code>EXPO_PUBLIC_TOKEN_URL</code></li>
<li><code>EXPO_PUBLIC_CLIENT_ID</code></li>
<li><code>EXPO_PUBLIC_REDIRECT_URI</code></li>
<li><code>EXPO_PUBLIC_LOGOUT_URL</code></li>
</ul>
</li>
</ul>
</li>
<li>APP Metadata
<ul>
<li><code>APP_NAME</code></li>
<li><code>APP_SLUG</code></li>
<li><code>APP_SCHEME</code></li>
<li><code>APP_VERSION</code></li>
<li><code>APP_OWNER</code></li>
<li><code>BUNDLE_IDENTIFIER</code></li>
<li><code>ANDROID_PACKAGE</code></li>
</ul>
</li>
<li>Backend
<ul>
<li><code>BACKEND_BASE_URL</code></li>
</ul>
</li>
<li>Other Services
<ul>
<li><code>EXPO_PUBLIC_EVENTS_URL</code></li>
<li><code>EXPO_PUBLIC_NEWS_URL</code></li>
</ul>
</li>
<li>Optional
<ul>
<li><code>USE_BACKEND_TOKEN_EXCHANGE</code> ("true"|"false", default true)</li>
<li>OpenTelemetry: set <code>EXPO_PUBLIC_OTEL_ENABLED=true</code> to enable metrics during development and add <code>EXPO_PUBLIC_OTEL_COLLECTOR_URL</code></li>
</ul>
</li>
</ul>
<p>Create a folder named <code>google-services</code> inside <code>frontend/</code> and include the Firebase artifacts ( <code>google-services.json</code> and <code>GoogleService-Info.plist</code>) inside it.</p>

<p>For branding changes, refer to the <code>assets</code> folder and <code>constant/colors.ts</code>.</p>
</li>



<li>
<p><strong>Start Development Server</strong></p>
<div class="language-bash highlight"><pre><code># Android
npx expo prebuild --platform android --clean // To pre-build the package
npx expo run:android

# iOS Simulator
npx expo prebuild --platform ios --clean
npx expo run:ios
</code></pre></div>
</li>
</ol>

## 🚀 Deployment

### Build Process

**Pre-build Native Projects**

```bash
# Android only
npx expo prebuild --platform android --clean

# iOS only
npx expo prebuild --platform ios --clean

# Both platforms
npx expo prebuild --clean
```

**Android Build**

Navigate to the Android folder and build:

```bash
cd android
./gradlew assembleRelease
```

The resulting APK will be in `android/app/build/outputs/apk/release/`.

**iOS Build**

Use either Xcode or command line:

```bash
# Build for archiving
xcodebuild archive \
  -workspace YourAppName.xcworkspace \
  -scheme YourSchemeName \
  -configuration Release \
  -archivePath build/YourAppName.xcarchive

# Export the IPA
xcodebuild -exportArchive \
  -archivePath build/YourAppName.xcarchive \
  -exportPath build/ipa \
  -exportOptionsPlist ExportOptions.plist
```

---
**More Details**

- [Development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start development by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

**Production Builds Using EAS Build**

```bash
# Using EAS Build
npx eas build --platform android
npx eas build --platform ios

# Or using Expo Application Services
npx expo build:android
npx expo build:ios
```

---

## 🏗️ Architecture Overview

### Technology Stack

- **Framework**: React Native with Expo (SDK 52+)
- **Language**: TypeScript
- **Architecture**: MVVM (Model-View-ViewModel)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Redux Toolkit + Redux Persist
- **Authentication**: OAuth 2.0 / OIDC via External IdP
- **Storage**:
  - `expo-secure-store` - Encrypted storage for sensitive data (auth tokens, user configs)
  - `@react-native-async-storage/async-storage` - General storage for non-sensitive data
- **Styling**: React Native StyleSheet + Custom components
- **HTTP Client**: Axios
- **Testing**: Jest + React Native Testing Library
- **E2E Testing**: Maestro

---

## 🔒 Security & Data Storage

### Storage Strategy

The app uses a **dual-storage approach** for optimal security and performance:

**🔐 SecureStore (Encrypted Storage)**

- **Authentication tokens**: Access tokens, refresh tokens, ID tokens
- **User configurations**: Settings that may contain sensitive preferences
- **Implementation**: `utils/secureStorage.ts` wrapper that automatically routes sensitive keys to `expo-secure-store`

**📦 AsyncStorage (General Storage)**

- **App catalog**: Micro-app metadata (names, descriptions, icons)
- **User display info**: Read-only user info for UI display (name, email)
- **Cache data**: News feed, events (non-sensitive, temporary data)

### Security Features

- **Token-based authentication** with automatic refresh
- **Encrypted storage** for authentication credentials
- **Secure token exchange** for micro-app access
- **Automatic token expiration handling**
- **Secure logout** with complete token cleanup

---


## High-Level Mobile App Flow


<ol>
<li>
<p><strong>First launch</strong></p>
<ul>
<li>If the user is not authenticated, the <strong>Login</strong> screen is shown.</li>
<li>After successful sign-in, the app initializes user profile and configuration.</li>
</ul>
</li>

<li>
<p><strong>Landing experience (authenticated)</strong></p>
<ul>
<li>Default landing tab is <strong>Feed</strong>.</li>
<li>Tabs available: <strong>Feed</strong>, <strong>My Apps</strong>, <strong>Profile</strong>.</li>
</ul>
</li>

<li>
<p><strong>Authentication</strong></p>
<ul>
<li>Retrieve <strong>access_token &amp; refresh_token</strong> via the <strong>IdP</strong> and store them in encrypted storage.</li>
<li>Fetch <strong>user configurations</strong> and <strong>profile info</strong>.</li>
<li>Align locally installed micro-apps with server-side configuration (install/uninstall as needed).</li>
</ul>
</li>

<li>
<p><strong>Using the app</strong></p>
<ul>
<li><strong>Feed</strong> shows the latest content.</li>
<li><strong>My Apps</strong> lists the user's micro-apps.</li>
<li><strong>Profile</strong> provides account details and the sign-out option.</li>
</ul>
</li>

<li>
<p><strong>On re-open</strong></p>
<ul>
<li>If a valid session exists, the app opens directly to the tabs (<strong>Feed</strong> by default).</li>
<li>Checks for a <strong>Super App force update</strong>; if required, the update screen is shown.</li>
<li>Checks if any <strong>micro-apps have updates</strong> and updates them automatically.</li>
</ul>
</li>
</ol>

---

## 🧪 Testing

This project includes unit and integration tests following industry best practices.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode
npm run test:ci

# Update test snapshots
npm run test:update
```

---

## 📚 Additional Resources

### Documentation

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

