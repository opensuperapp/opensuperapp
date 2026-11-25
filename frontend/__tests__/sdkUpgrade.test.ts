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
 * Guards the config changes the Expo SDK upgrade forces, so a later edit
 * (or a careless merge from main) cannot quietly bring an SDK 54 setting back.
 */
import fs from "fs";
import path from "path";

import packageJson from "../package.json";

jest.mock("dotenv/config", () => ({}), { virtual: true });
jest.mock("tsx/cjs", () => ({}), { virtual: true });

type PluginEntry = string | [string, Record<string, unknown>];

const loadConfig = () => {
  let config: Record<string, unknown> = {};
  jest.isolateModules(() => {
    // require (not import) so isolateModules re-evaluates the config each time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    config = require("../app.config").default;
  });
  return config;
};

const pluginOptions = (name: string): Record<string, unknown> | undefined => {
  const plugins = (loadConfig().plugins ?? []) as PluginEntry[];
  const entry = plugins.find((p) => (Array.isArray(p) ? p[0] : p) === name);
  return Array.isArray(entry) ? entry[1] : undefined;
};

const major = (range: string) => Number(range.replace(/^[^\d]*/, "").split(".")[0]);

describe("Expo SDK upgrade: app.config.ts", () => {
  it("drops newArchEnabled (removed from the SDK 55 schema; New Arch is always on)", () => {
    expect(loadConfig()).not.toHaveProperty("newArchEnabled");
  });

  it("does not pin Android compile/target SDK below 36 (SDK 55 needs 36)", () => {
    const android = (pluginOptions("expo-build-properties")?.android ?? {}) as Record<
      string,
      number | undefined
    >;
    for (const key of ["compileSdkVersion", "targetSdkVersion"]) {
      if (android[key] !== undefined) {
        expect(android[key]).toBeGreaterThanOrEqual(36);
      }
    }
  });
});

describe("Expo SDK upgrade: package.json", () => {
  const all = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  } as Record<string, string>;

  it("is on Expo SDK 55 or later", () => {
    expect(major(all.expo)).toBeGreaterThanOrEqual(55);
  });

  it("uses @react-native-community/cli 20+ (18 targets React Native 0.79)", () => {
    expect(major(all["@react-native-community/cli"])).toBeGreaterThanOrEqual(20);
  });

  it("drops react-native-prompt-android (its build.gradle calls jcenter(), gone in Gradle 9; never imported)", () => {
    expect(all).not.toHaveProperty("react-native-prompt-android");
  });

  it("passes --environment to every eas update script (required from SDK 55)", () => {
    const scripts = packageJson.scripts as Record<string, string>;
    const updates = Object.entries(scripts).filter(([, cmd]) =>
      cmd.includes("eas update"),
    );
    expect(updates.length).toBeGreaterThan(0);
    for (const [, cmd] of updates) {
      const calls = cmd.split("&&").filter((c) => c.includes("eas update"));
      for (const call of calls) {
        expect(call).toMatch(/--environment\s+\S+/);
      }
    }
  });
});

