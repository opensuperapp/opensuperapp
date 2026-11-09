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

type StyleItem = { _: string; $: { name: string } };
type Style = { $: { name: string; parent?: string }; item: StyleItem[] };

// Runs the real config plugins and returns what prebuild would write, so these
// assertions check the generated native files rather than app.config.ts itself.
// Variables set here win over .env, because dotenv never overrides them.
function introspect(env: Record<string, string> = {}) {
  const out = execFileSync(
    "npx",
    ["expo", "config", "--type", "introspect", "--json"],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      env: { ...process.env, ...env },
    },
  );
  return JSON.parse(out);
}

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

  it("uses Expo's default app theme", () => {
    expect(appTheme.$.parent).toBe("Theme.AppCompat.DayNight.NoActionBar");
  });

  it("keeps the navigation bar contrast scrim off", () => {
    const item = appTheme.item.find(
      (i) => i.$.name === "android:enforceNavigationBarContrast",
    );
    expect(item?._).toBe("false");
  });
});

type MetaData = { $: { "android:name": string; "android:value"?: string; "android:resource"?: string } };

describe("expo-notifications native config", () => {
  const config = introspect({ EXPO_PUBLIC_ADD_ANDROID_NOTIFICATION_ICON: "true" });
  const metaData: MetaData[] =
    config._internal.modResults.android.manifest.manifest.application[0]["meta-data"] ?? [];
  const meta = (name: string) => metaData.find((m) => m.$["android:name"] === name)?.$;

  it("uses the app's small icon for pushes and local notifications", () => {
    for (const prefix of ["com.google.firebase.messaging", "expo.modules.notifications"]) {
      expect(meta(`${prefix}.default_notification_icon`)?.["android:resource"]).toBe(
        "@drawable/notification_icon",
      );
    }
  });

  // @react-native-firebase/messaging's library manifest declares these two
  // keys, so setting them here fails Gradle's manifest merge.
  it.each([
    "com.google.firebase.messaging.default_notification_channel_id",
    "com.google.firebase.messaging.default_notification_color",
  ])("leaves %s to the library manifest", (name) => {
    expect(meta(name)).toBeUndefined();
  });
});

describe("APNs environment", () => {
  it.each([
    ["development", "development"],
    ["production", "production"],
  ])("a %s build registers with the %s APNs host", (profile, apsEnvironment) => {
    const config = introspect({ EAS_BUILD_PROFILE: profile });
    expect(config._internal.modResults.ios.entitlements["aps-environment"]).toBe(apsEnvironment);
  });
});
