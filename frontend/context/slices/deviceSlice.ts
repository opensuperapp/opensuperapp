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
  BASE_URL,
  LAST_SENT_FCM_TOKEN,
  LAST_SENT_PUSH_TOKEN,
} from "@/constants/Constants";
import { enqueueForReconnect } from "@/utils/offlineQueue";
import {
  getDevicePushToken,
  PushToken,
  requestNotificationPermission,
} from "@/utils/push-notification";
import { apiRequest } from "@/utils/requestHandler";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";

interface DeviceState {
  isPushingToken: boolean;
  pushTokenError: string | null;
  lastSentPushToken: string | null;
}

const initialState: DeviceState = {
  isPushingToken: false,
  pushTokenError: null,
  lastSentPushToken: null,
};

const isSuccess = (status?: number) =>
  status !== undefined && status >= 200 && status < 300;

// The token as the fcmToken query parameter: DELETE takes it there, and so does the
// current backend's POST, which answers 400 without it.
const tokenUrl = (token: string) =>
  `${BASE_URL}/users/fcm-tokens?fcmToken=${encodeURIComponent(token)}`;

// The registration body the next backend reads the token type from (and prefers over
// the query parameter): environment only for APNs tokens.
const toRequestBody = (pushToken: PushToken) =>
  pushToken.tokenType === "apns"
    ? {
        token: pushToken.token,
        tokenType: pushToken.tokenType,
        environment: pushToken.environment,
      }
    : { token: pushToken.token, tokenType: pushToken.tokenType };

// Hydrate the last sent push token
export const loadLastSentPushToken = createAsyncThunk(
  "device/loadLastSentPushToken",
  async () => {
    try {
      return await getItemAsync(LAST_SENT_PUSH_TOKEN);
    } catch (error) {
      console.error("Error loading last sent push token:", error);
      return null;
    }
  }
);

/**
 * Retires the token a pre-expo-notifications (RNFirebase messaging) build registered,
 * once per device.
 *
 * On Android that token is the FCM token expo-notifications reports too: it stays
 * registered (the following registration adds its type), only the stored copy is
 * dropped. On iOS it is an FCM token where the device now registers its APNs token,
 * so it is deleted, or the device would get every push twice.
 *
 * Best effort: whatever the server answers, the stored token is forgotten so this never
 * runs again. Only a request that never reached the server (offline, or no session yet)
 * leaves it for the next attempt.
 *
 * @param currentToken - The raw token this device registers now.
 */
export const cleanupLegacyFcmToken = createAsyncThunk(
  "device/cleanupLegacyFcmToken",
  async ({ currentToken }: { currentToken: string }) => {
    let legacyToken: string | null = null;
    try {
      legacyToken = await getItemAsync(LAST_SENT_FCM_TOKEN);
    } catch (error) {
      console.error("Error reading the legacy FCM token:", error);
      return;
    }
    if (!legacyToken) return;

    let answered = true;
    if (legacyToken !== currentToken) {
      try {
        const response = await apiRequest({
          url: tokenUrl(legacyToken),
          method: "DELETE",
        });
        answered = response !== undefined;
        if (answered && !isSuccess(response?.status)) {
          console.warn("Failed to delete the legacy FCM token:", response?.status);
        }
      } catch (error: any) {
        answered = Boolean(error?.response);
        console.warn("Failed to delete the legacy FCM token:", error);
      }
    }

    if (answered) {
      try {
        await deleteItemAsync(LAST_SENT_FCM_TOKEN);
      } catch (error) {
        console.error("Error clearing the legacy FCM token:", error);
      }
    }
  }
);

/**
 * Unregisters this device's push token from the backend, on sign-out. Also deletes a
 * legacy FCM token still on record that differs from it, so a user who signs out
 * before the one-time cleanup ran is not left subscribed through it.
 */
export const disablePushToken = createAsyncThunk(
  "device/disablePushToken",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const token = await getItemAsync(LAST_SENT_PUSH_TOKEN);
      await dispatch(cleanupLegacyFcmToken({ currentToken: token ?? "" }));
      if (!token) {
        return rejectWithValue("No push token found");
      }
      const response = await apiRequest({
        url: tokenUrl(token),
        method: "DELETE",
      });

      if (isSuccess(response?.status)) {
        return response?.data;
      } else {
        console.warn("Failed to delete push token");
        return rejectWithValue("Failed to delete push token");
      }
    } catch (error: any) {
      console.error("Error occurred while deleting push token:", error);
      return rejectWithValue(error);
    }
  }
);

