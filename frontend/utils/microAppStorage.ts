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

// A micro app's keys live under "<appId>.<key>", so "." is the one character
// a key may not carry. Secure Store itself only accepts alphanumerics, ".",
// "-" and "_", which is why the key charset is narrowed to match.
const KEY_SEPARATOR = ".";
const KEY_PATTERN = /^[\w-]+$/;
const APP_ID_PATTERN = /^[\w.-]+$/;

// The prefix the host app's own Secure Store entries carry
// (constants/Constants.ts), reserved so a crafted key cannot name one.
const RESERVED_KEY_PREFIX = "secure_";

/**
 * Scopes a bridge storage key to the micro app that asked for it, so a micro
 * app can address neither another micro app's entries nor the host app's.
 * Throws when the micro app is unidentified or the key would escape the
 * namespace, so callers fail closed rather than touching an unscoped key.
 * @param appId - The id of the micro app the bridge message came from
 * @param key - The key the micro app asked for
 * @returns The key namespaced to the micro app
 */
export const scopeMicroAppStorageKey = (
  appId: string | undefined,
  key: unknown
): string => {
  if (!appId || !APP_ID_PATTERN.test(appId)) {
    throw new Error("Storage is unavailable: the micro app is unidentified.");
  }

  if (typeof key !== "string" || !KEY_PATTERN.test(key)) {
    throw new Error(
      'Invalid storage key. Keys must not be empty and contain only alphanumeric characters, "-" and "_".'
    );
  }

  if (key.toLowerCase().startsWith(RESERVED_KEY_PREFIX)) {
    throw new Error("That storage key is reserved by the host app.");
  }

  return `${appId}${KEY_SEPARATOR}${key}`;
};