describe("Expo SDK upgrade: SDK 57 (absorbs SDK 56 breaking changes)", () => {
  const ROOT = path.resolve(__dirname, "..");
  const SOURCE_DIRS = ["app", "components", "hooks", "constants", "context", "utils"];
  const all = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  } as Record<string, string>;

  const sourceFiles = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return /\.tsx?$/.test(entry.name) ? [full] : [];
    });
  const filesMatching = (re: RegExp) =>
    SOURCE_DIRS.flatMap((d) => sourceFiles(path.join(ROOT, d)))
      .filter((f) => re.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.relative(ROOT, f));

  it("is on Expo SDK 57 or later", () => {
    expect(major(all.expo)).toBeGreaterThanOrEqual(57);
  });

  it("keeps TypeScript 5 out of expo install's reach (SDK 56 template moves to TS 6)", () => {
    const exclude = (packageJson as { expo?: { install?: { exclude?: string[] } } }).expo
      ?.install?.exclude;
    expect(exclude).toContain("typescript");
    expect(major(all.typescript)).toBe(5);
  });

  it("imports navigation from expo-router, not @react-navigation/* (SDK 56)", () => {
    expect(filesMatching(/from\s+["']@react-navigation\//)).toEqual([]);
  });

  it("no longer depends on @react-navigation/native or bottom-tabs directly", () => {
    expect(all).not.toHaveProperty("@react-navigation/native");
    expect(all).not.toHaveProperty("@react-navigation/bottom-tabs");
  });

  it("uses StyleSheet.absoluteFill, not the removed absoluteFillObject", () => {
    expect(filesMatching(/absoluteFillObject/)).toEqual([]);
  });

  it("raises the apple-wallet-button pod to iOS 16.4", () => {
    const podspec = fs.readFileSync(
      path.join(ROOT, "modules/apple-wallet-button/ios/AppleWalletButton.podspec"),
      "utf8",
    );
    const m = podspec.match(/:ios\s*=>\s*'([\d.]+)'/);
    expect(Number(m?.[1])).toBeGreaterThanOrEqual(16.4);
  });

  it("has @react-native/jest-preset (peer of jest-expo 56+)", () => {
    expect(all).toHaveProperty("@react-native/jest-preset");
  });
});

describe("Expo SDK upgrade: config plugins", () => {
  const ROOT = path.resolve(__dirname, "..");

  const files = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return files(full);
      return /\.tsx?$/.test(entry.name) ? [full] : [];
    });

  // @expo/config-plugins and @expo/config-types are not our dependencies; npm stopped
  // hoisting them with SDK 57, so app.config.ts failed to load. expo re-exports both.
  it("imports config-plugin APIs through expo/, never undeclared @expo/* packages", () => {
    const offenders = [
      path.join(ROOT, "app.config.ts"),
      ...files(path.join(ROOT, "plugins")),
      ...files(path.join(ROOT, "integrations")),
    ]
      .filter((f) => /from\s+["']@expo\/config-(plugins|types)/.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  // Third-party plugins (react-native-app-auth, google-signin, ...) require
  // @expo/config-plugins from the project root. A lockfile that leaves it nested
  // under expo/ breaks prebuild; this catches that before a native build does.
  it("can load every third-party config plugin listed in app.config.ts", () => {
    const plugins = (loadConfig().plugins ?? []) as PluginEntry[];
    const names = plugins
      .map((p) => (Array.isArray(p) ? p[0] : p))
      .filter((name) => !name.startsWith("."));
    expect(names.length).toBeGreaterThan(0);
    // Expo loads <pkg>/app.plugin.js by file path (package "exports" maps hide it).
    const failures = names.filter((name) => {
      const appPlugin = path.join(ROOT, "node_modules", name, "app.plugin.js");
      try {
        jest.requireActual(fs.existsSync(appPlugin) ? appPlugin : name);
        return false;
      } catch {
        return true;
      }
    });
    expect(failures).toEqual([]);
  });
});

describe("Expo SDK upgrade: SDK 58", () => {
  const all = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  } as Record<string, string>;
  const pluginNames = () =>
    ((loadConfig().plugins ?? []) as PluginEntry[]).map((p) => (Array.isArray(p) ? p[0] : p));

  it("is on Expo SDK 58", () => {
    expect(major(all.expo)).toBe(58);
  });

  it("requires Node 22.13+ (SDK 58 minimum)", () => {
    const [maj, min] = packageJson.engines.node.replace(/^[^\d]*/, "").split(".").map(Number);
    expect(maj > 22 || (maj === 22 && min >= 13)).toBe(true);
  });

  it("uses react-native-app-auth 9 (8 does not build on React Native 0.88)", () => {
    expect(major(all["react-native-app-auth"])).toBeGreaterThanOrEqual(9);
  });

  it("adds the AppDelegate overrides plugin right after react-native-app-auth", () => {
    const names = pluginNames();
    const appAuth = names.indexOf("react-native-app-auth");
    expect(appAuth).toBeGreaterThanOrEqual(0);
    expect(names[appAuth + 1]).toBe("./plugins/withAppAuthAppDelegate.ts");
  });

  it("uses react-native-wallet-manager 2.2+ (2.1 fails Kotlin compile on RN 0.87+)", () => {
    const [maj, min] = all["react-native-wallet-manager"]
      .replace(/^[^\d]*/, "")
      .split(".")
      .map(Number);
    expect(maj > 2 || (maj === 2 && min >= 2)).toBe(true);
  });

  it("tests render with the same React version the app ships (react-test-renderer = react)", () => {
    const strip = (v: string) => v.replace(/^[^\d]*/, "");
    const [reactMaj, reactMin] = strip(all.react).split(".");
    expect(strip(all["react-test-renderer"])).toBe(strip(all.react));
    expect(strip(all["@types/react-test-renderer"]).split(".").slice(0, 2)).toEqual([
      reactMaj,
      reactMin,
    ]);
  });
});