/**
 * Forgets the registered push tokens (current and legacy FCM) on this device.
 */
export const clearLastSentPushToken = createAsyncThunk(
  "device/clearLastSentPushToken",
  async () => {
    for (const key of [LAST_SENT_PUSH_TOKEN, LAST_SENT_FCM_TOKEN]) {
      try {
        await deleteItemAsync(key);
      } catch (error) {
        console.error(`Error occurred while clearing ${key}:`, error);
      }
    }
  }
);

/**
 * Registers the raw push token, with its type, with the backend. Called when the user
 * is authenticated.
 */
export const registerPushToken = createAsyncThunk(
  "device/registerPushToken",
  async (pushToken: PushToken, { dispatch, rejectWithValue }) => {
    try {
      const response = await apiRequest({
        url: tokenUrl(pushToken.token),
        method: "POST",
        data: toRequestBody(pushToken),
      });

      if (isSuccess(response?.status)) {
        await setItemAsync(LAST_SENT_PUSH_TOKEN, pushToken.token);
        return response?.data;
      } else {
        console.warn("Failed to register push token");
        return rejectWithValue("Failed to register push token");
      }
    } catch (error: any) {
      console.error("Failed to register push token:", error);
      // It never reached the backend, and nothing else retries it before the next launch:
      // the push hook only runs again when the access token or the push token changes.
      // Safe to repeat, as the backend upserts on the token.
      if (!error?.response) {
        enqueueForReconnect("registerPushToken", () =>
          dispatch(registerPushToken(pushToken))
        );
      }
      return rejectWithValue(error);
    }
  }
);

/**
 * Brings the backend's record of this device up to date: gets the raw push token,
 * retires a legacy FCM registration once and registers the token if it changed since
 * the last successful registration. Safe to call on every launch and on token rotation.
 *
 * @param prompt - Whether to ask for notification permission first (sign-in), or only
 *   use what was already granted (token rotation).
 * @param pushToken - The rotated token addPushTokenListener delivered; fetched when absent.
 */
export const syncPushToken = createAsyncThunk(
  "device/syncPushToken",
  async (
    { prompt, pushToken }: { prompt: boolean; pushToken?: PushToken },
    { dispatch }
  ) => {
    let current = pushToken ?? null;
    if (!current) {
      if (prompt) {
        await requestNotificationPermission();
      }
      current = await getDevicePushToken();
    }
    // No token (permission denied, fetch failed): nothing to compare a legacy token
    // with, so the cleanup waits for a launch that has one.
    if (!current) return;

    await dispatch(cleanupLegacyFcmToken({ currentToken: current.token }));

    let lastSent: string | null = null;
    try {
      lastSent = await getItemAsync(LAST_SENT_PUSH_TOKEN);
    } catch (error) {
      console.error("Error reading the last sent push token:", error);
    }
    if (current.token === lastSent) return;

    await dispatch(registerPushToken(current));
  }
);
// Redux slice
const deviceSlice = createSlice({
  name: "device",
  initialState,
  reducers: {
    clearDeviceState: (state) => {
      state.isPushingToken = false;
      state.pushTokenError = null;
      state.lastSentPushToken = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(disablePushToken.fulfilled, (state) => {
        state.lastSentPushToken = null;
      })
      .addCase(loadLastSentPushToken.fulfilled, (state, action) => {
        state.lastSentPushToken = action.payload;
      })
      .addCase(registerPushToken.pending, (state) => {
        state.isPushingToken = true;
        state.pushTokenError = null;
      })
      .addCase(registerPushToken.fulfilled, (state, action) => {
        state.isPushingToken = false;
        state.lastSentPushToken = action.meta.arg.token;
      })
      .addCase(registerPushToken.rejected, (state, action) => {
        state.isPushingToken = false;
        state.pushTokenError = action.payload as string;
      });
  },
});

export const { clearDeviceState } = deviceSlice.actions;
export default deviceSlice.reducer;
