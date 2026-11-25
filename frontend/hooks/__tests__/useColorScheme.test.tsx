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
import fs from "fs";
import path from "path";
import React from "react";
import { act, create } from "react-test-renderer";

const mockRNColorScheme = jest.fn();

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: () => mockRNColorScheme(),
}));

// eslint-disable-next-line import/first
import { useColorScheme } from "@/hooks/useColorScheme";

const renderScheme = () => {
  let value: unknown;
  const Probe = () => {
    value = useColorScheme();
    return null;
  };
  act(() => {
    create(<Probe />);
  });
  return value;
};

describe("useColorScheme", () => {
  it.each(["light", "dark"])("passes %s through", (scheme) => {
    mockRNColorScheme.mockReturnValue(scheme);
    expect(renderScheme()).toBe(scheme);
  });

  // React Native 0.82+ widened ColorSchemeName with "unspecified". Callers index
  // Colors[scheme], which has no "unspecified" key, so it must never leak out.
  it.each(["unspecified", null, undefined])("maps %s to null", (scheme) => {
    mockRNColorScheme.mockReturnValue(scheme);
    expect(renderScheme()).toBeNull();
  });
});

describe("useColorScheme call sites", () => {
  const ROOT = path.resolve(__dirname, "../..");
  const DIRS = ["app", "components", "hooks", "context", "utils", "constants"];
  const HOOK_FILES = new Set([
    path.join(ROOT, "hooks/useColorScheme.ts"),
    path.join(ROOT, "hooks/useColorScheme.web.ts"),
  ]);

  const sourceFiles = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return entry.name === "__tests__" ? [] : sourceFiles(full);
      }
      return /\.tsx?$/.test(entry.name) ? [full] : [];
    });

  it("import useColorScheme from @/hooks/useColorScheme, never from react-native", () => {
    const offenders = DIRS.flatMap((d) => sourceFiles(path.join(ROOT, d)))
      .filter((file) => !HOOK_FILES.has(file))
      .filter((file) => {
        const src = fs.readFileSync(file, "utf8");
        return /import\s*\{[^}]*\buseColorScheme\b[^}]*\}\s*from\s*["']react-native["']/.test(
          src,
        );
      })
      .map((file) => path.relative(ROOT, file));
    expect(offenders).toEqual([]);
  });
});
