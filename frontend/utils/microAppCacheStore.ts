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
  LAST_LOGGED_IN_USER_ID_KEY,
  MICRO_APP_STORAGE_DIR,
  USER_CONFIGURATIONS,
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
  await AsyncStorage.removeItem(USER_CONFIGURATIONS);
  dispatch(setApps([]));
};

// Keeps a signed-in user's downloaded micro-apps across logout/login so the
// same user isn't forced to re-download every app on every sign-in. If a
// different user signs in on this device, the previous user's cached apps
// are cleared instead of being shown under "My Apps". Keyed by the token's
// stable userId rather than email, since an email can be reassigned/changed
// while the userId stays fixed for the account.
export const syncMicroAppCacheForUser = async (
  dispatch: Dispatch<UnknownAction>,
  userId: string
) => {
  try {
    const lastLoggedInUserId = await AsyncStorage.getItem(
      LAST_LOGGED_IN_USER_ID_KEY
    );

    if (lastLoggedInUserId && lastLoggedInUserId !== userId) {
      await clearDownloadedMicroApps(dispatch);
    }

    await AsyncStorage.setItem(LAST_LOGGED_IN_USER_ID_KEY, userId);
  } catch (error) {
    console.error("Error syncing micro-app cache for user:", error);
    // Fail closed: if we can't verify whose cache this is, don't risk
    // exposing a previous user's downloaded apps to the new session.
    try {
      await clearDownloadedMicroApps(dispatch);
    } catch (cleanupError) {
      console.error(
        "Error clearing micro-app cache after a sync failure:",
        cleanupError
      );
    }
  }
};
