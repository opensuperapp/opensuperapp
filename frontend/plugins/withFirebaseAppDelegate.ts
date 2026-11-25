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

const { mergeContents } = CodeGenerator;

// @react-native-firebase/app 23.x inserts `FirebaseApp.configure()` above
// `factory.startReactNative(`. Expo SDK 58's scene-based template moved that
// call into SceneDelegate, so RNFB's mod adds `import FirebaseCore`, warns
// "Unable to determine correct Firebase insertion point" and skips the call:
// Firebase (remote config) is then never configured on iOS.
//
// This plugin inserts the call above ExpoAppDelegate's didFinishLaunching,
// the same anchor RNFB 27 uses. RNFB skips its insertion when the call is
// already present, so this stays harmless after an RNFB upgrade (and can be
// dropped then).

const TAG = "with-firebase-app-delegate";

export const FIREBASE_CONFIGURE = "FirebaseApp.configure()";

const SUPER_DID_FINISH =
  /return\s+super\.application\(\s*application\s*,\s*didFinishLaunchingWithOptions:\s*launchOptions\s*\)/;

const EXPO_IMPORT = /^((?:internal\s+|public\s+)?import\s+Expo)$/m;

/**
 * Makes a Swift SDK 58 AppDelegate import FirebaseCore and call
 * `FirebaseApp.configure()` before handing off to ExpoAppDelegate.
 * No-op when the call is already there (from a previous run or RNFB 27+).
 * @param contents The AppDelegate.swift source
 * @returns The patched source
 */
export const addFirebaseConfigure = (contents: string): string => {
  let src = contents;

  if (!/^import\s+FirebaseCore$/m.test(src)) {
    if (!EXPO_IMPORT.test(src)) {
      throw new Error(
        "withFirebaseAppDelegate: could not find `import Expo` in AppDelegate.swift. " +
          "The Expo template changed; update the plugin."
      );
    }
    src = src.replace(EXPO_IMPORT, "$1\nimport FirebaseCore");
  }

  if (src.includes(FIREBASE_CONFIGURE)) {
    return src;
  }

  if (!SUPER_DID_FINISH.test(src)) {
    throw new Error(
      "withFirebaseAppDelegate: could not find " +
        "`return super.application(application, didFinishLaunchingWithOptions: launchOptions)` " +
        "in AppDelegate.swift. The Expo template changed; update the plugin."
    );
  }

  return mergeContents({
    src,
    newSrc: `    ${FIREBASE_CONFIGURE}`,
    tag: TAG,
    anchor: SUPER_DID_FINISH,
    offset: 0,
    comment: "//",
  }).contents;
};

/**
 * A config plugin that configures Firebase in the SDK 58 scene-based
 * AppDelegate, where @react-native-firebase/app 23.x cannot. iOS only.
 * @param config The Expo config object
 * @returns The modified Expo config
 */
const withFirebaseAppDelegate: ConfigPlugin = (config) =>
  withAppDelegate(config, (config) => {
    if (config.modResults.language !== "swift") {
      throw new Error(
        `withFirebaseAppDelegate: expected a Swift AppDelegate, got "${config.modResults.language}".`
      );
    }
    config.modResults.contents = addFirebaseConfigure(config.modResults.contents);
    return config;
  });

export default withFirebaseAppDelegate;
