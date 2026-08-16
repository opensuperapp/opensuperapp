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
  LAST_LOGGED_IN_EMAIL_KEY,
  MICRO_APP_STORAGE_DIR,
} from "@/constants/Constants";
import { setApps } from "@/context/slices/appSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Dispatch, UnknownAction } from "@reduxjs/toolkit";
import { Directory, Paths } from "expo-file-system";

// Removes locally downloaded micro-app files and cached metadata so a
// different user signing in on this device never inherits the previous
// user's downloaded apps.
const clearDownloadedMicroApps = async (dispatch: Dispatch<UnknownAction>) => {
  const microAppsDir = new Directory(
    Paths.document,
    MICRO_APP_STORAGE_DIR,
    "micro-apps"
  );
  if (microAppsDir.exists) {
    microAppsDir.delete();
  }
  await AsyncStorage.removeItem(APPS);
  dispatch(setApps([]));
};

// Keeps a signed-in user's downloaded micro-apps across logout/login so the
// same user isn't forced to re-download every app on every sign-in. If a
// different user signs in on this device, the previous user's cached apps
// are cleared instead of being shown under "My Apps".
export const syncMicroAppCacheForUser = async (
  dispatch: Dispatch<UnknownAction>,
  email: string
) => {
  try {
    const lastLoggedInEmail = await AsyncStorage.getItem(
      LAST_LOGGED_IN_EMAIL_KEY
    );

    if (lastLoggedInEmail && lastLoggedInEmail !== email) {
      await clearDownloadedMicroApps(dispatch);
    }

    await AsyncStorage.setItem(LAST_LOGGED_IN_EMAIL_KEY, email);
  } catch (error) {
    // Never let a cache-sync failure block sign-in.
    console.error("Error syncing micro-app cache for user:", error);
  }
};
