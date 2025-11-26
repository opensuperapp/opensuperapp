// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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
  APPS,
  AUTH_DATA,
  GOOGLE_ACCESS_TOKEN_KEY,
  GOOGLE_REFRESH_TOKEN_KEY,
  GOOGLE_USER_INFO_KEY,
  USER_INFO,
} from "@/constants/Constants";
import { MicroApp } from "@/context/slices/appSlice";
import {
  saveAuthDataToSecureStore,
  SecureAuthData,
} from "@/utils/authTokenStore";
import {
  persistAppsWithoutTokens,
  saveExchangedToken,
} from "@/utils/exchangedTokenStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// Existing keys to be moved from AsyncStorage to SecureStore
const EXISTING_KEYS = [
  USER_INFO,
  GOOGLE_ACCESS_TOKEN_KEY,
  GOOGLE_REFRESH_TOKEN_KEY,
  GOOGLE_USER_INFO_KEY,
];

/**
 * Migrates sensitive keys from AsyncStorage to SecureStore.s
 */
export const migrateToSecureStore = async () => {
  for (const key of EXISTING_KEYS) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        await SecureStore.setItemAsync(key, value);
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Failed to migrate key: ${key}`, error);
      throw new Error(`Migration for key "${key}" failed. Halting process.`);
    }
  }

  await migrateAuthDataToSecureStore();
  await migrateAppExchangesToSecureStore();
};

/**
 * Migrates auth data from AsyncStorage to SecureStore.
 */
export const migrateAuthDataToSecureStore = async () => {
  const authData = await AsyncStorage.getItem(AUTH_DATA);
  if (authData) {
    const parsedAuthData = JSON.parse(authData as string) as SecureAuthData;
    if (parsedAuthData) {
      await saveAuthDataToSecureStore(parsedAuthData);
      await AsyncStorage.removeItem(AUTH_DATA);
    }
  }
};

/**
 * Migrates app exchanges from AsyncStorage to SecureStore.
 */
export const migrateAppExchangesToSecureStore = async () => {
  const apps = await AsyncStorage.getItem(APPS);
  if (apps) {
    const parsedApps = JSON.parse(apps as string) as MicroApp[];
    if (parsedApps) {
      for (const app of parsedApps) {
        if (app.exchangedToken) {
          await saveExchangedToken(app.appId, app.exchangedToken);
        }
      }
      await persistAppsWithoutTokens(parsedApps);
    }
  }
};
