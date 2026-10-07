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
import {
  fetchDevServerPermissions,
  getDevServerManifestUrl,
  parseRequiredPermissions,
} from "@/utils/microAppManifest";

describe("parseRequiredPermissions", () => {
  it("keeps the string entries of an array", () => {
    expect(parseRequiredPermissions(["location", 7, null, "camera"])).toEqual([
      "location",
      "camera",
    ]);
  });

  it("grants nothing for a value that is not an array", () => {
    expect(parseRequiredPermissions("location")).toEqual([]);
    expect(parseRequiredPermissions({ location: true })).toEqual([]);
    expect(parseRequiredPermissions(undefined)).toEqual([]);
  });
});

describe("getDevServerManifestUrl", () => {
  it.each([
    ["http://host:3000", "http://host:3000/microapp.json"],
    ["http://host:3000/", "http://host:3000/microapp.json"],
    ["http://host:3000/app", "http://host:3000/app/microapp.json"],
    ["http://host:3000/app/index.html", "http://host:3000/app/microapp.json"],
    ["http://host:3000/?debug=1#/route", "http://host:3000/microapp.json"],
    ["http://host:3000/index.html?x=1", "http://host:3000/microapp.json"],
    // A dotted host is not a file name.
    ["http://kasunsi.local:8000", "http://kasunsi.local:8000/microapp.json"],
    ["http://192.168.1.5:5173", "http://192.168.1.5:5173/microapp.json"],
  ])("%s -> %s", (webUri, expected) => {
    expect(getDevServerManifestUrl(webUri)).toBe(expected);
  });
});

describe("fetchDevServerPermissions", () => {
  const originalFetch = global.fetch;
  const mockFetch = jest.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const respondWith = (ok: boolean, body: unknown) =>
    mockFetch.mockResolvedValue({ ok, status: ok ? 200 : 404, json: async () => body });

  it("reads requiredPermissions from the dev server's microapp.json, uncached", async () => {
    respondWith(true, { clientId: "x", requiredPermissions: ["location"] });

    await expect(fetchDevServerPermissions("http://host:3000/")).resolves.toEqual([
      "location",
    ]);
    expect(mockFetch).toHaveBeenCalledWith("http://host:3000/microapp.json", {
      cache: "no-store",
    });
  });

  it("grants nothing when the manifest declares nothing", async () => {
    respondWith(true, { clientId: "x" });

    await expect(fetchDevServerPermissions("http://host:3000")).resolves.toEqual([]);
  });

  it("grants nothing when the manifest is not an object", async () => {
    respondWith(true, null);

    await expect(fetchDevServerPermissions("http://host:3000")).resolves.toEqual([]);
  });

  it("grants nothing when the dev server has no manifest", async () => {
    respondWith(false, { requiredPermissions: ["location"] });

    await expect(fetchDevServerPermissions("http://host:3000")).resolves.toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });

  it("grants nothing when the dev server is unreachable", async () => {
    mockFetch.mockRejectedValue(new TypeError("Network request failed"));

    await expect(fetchDevServerPermissions("http://host:3000")).resolves.toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });
});
