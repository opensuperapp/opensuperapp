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
 *
 * The SDK 58 AppDelegate is scene-based and no longer declares the open-URL or
 * continue-user-activity overrides. react-native-app-auth 9's own iOS mod needs
 * both as anchors (and throws without the second), so this plugin adds them.
 */
import type { ExportedConfig } from "expo/config-plugins";
import type { ExpoConfig } from "expo/config";
import * as fs from "fs";
import * as path from "path";

import withAppAuthAppDelegate, {
  addAppAuthAppDelegateOverrides,
} from "../withAppAuthAppDelegate";

const FIXTURE = fs.readFileSync(
  path.join(__dirname, "fixtures", "AppDelegate.sdk58.swift"),
  "utf8"
);

// The exact patterns react-native-app-auth 9.0.0 (plugin/src/ios/app-delegate.ts)
// searches for. If these stop matching, its mod silently skips the open-URL
// resume and throws on the user-activity one.
const APP_AUTH_OPEN_URL_PATTERN =
  /((?:public\s+)?override\s+func\s+application\s*\([\s\S]*?open\s+url\s*:\s*URL[\s\S]*?\)\s*->\s*Bool\s*\{)/m;
const APP_AUTH_USER_ACTIVITY_PATTERN =
  /((?:public\s+)?(?:override\s+)?func\s+application\s*\([\s\S]*?continue\s+userActivity\s*:\s*NSUserActivity[\s\S]*?\)\s*->\s*Bool\s*\{)/m;

const OPEN_URL_SIGNATURE = /override\s+func\s+application\s*\(\s*_\s+app\s*:\s*UIApplication\s*,\s*open\s+url\s*:\s*URL/g;
const USER_ACTIVITY_SIGNATURE = /override\s+func\s+application\s*\([^)]*?continue\s+userActivity\s*:\s*NSUserActivity/g;

const count = (contents: string, pattern: RegExp) =>
  (contents.match(pattern) ?? []).length;

/** Returns the body of `class AppDelegate` (between its braces). */
const appDelegateClassBody = (contents: string) => {
  const start = contents.indexOf("class AppDelegate");
  const end = contents.indexOf("class ReactNativeDelegate");
  return contents.slice(start, end);
};

describe("addAppAuthAppDelegateOverrides", () => {
  it("starts from a fixture that lacks both overrides (the reason app-auth throws)", () => {
    expect(APP_AUTH_OPEN_URL_PATTERN.test(FIXTURE)).toBe(false);
    expect(APP_AUTH_USER_ACTIVITY_PATTERN.test(FIXTURE)).toBe(false);
  });

  it("adds an open-URL override that defers to ExpoAppDelegate", () => {
    const out = addAppAuthAppDelegateOverrides(FIXTURE);
    const body = appDelegateClassBody(out);

    expect(count(body, OPEN_URL_SIGNATURE)).toBe(1);
    expect(body).toContain(
      "options: [UIApplication.OpenURLOptionsKey: Any] = [:]"
    );
    expect(body).toContain(
      "return super.application(app, open: url, options: options)"
    );
  });

  it("adds a continue-user-activity override that defers to ExpoAppDelegate", () => {
    const out = addAppAuthAppDelegateOverrides(FIXTURE);
    const body = appDelegateClassBody(out);

    expect(count(body, USER_ACTIVITY_SIGNATURE)).toBe(1);
    expect(body).toContain(
      "restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void"
    );
    expect(body).toContain(
      "return super.application(application, continue: userActivity, restorationHandler: restorationHandler)"
    );
  });

  it("produces the anchors react-native-app-auth 9 looks for", () => {
    const out = addAppAuthAppDelegateOverrides(FIXTURE);

    expect(APP_AUTH_OPEN_URL_PATTERN.test(out)).toBe(true);
    expect(APP_AUTH_USER_ACTIVITY_PATTERN.test(out)).toBe(true);
  });

  it("leaves the protocol conformance, imports and the rest of the file to app-auth / the template", () => {
    const out = addAppAuthAppDelegateOverrides(FIXTURE);

    expect(out).toContain(
      "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {"
    );
    expect(out).not.toContain("RNAppAuthAuthorizationFlowManager");
    expect(out.startsWith("internal import Expo\nimport React\n")).toBe(true);
    // Everything from the fixture survives, in order.
    const removedGenerated = out.replace(
      /\n?[ \t]*\/\/ @generated begin[\s\S]*?\/\/ @generated end [^\n]*\n/,
      "\n"
    );
    expect(removedGenerated.replace(/\n+/g, "\n")).toBe(
      FIXTURE.replace(/\n+/g, "\n")
    );
  });

  it("is idempotent", () => {
    const once = addAppAuthAppDelegateOverrides(FIXTURE);
    const twice = addAppAuthAppDelegateOverrides(once);

    expect(twice).toBe(once);
    expect(count(twice, OPEN_URL_SIGNATURE)).toBe(1);
    expect(count(twice, USER_ACTIVITY_SIGNATURE)).toBe(1);
  });

  it("stays idempotent after app-auth has injected its resume code into the overrides", () => {
    const once = addAppAuthAppDelegateOverrides(FIXTURE);
    const injected = once.replace(
      APP_AUTH_OPEN_URL_PATTERN,
      (m) =>
        `${m}\n    if let d = self.authorizationFlowManagerDelegate { if d.resumeExternalUserAgentFlow(with: url) { return true } }\n`
    );
    const again = addAppAuthAppDelegateOverrides(injected);

    expect(count(again, OPEN_URL_SIGNATURE)).toBe(1);
    expect(count(again, USER_ACTIVITY_SIGNATURE)).toBe(1);
  });

  it("does not duplicate an override the AppDelegate already declares", () => {
    const withOpenUrl = FIXTURE.replace(
      "  var window: UIWindow?\n",
      [
        "  var window: UIWindow?",
        "",
        "  public override func application(",
        "    _ app: UIApplication,",
        "    open url: URL,",
        "    options: [UIApplication.OpenURLOptionsKey: Any] = [:]",
        "  ) -> Bool {",
        "    return super.application(app, open: url, options: options)",
        "  }",
        "",
      ].join("\n")
    );
    const out = addAppAuthAppDelegateOverrides(withOpenUrl);

    expect(count(out, OPEN_URL_SIGNATURE)).toBe(1);
    expect(count(out, USER_ACTIVITY_SIGNATURE)).toBe(1);
  });

  it("throws a clear error when the ExpoAppDelegate subclass is missing", () => {
    const objc = "@implementation AppDelegate\n@end\n";

    expect(() => addAppAuthAppDelegateOverrides(objc)).toThrow(
      /withAppAuthAppDelegate.*class AppDelegate: ExpoAppDelegate/
    );
  });
});

describe("withAppAuthAppDelegate (config plugin)", () => {
  const baseConfig = (): ExpoConfig => ({
    name: "example",
    slug: "example",
    scheme: "com.example.app",
  });

  it("registers only the iOS AppDelegate mod and leaves Android untouched", () => {
    const config: ExportedConfig = withAppAuthAppDelegate(baseConfig());

    expect(Object.keys(config.mods ?? {})).toEqual(["ios"]);
    expect(Object.keys(config.mods?.ios ?? {})).toEqual(["appDelegate"]);
    expect(config.mods?.android).toBeUndefined();
  });

  it("patches the Swift AppDelegate when the mod runs", async () => {
    const config: ExportedConfig = withAppAuthAppDelegate(baseConfig());
    const mod = config.mods!.ios!.appDelegate!;

    const result = await mod({
      ...config,
      modResults: {
        path: "/project/ios/Example/AppDelegate.swift",
        language: "swift",
        contents: FIXTURE,
      },
      modRequest: {
        projectRoot: "/project",
        platformProjectRoot: "/project/ios",
        modName: "appDelegate",
        platform: "ios",
        introspect: false,
        ignoreExistingNativeFiles: false,
        nextMod: async (c: unknown) => c,
      },
    } as never);

    const contents = (result as { modResults: { contents: string } })
      .modResults.contents;
    expect(APP_AUTH_USER_ACTIVITY_PATTERN.test(contents)).toBe(true);
    expect(APP_AUTH_OPEN_URL_PATTERN.test(contents)).toBe(true);
  });

  it("refuses an Objective-C AppDelegate with a clear error", async () => {
    const config: ExportedConfig = withAppAuthAppDelegate(baseConfig());
    const mod = config.mods!.ios!.appDelegate!;

    await expect(
      mod({
        ...config,
        modResults: {
          path: "/project/ios/Example/AppDelegate.mm",
          language: "objcpp",
          contents: "@implementation AppDelegate\n@end\n",
        },
        modRequest: {
          projectRoot: "/project",
          platformProjectRoot: "/project/ios",
          modName: "appDelegate",
          platform: "ios",
          introspect: false,
          ignoreExistingNativeFiles: false,
          nextMod: async (c: unknown) => c,
        },
      } as never)
    ).rejects.toThrow(/withAppAuthAppDelegate.*Swift/);
  });
});
