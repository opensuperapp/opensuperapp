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
 * @react-native-firebase/app 23.x anchors `FirebaseApp.configure()` on
 * `factory.startReactNative(`, which the SDK 58 template moved into
 * SceneDelegate. Its mod then only adds the import and skips the call, so
 * Firebase is never configured on iOS. This plugin inserts the call.
 */
import type { ExpoConfig } from "expo/config";
import * as fs from "fs";
import * as path from "path";

import { withFirebase } from "../../integrations/firebase/withFirebase";
import {
  addFirebaseConfigure,
  FIREBASE_CONFIGURE,
} from "../withFirebaseAppDelegate";

const FIXTURE = fs.readFileSync(
  path.join(__dirname, "fixtures", "AppDelegate.sdk58.swift"),
  "utf8"
);

// What @react-native-firebase/app 23.8.8's mod leaves behind on SDK 58: the
// import only (it replaces /import Expo/g), plus its skip warning.
const AFTER_RNFB_23 = FIXTURE.replace(
  /import Expo/g,
  "import Expo\nimport FirebaseCore"
);

const SUPER_DID_FINISH =
  /return\s+super\.application\(\s*application\s*,\s*didFinishLaunchingWithOptions:\s*launchOptions\s*\)/;

const count = (contents: string, needle: string) =>
  contents.split(needle).length - 1;

describe("addFirebaseConfigure", () => {
  it("the fixture is the SDK 58 template without RNFB's old anchor", () => {
    expect(FIXTURE).not.toMatch(/factory\.startReactNative\(/);
    expect(FIXTURE).toMatch(SUPER_DID_FINISH);
  });

  it("calls FirebaseApp.configure() before ExpoAppDelegate's didFinishLaunching", () => {
    const out = addFirebaseConfigure(AFTER_RNFB_23);
    expect(count(out, FIREBASE_CONFIGURE)).toBe(1);
    expect(out.indexOf(FIREBASE_CONFIGURE)).toBeLessThan(
      out.search(SUPER_DID_FINISH)
    );
    // Inside didFinishLaunching, not somewhere else in the file.
    expect(out.indexOf(FIREBASE_CONFIGURE)).toBeGreaterThan(
      out.indexOf("didFinishLaunchingWithOptions launchOptions")
    );
  });

  it("adds `import FirebaseCore` when RNFB has not", () => {
    const out = addFirebaseConfigure(FIXTURE);
    expect(count(out, "import FirebaseCore")).toBe(1);
    expect(count(out, FIREBASE_CONFIGURE)).toBe(1);
  });

  it("does not duplicate the import RNFB already added", () => {
    expect(count(addFirebaseConfigure(AFTER_RNFB_23), "import FirebaseCore")).toBe(1);
  });

  it("is idempotent", () => {
    const once = addFirebaseConfigure(AFTER_RNFB_23);
    expect(addFirebaseConfigure(once)).toBe(once);
  });

  it("leaves the file alone when RNFB (27+) already inserted the call", () => {
    const rnfb27 = AFTER_RNFB_23.replace(
      SUPER_DID_FINISH,
      (m) => `${FIREBASE_CONFIGURE}\n    ${m}`
    );
    expect(addFirebaseConfigure(rnfb27)).toBe(rnfb27);
  });

  it("throws a clear error when the template changes again", () => {
    expect(() => addFirebaseConfigure("import Expo\nclass AppDelegate {}\n")).toThrow(
      /withFirebaseAppDelegate/
    );
  });
});

describe("withFirebase", () => {
  const baseConfig = (): ExpoConfig => ({
    name: "test-app",
    slug: "test-app",
    ios: {},
    android: {},
    plugins: [["expo-build-properties", { ios: {} }]],
  });

  it("registers the local AppDelegate plugin with the Firebase plugins", () => {
    const plugins = withFirebase(baseConfig()).plugins ?? [];
    const names = plugins.map((p) => (Array.isArray(p) ? p[0] : p));
    expect(names).toContain("./plugins/withFirebaseAppDelegate.ts");
    expect(names.indexOf("./plugins/withFirebaseAppDelegate.ts")).toBeGreaterThan(
      names.indexOf("@react-native-firebase/app")
    );
  });
});
