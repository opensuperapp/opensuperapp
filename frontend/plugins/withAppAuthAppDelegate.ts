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
import { CodeGenerator, ConfigPlugin, withAppDelegate } from "expo/config-plugins";

const { mergeContents, removeContents } = CodeGenerator;

// Expo SDK 58's AppDelegate is scene-based: it no longer declares the open-URL
// or continue-user-activity overrides (ExpoAppSceneDelegate re-feeds those
// events to ExpoAppDelegate instead). react-native-app-auth 9's iOS mod injects
// its resume code into exactly those two overrides and throws when the second
// one is missing (FormidableLabs/react-native-app-auth#1158).
//
// This plugin only adds the two overrides, each deferring to ExpoAppDelegate.
// It must be listed AFTER "react-native-app-auth" in app.config.ts: mods run in
// reverse registration order, so this one runs first and app-auth's own mod
// then adds the protocol conformance, delegate property and resume calls.

const TAG = "with-app-auth-app-delegate";

const APP_DELEGATE_CLASS =
  /^\s*(?:(?:public|internal|final|open)\s+)*class\s+AppDelegate\s*:\s*ExpoAppDelegate\b[^\n]*\{\s*$/m;

const HAS_OPEN_URL_OVERRIDE =
  /override\s+func\s+application\s*\([^)]*?open\s+url\s*:\s*URL\b/;
const HAS_USER_ACTIVITY_OVERRIDE =
  /override\s+func\s+application\s*\([^)]*?continue\s+userActivity\s*:\s*NSUserActivity\b/;

const OPEN_URL_OVERRIDE = `  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options)
  }`;

const USER_ACTIVITY_OVERRIDE = `  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler)
  }`;

/**
 * Adds the open-URL and continue-user-activity overrides to a Swift
 * `class AppDelegate: ExpoAppDelegate`, skipping any it already declares.
 * Idempotent: a previous run's generated block is replaced, not duplicated.
 * @param contents The AppDelegate.swift source
 * @returns The patched source
 */
export const addAppAuthAppDelegateOverrides = (contents: string): string => {
  const src = removeContents({ src: contents, tag: TAG }).contents;

  if (!APP_DELEGATE_CLASS.test(src)) {
    throw new Error(
      "withAppAuthAppDelegate: could not find `class AppDelegate: ExpoAppDelegate ... {` " +
        "on a single line in AppDelegate.swift. The Expo template changed; update the plugin."
    );
  }

  const overrides = [
    HAS_OPEN_URL_OVERRIDE.test(src) ? null : OPEN_URL_OVERRIDE,
    HAS_USER_ACTIVITY_OVERRIDE.test(src) ? null : USER_ACTIVITY_OVERRIDE,
  ].filter((block): block is string => block !== null);

  if (overrides.length === 0) {
    return src;
  }

  return mergeContents({
    src,
    newSrc: overrides.join("\n\n"),
    tag: TAG,
    anchor: APP_DELEGATE_CLASS,
    offset: 1,
    comment: "//",
  }).contents;
};

/**
 * A config plugin that gives the SDK 58 scene-based AppDelegate the two
 * overrides react-native-app-auth 9's plugin patches. iOS only.
 * @param config The Expo config object
 * @returns The modified Expo config
 */
const withAppAuthAppDelegate: ConfigPlugin = (config) =>
  withAppDelegate(config, (config) => {
    if (config.modResults.language !== "swift") {
      throw new Error(
        `withAppAuthAppDelegate: expected a Swift AppDelegate, got "${config.modResults.language}".`
      );
    }
    config.modResults.contents = addAppAuthAppDelegateOverrides(
      config.modResults.contents
    );
    return config;
  });

export default withAppAuthAppDelegate;
