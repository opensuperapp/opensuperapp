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
import { AUTH_CONFIG } from "@/config/authConfig";
import { APPS, REDIRECT_URI, USER_INFO } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { setApps } from "@/context/slices/appSlice";
import {
  AuthState,
  resetAll,
  selectHasSessionEnded,
  setEndingSession,
  setSessionEnd,
} from "@/context/slices/authSlice";
import {
  clearDeviceState,
  clearLastSentFcmToken,
} from "@/context/slices/deviceSlice";
import { persistor } from "@/context/store";
import { clearNotifications } from "@/services/scheduledNotifications";
import { forgetUnsavedTokens } from "@/services/tokenRefresh";
import { SessionEnd } from "@/types/auth.types";
import {
  clearAuthDataFromSecureStore,
  loadAuthDataFromSecureStore,
} from "@/utils/authTokenStore";
import { clearAllExchangedTokens } from "@/utils/exchangedTokenStore";
import { clearInterruptedRefresh } from "@/utils/rotationGuard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { router } from "expo-router";
import { deleteItemAsync } from "expo-secure-store";
import { logout as appLogout } from "react-native-app-auth";

// Each step runs whatever happened to the one before: a keychain error must not leave
// the apps list on screen, which is how a failed logout used to clear nothing at all.
const runStep = async (name: string, step: () => unknown): Promise<void> => {
  try {
    await step();
  } catch (error) {
    console.error(`End session: ${name} failed`, error);
  }
};

const readAppIds = async (): Promise<string[]> => {
  const appsJson = await AsyncStorage.getItem(APPS);
  return appsJson
    ? (JSON.parse(appsJson) as { appId: string }[]).map((a) => a.appId)
    : [];
};

/**
 * The one way a session ends, whether the user signed out or the server rejected the
 * refresh token. Everything on the device is cleared first; Asgardeo is only told
 * afterwards, best effort, so signing out never depends on the network.
 */
export const endSession = createAsyncThunk<
  void,
  SessionEnd,
  { state: { auth: AuthState } }
>(
  "auth/endSession",
  async (end, { dispatch, getState }) => {
    // Before the first await, so an expiry reported again while this one is still
    // clearing finds the session already ended and is dropped by `condition`. Until the
    // clearing is done, the sign-in prompt stays hidden.
    dispatch(setSessionEnd(end));
    dispatch(setEndingSession(true));

    // Read before anything is cleared: Asgardeo needs the id token, and each app's
    // exchanged token is stored under its id.
    let idToken: string | undefined;
    let appIds: string[] = [];
    await runStep("reading the stored session", async () => {
      idToken = (await loadAuthDataFromSecureStore())?.idToken;
    });
    await runStep("reading app ids", async () => {
      appIds = await readAppIds();
    });

    // A sign-in from a Sign In button elsewhere can still land before this is done.
    // The device is that session's now, and clearing on would sign it out again.
    const isSuperseded = () => !selectHasSessionEnded(getState());
    const clearingSteps: [string, () => unknown][] = [
      ["clearing tokens", clearAuthDataFromSecureStore],
      ["forgetting tokens held only in memory", forgetUnsavedTokens],
      ["clearing exchanged tokens", () => clearAllExchangedTokens(appIds)],
      ["clearing user info", () => deleteItemAsync(USER_INFO)],
      ["purging persisted state", () => persistor.purge()],
      ["clearing notifications", clearNotifications],
      // Left behind, it would explain the next session's expiry as a lost rotation.
      ["clearing the interrupted-refresh marker", clearInterruptedRefresh],
      [
        "clearing the last sent FCM token",
        () => dispatch(clearLastSentFcmToken()),
      ],
    ];
    for (const [name, step] of clearingSteps) {
      if (isSuperseded()) {
        dispatch(setEndingSession(false));
        return;
      }
      await runStep(name, step);
    }
    if (isSuperseded()) {
      dispatch(setEndingSession(false));
      return;
    }

    // Also clears isEndingSession.
    dispatch(resetAll());
    dispatch(setApps([]));
    dispatch(clearDeviceState());
    // resetAll put the whole tree, status included, back to its initial state.
    dispatch(setSessionEnd(end));

    // Ending the Asgardeo session opens a browser, which only makes sense when the
    // user asked to sign out. After an expiry, keeping it lets them sign straight back in.
    if (end.status !== "signedOut") return;

    const signedOutIdToken = idToken;
    if (signedOutIdToken) {
      await runStep("Asgardeo logout", () =>
        appLogout(AUTH_CONFIG, {
          idToken: signedOutIdToken,
          postLogoutRedirectUrl: REDIRECT_URI,
        })
      );
    }

    router.navigate(ScreenPaths.FEED);
  },
  {
    condition: (_, { getState }) => !selectHasSessionEnded(getState()),
  }
);
