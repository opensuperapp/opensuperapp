// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import "dotenv/config";
import type { ExpoConfig } from "expo/config";

/* Firebase configuration for push notifications */
import fs from "fs";
import path from "path";

const PRODUCTION = "production";
const DEVELOPMENT = "development";

const profile =
  process.env.EAS_BUILD_PROFILE ??
  (process.env.NODE_ENV === PRODUCTION ? PRODUCTION : DEVELOPMENT);

// Allow forks to build by providing defaults, while letting you override via env.
const APP_NAME = process.env.APP_NAME ?? "";
const APP_SCHEME = process.env.APP_SCHEME ?? "";
const APP_SLUG = process.env.APP_SLUG ?? "";
const APP_OWNER = process.env.APP_OWNER ?? "";
const APP_VERSION = process.env.APP_VERSION ?? "1.0.0";
const BUNDLE_ID = process.env.BUNDLE_IDENTIFIER ?? "com.example";
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE ?? "com.example";
const IOS_URL_SCHEME = process.env.IOS_URL_SCHEME ?? "example.scheme";
// const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID ?? ""; // Uncomment this if you use EAS

/* =============== Firebase Configuration ===============
 *
 * To enable Firebase services for your project, you need to:
 *
 * 1.  Obtain your `GoogleService-Info.plist` (for iOS) and `google-services.json` (for Android)
 *     from your Firebase project settings.
 *
 * 2.  You have two options for providing these files to the build process:
 *
 *     a) (Recommended) In your `.env` file, provide the base64-encoded content of these files
 *        to `FIREBASE_IOS_PLIST_B64` and `FIREBASE_ANDROID_JSON_B64`. The `package.json`
 *        has scripts to decode these at `npm install`. Instructions are provided in the
 *        `.env.example` file. This will benefit local development and CI/CD pipelines.
 *
 *     b) Place the files directly in a `google-services` directory at the root of your project
 *        You may need to create this directory)
 *
 * 3.  After setting up your files, uncomment lines immediately below this comment section
 *     and the corresponding `googleServicesFile` line(s) in the `ios` and/or `android` section(s) below.
 *
 * ======================================================= */

const here = (...p: string[]) => path.resolve(__dirname, ...p);
const fileIfExists = (p: string) => (fs.existsSync(p) ? p : undefined);
const iosPlist = fileIfExists(here("google-services/GoogleService-Info.plist"));
const androidJson = fileIfExists(here("google-services/google-services.json"));

const config: ExpoConfig = {
  name: APP_NAME,
  slug: APP_SLUG,
  scheme: APP_SCHEME,
  version: APP_VERSION,
  owner: APP_OWNER,
  newArchEnabled: true,
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    requireFullScreen: true,
    bundleIdentifier: BUNDLE_ID,
    googleServicesFile: iosPlist,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ["remote-notification"],
    },
    entitlements: {
      "aps-environment": profile === PRODUCTION ? PRODUCTION : DEVELOPMENT,
    },
    icon: {
      dark: "./assets/images/ios-light.png",
      light: "./assets/images/ios-light.png",
      tinted: "./assets/images/ios-tinted.png",
    },
  },
  android: {
    package: ANDROID_PACKAGE,
    googleServicesFile: androidJson,
    permissions: [
      // Core permissions already used by app
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      // Permissions for saving files to shared storage / downloads
      // Note: WRITE_EXTERNAL_STORAGE is deprecated on newer Android versions
      // but declaring it helps backward compatibility. For Android 11+ we're
      // using Storage Access Framework where possible which doesn't require
      // this permission.
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
    ],
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#476481",
    },
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    [
      "@wavemaker/react-native-app-auth-expo-plugin",
      {
        redirectScheme: APP_SCHEME,
        enableUniversalLinks: false,
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 24,
        },
      },
    ],
    [
      "expo-splash-screen",
      {
        backgroundColor: "#FFFFFF",
        image: "./assets/images/splash-icon.png",
        dark: {
          image: "./assets/images/splash-icon.png",
          backgroundColor: "#000000",
        },
        imageWidth: 200,
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission: "Allow $(PRODUCT_NAME) to access your camera",
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone",
        recordAudioAndroid: true,
      },
    ],
    "expo-router",
    [
      "expo-secure-store",
      {
        configureAndroidBackup: true,
        faceIDPermission:
          "Allow $(PRODUCT_NAME) to access your Face ID biometric data.",
      },
    ],
    ["expo-screen-orientation", { initialOrientation: "DEFAULT" }],
    ["expo-font", { fonts: ["./assets/fonts/SpaceMono-Regular.ttf"] }],
    [
      "expo-notifications",
      {
        icon: "./assets/images/notification-icon.png",
        color: "#476481",
        sounds: [],
      },
    ],
    [
      "@react-native-google-signin/google-signin",
      { iosUrlScheme: IOS_URL_SCHEME },
    ],
    [
      "react-native-edge-to-edge",
      {
        android: {
          parentTheme: "Default",
          enforceNavigationBarContrast: false,
        },
      },
    ],
    // Remove the intent scheme from the AndroidManifest.xml as it is duplicated by the app auth plugin
    [
      "./plugins/withRemoveIntentScheme.ts",
      {
        scheme: APP_SCHEME,
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    router: { origin: false },
    // eas: { projectId: EAS_PROJECT_ID }, // Uncomment this if you use EAS
  },
  assetBundlePatterns: ["**/*"],
};

export default config;
