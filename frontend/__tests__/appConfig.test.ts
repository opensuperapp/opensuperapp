// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
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
/**
 * @jest-environment node
 */
import { execFileSync } from "child_process";
import path from "path";

// Placeholders only: what a build would get from .env, minus anything real.
const BASE_ENV = {
  EXPO_OFFLINE: "1",
  APP_NAME: "Test App",
  APP_SLUG: "test-app",
  APP_SCHEME: "testapp",
  IOS_URL_SCHEME: "com.googleusercontent.apps.test",
  EXPO_PUBLIC_ENABLE_FIREBASE: "true",
  EXPO_PUBLIC_ADD_ANDROID_NOTIFICATION_ICON: "true",
  EXPO_PUBLIC_NOTIFICATION_CHANNEL_ID: "test-channel",
  EXPO_PUBLIC_ANDROID_NOTIFICATION_SMALL_ICON_ACCENT_COLOR: "#123456",
};

// Runs the real config plugins and returns what prebuild would write, so these
// assertions check the generated native files rather than app.config.ts itself.
// Variables set here win over .env, because dotenv never overrides them.
function introspect(env: Record<string, string | undefined> = {}) {
  const out = execFileSync(
    "npx",
    ["expo", "config", "--type", "introspect", "--json"],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      env: { ...process.env, ...BASE_ENV, ...env },
    },
  );
  return JSON.parse(out);
}

type StyleItem = { _: string; $: { name: string } };
type Style = { $: { name: string; parent?: string }; item: StyleItem[] };
type MetaData = {
  $: { "android:name": string; "android:value"?: string; "android:resource"?: string };
};
type Plugin = string | [string, unknown?];
const pluginNames = (config: { plugins?: Plugin[] }) =>
  (config.plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p));

describe("Android edge-to-edge (Expo built-in, no react-native-edge-to-edge)", () => {
  const config = introspect();
  const styles: Style[] = config._internal.modResults.android.styles.resources.style;
  const appTheme = styles.find((s) => s.$.name === "AppTheme")!;

  it("does not register the unmaintained react-native-edge-to-edge plugin", () => {
    const pluginNames = (config.plugins ?? []).map((p: string | [string]) =>
      Array.isArray(p) ? p[0] : p,
    );
    expect(pluginNames).not.toContain("react-native-edge-to-edge");
  });

  // Introspection has no template styles.xml, so config-plugins falls back to its
  // own Light parent here; a real prebuild keeps the template's DayNight. What
  // matters is that no plugin swaps in react-native-edge-to-edge's theme.
  it("does not use the react-native-edge-to-edge app theme", () => {
    expect(appTheme.$.parent).not.toMatch(/EdgeToEdge/);
  });

  it("keeps the navigation bar contrast scrim off", () => {
    const item = appTheme.item.find(
      (i) => i.$.name === "android:enforceNavigationBarContrast",
    );
    expect(item?._).toBe("false");
  });
});

describe("expo-notifications native config", () => {
  const config = introspect();
  const manifest = config._internal.modResults.android.manifest.manifest;
  const metaData: MetaData[] = manifest.application[0]["meta-data"] ?? [];
  const meta = (name: string) => metaData.find((m) => m.$["android:name"] === name)?.$;
  const permissions: string[] = (manifest["uses-permission"] ?? []).map(
    (p: { $: { "android:name": string } }) => p.$["android:name"],
  );

  it("registers the expo-notifications plugin", () => {
    expect(pluginNames(config)).toContain("expo-notifications");
  });

  it("uses the app's small icon for pushes and local notifications", () => {
    for (const prefix of ["com.google.firebase.messaging", "expo.modules.notifications"]) {
      expect(meta(`${prefix}.default_notification_icon`)?.["android:resource"]).toBe(
        "@drawable/notification_icon",
      );
    }
  });

  // Background pushes on Android are drawn by FCM from these keys, so they must
  // match the channel the app creates and the accent local notifications use.
  it("routes pushes to the app's channel in its accent colour", () => {
    expect(
      meta("com.google.firebase.messaging.default_notification_channel_id")?.["android:value"],
    ).toBe("test-channel");
    for (const prefix of ["com.google.firebase.messaging", "expo.modules.notifications"]) {
      expect(meta(`${prefix}.default_notification_color`)?.["android:resource"]).toBe(
        "@color/notification_icon_color",
      );
    }
  });

  it.each([
    "android.permission.POST_NOTIFICATIONS",
    // Until now it came only from notifee's manifest; scheduled sessions need it.
    "android.permission.SCHEDULE_EXACT_ALARM",
  ])("declares %s", (permission) => {
    expect(permissions).toContain(permission);
  });

  it("keeps remote-notification as an iOS background mode", () => {
    expect(config._internal.modResults.ios.infoPlist.UIBackgroundModes).toContain(
      "remote-notification",
    );
  });

  it("no longer builds notifee or Firebase messaging", () => {
    expect(pluginNames(config)).not.toContain("@react-native-firebase/messaging");
    expect(JSON.stringify(config.plugins)).not.toContain("@notifee");
    expect(JSON.stringify(config.plugins)).not.toContain("RNFBMessaging");
  });

  // Remote Config still needs Firebase, and the iOS AppDelegate fix stays with it.
  it("keeps Firebase app (Remote Config) and its AppDelegate plugin", () => {
    expect(pluginNames(config)).toEqual(
      expect.arrayContaining([
        "@react-native-firebase/app",
        "./plugins/withFirebaseAppDelegate.ts",
      ]),
    );
  });

});

describe("expo-notifications without channel env", () => {
  it("defaults the FCM channel to the id the app creates (constants/Constants.ts)", () => {
    const config = introspect({ EXPO_PUBLIC_NOTIFICATION_CHANNEL_ID: undefined });
    const metaData: MetaData[] =
      config._internal.modResults.android.manifest.manifest.application[0]["meta-data"];
    expect(
      metaData.find(
        (m) =>
          m.$["android:name"] ===
          "com.google.firebase.messaging.default_notification_channel_id",
      )?.$["android:value"],
    ).toBe("default_superapp_notification_channel");
  });
});

describe("APNs environment", () => {
  it.each([
    ["development", "development"],
    ["production", "production"],
  ])("a %s build registers with the %s APNs host", (profile, apsEnvironment) => {
    const config = introspect({ EAS_BUILD_PROFILE: profile });
    expect(config._internal.modResults.ios.entitlements["aps-environment"]).toBe(apsEnvironment);
    // The app's fallback when the build has no provisioning profile to read it from.
    expect(config.extra.apsEnvironment).toBe(apsEnvironment);
  });
});
