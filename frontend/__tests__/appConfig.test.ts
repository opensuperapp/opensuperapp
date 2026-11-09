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
function introspect() {
  const out = execFileSync(
    "npx",
    ["expo", "config", "--type", "introspect", "--json"],
    { cwd: path.resolve(__dirname, ".."), encoding: "utf8" },
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
