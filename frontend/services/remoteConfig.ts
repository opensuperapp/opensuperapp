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
import { REMOTE_CONFIG_INITIAL_VALUES } from "@/config/remoteConfig";
import {
  activate,
  fetchAndActivate,
  getRemoteConfig,
  getValue,
  onConfigUpdate,
  setConfigSettings,
  setDefaults,
} from "@react-native-firebase/remote-config";

// The SDK serves the last activated values from disk on every launch and will
// not go back to the server until this interval has elapsed. Its own default is
// twelve hours, which is far too coarse to roll a flag out or pull one back:
// a published change stays invisible for the rest of the day.
const MINIMUM_FETCH_INTERVAL_MILLIS = __DEV__ ? 0 : 60 * 60 * 1000;

let initialization: Promise<void> | null = null;

/**
 * Applies the fetch settings, seeds the in-app defaults, then activates the
 * newest published values — in that order, since the settings have to be in
 * place before the fetch and the defaults before anything reads a value.
 *
 * Safe to call from anywhere: every caller shares the first call's promise, so
 * consumers can await this instead of racing the app's startup effect.
 */
export const initializeRemoteConfig = (): Promise<void> => {
  initialization ??= (async () => {
    try {
      const remoteConfig = getRemoteConfig();
      await setConfigSettings(remoteConfig, {
        minimumFetchIntervalMillis: MINIMUM_FETCH_INTERVAL_MILLIS,
      });
      await setDefaults(remoteConfig, REMOTE_CONFIG_INITIAL_VALUES);
      await fetchAndActivate(remoteConfig);
    } catch (error) {
      // A failed fetch leaves the defaults active, which is still a usable app.
      console.error("Error initializing remote config:", error);
    }
  })();

  return initialization;
};

/**
 * Retrieves a remote config value as a string.
 * @param key - The remote config parameter key
 * @returns The string value of the remote config parameter
 */
export const getRemoteConfigValueAsString = (key: string): string => {
  return getValue(getRemoteConfig(), key).asString();
};

/**
 * Retrieves a remote config value as a boolean.
 * @param key - The remote config parameter key
 * @returns The boolean value of the remote config parameter
 */
export const getRemoteConfigValueAsBoolean = (key: string): boolean => {
  return getValue(getRemoteConfig(), key).asBoolean();
};

/**
 * Retrieves a remote config value as a number.
 * @param key - The remote config parameter key
 * @returns The number value of the remote config parameter
 */
export const getRemoteConfigValueAsNumber = (key: string): number => {
  return getValue(getRemoteConfig(), key).asNumber();
};

/**
 * Retrieves a remote config value as a parsed JSON object.
 * @param key - The remote config parameter key
 * @returns The parsed JSON value of the remote config parameter
 * @throws {SyntaxError} If the stored value is not valid JSON
 */
export const getRemoteConfigValueAsJson = <T>(key: string): T => {
  const jsonString = getValue(getRemoteConfig(), key).asString();
  return JSON.parse(jsonString) as T;
};

/**
 * Listens for remote config changes.
 * @param callback - The callback function to call when the remote config changes.
 * @returns An unsubscribe function.
 */
export const onRemoteConfigChange = (
  callback: (error: Error | null, updatedKeys: Set<string> | null) => void
) => {
  const unsubscribe = onConfigUpdate(getRemoteConfig(), {
    next: async (update) => {
      try {
        await activate(getRemoteConfig());
        callback(null, update.getUpdatedKeys());
      } catch (error) {
        console.error("Error activating remote config:", error);
        callback(error as Error, null);
      }
    },
    error: (error) => {
      console.error("Error fetching remote config:", error);
      callback(error as Error, null);
    },
    complete: () => {
      callback(null, null);
    },
  });
  return unsubscribe;
};
