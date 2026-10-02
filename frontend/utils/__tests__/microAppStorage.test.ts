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
import { ACCESS_TOKEN, REFRESH_TOKEN } from "@/constants/Constants";
import { scopeMicroAppStorageKey } from "@/utils/microAppStorage";

describe("scopeMicroAppStorageKey", () => {
  it("namespaces a key by the micro app that asked for it", () => {
    expect(scopeMicroAppStorageKey("sample-app", "settings")).toBe(
      "sample-app.settings"
    );
  });

  it("keeps two micro apps apart for the same key", () => {
    expect(scopeMicroAppStorageKey("sample-app", "settings")).not.toBe(
      scopeMicroAppStorageKey("other-app", "settings")
    );
  });

  it("produces a key Secure Store accepts", () => {
    expect(scopeMicroAppStorageKey("sample-app", "a_key-1")).toMatch(
      /^[\w.-]+$/
    );
  });

  it("rejects the host app's own auth keys outright", () => {
    expect(() => scopeMicroAppStorageKey("sample-app", ACCESS_TOKEN)).toThrow(
      /reserved/
    );
    expect(() => scopeMicroAppStorageKey("sample-app", REFRESH_TOKEN)).toThrow(
      /reserved/
    );
    expect(() =>
      scopeMicroAppStorageKey("sample-app", "SECURE_refresh_token")
    ).toThrow(/reserved/);
  });

  it("rejects a key carrying the namespace separator", () => {
    expect(() =>
      scopeMicroAppStorageKey("sample-app", "other-app.settings")
    ).toThrow(/Invalid storage key/);
    expect(() => scopeMicroAppStorageKey("sample-app", "../settings")).toThrow(
      /Invalid storage key/
    );
  });

  it("rejects an empty or non-string key", () => {
    expect(() => scopeMicroAppStorageKey("sample-app", "")).toThrow(
      /Invalid storage key/
    );
    expect(() => scopeMicroAppStorageKey("sample-app", undefined)).toThrow(
      /Invalid storage key/
    );
    expect(() => scopeMicroAppStorageKey("sample-app", { key: "a" })).toThrow(
      /Invalid storage key/
    );
  });

  it("fails closed when the micro app is unidentified", () => {
    expect(() => scopeMicroAppStorageKey(undefined, "settings")).toThrow(
      /unidentified/
    );
    expect(() => scopeMicroAppStorageKey("", "settings")).toThrow(
      /unidentified/
    );
    expect(() => scopeMicroAppStorageKey("sample app", "settings")).toThrow(
      /unidentified/
    );
  });
});
