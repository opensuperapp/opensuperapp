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
  isAndroid,
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_CHANNEL_NAME,
} from "@/constants/Constants";
import { promptForExactAlarmOnce } from "@/utils/exactAlarmPermission";
import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

/**
 * Creates the Android channel pushes and scheduled sessions are shown on, and shows
 * notifications that arrive while the app is in the foreground. Background pushes
 * are drawn on the FCM default channel, which app.config.ts sets to the same id;
 * the push service should also set `android.notification.channel_id` to it.
 */
export const initializeNotifications = async () => {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (isAndroid) {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: NOTIFICATION_CHANNEL_NAME,
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    return true;
  } catch (error) {
    console.error("Error initializing notifications:", error);
    return false;
  }
};

const isPermitted = (permissions: Notifications.NotificationPermissionsStatus) =>
  permissions.granted ||
  permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

/**
 * Asks for notification permission (POST_NOTIFICATIONS on Android 13+), and on
 * Android sends the user once to the exact-alarm settings scheduled sessions need.
 * @returns Whether notifications may be shown.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const permissions = await Notifications.requestPermissionsAsync();
    const granted = isPermitted(permissions);
    if (granted && isAndroid) {
      await promptForExactAlarmOnce();
    }
    return granted;
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
};

export type ApnsEnvironment = "development" | "production";

/**
 * This device's raw push token, as the backend needs it to pick a sender: an FCM
 * registration token on Android, an APNs device token (hex) on iOS, which also needs
 * the APNs host it is valid for.
 */
export type PushToken =
  | { token: string; tokenType: "fcm" }
  | { token: string; tokenType: "apns"; environment: ApnsEnvironment };

const isApnsEnvironment = (value: unknown): value is ApnsEnvironment =>
  value === "development" || value === "production";

/**
 * The APNs environment this build's device tokens belong to.
 *
 * 1. The `aps-environment` entitlement of the embedded provisioning profile
 *    (expo-application). Present on development, ad hoc and enterprise builds.
 * 2. No profile: App Store and TestFlight builds have it stripped, and both use
 *    production APNs; the simulator has none and gets sandbox tokens.
 * 3. Otherwise the build-time value app.config.ts derives from the EAS build profile
 *    (`extra.apsEnvironment`, the same value it writes to the entitlement).
 *
 * @returns The environment, or null if none of these answers.
 */
export const getApnsEnvironment = async (): Promise<ApnsEnvironment | null> => {
  try {
    const fromProfile =
      await Application.getIosPushNotificationServiceEnvironmentAsync();
    if (isApnsEnvironment(fromProfile)) return fromProfile;

    const releaseType = await Application.getIosApplicationReleaseTypeAsync();
    if (releaseType === Application.ApplicationReleaseType.APP_STORE) {
      return "production";
    }
    if (releaseType === Application.ApplicationReleaseType.SIMULATOR) {
      return "development";
    }
  } catch (error) {
    console.error("Error reading the APNs environment:", error);
  }
  const fromConfig = Constants.expoConfig?.extra?.apsEnvironment;
  return isApnsEnvironment(fromConfig) ? fromConfig : null;
};

/**
 * Turns the device token expo-notifications reports into what the backend stores.
 * @returns null for a token the backend cannot send to (web, or iOS with no known
 *   APNs environment).
 */
export const toPushToken = async (
  devicePushToken: Notifications.DevicePushToken
): Promise<PushToken | null> => {
  const token = devicePushToken.data;
  if (typeof token !== "string" || !token) return null;
  if (devicePushToken.type === "android") return { token, tokenType: "fcm" };
  if (devicePushToken.type === "ios") {
    const environment = await getApnsEnvironment();
    if (!environment) {
      console.warn("Unknown APNs environment; the push token is not registered.");
      return null;
    }
    return { token, tokenType: "apns", environment };
  }
  return null;
};

/**
 * Gets this device's raw push token (FCM on Android, APNs on iOS).
 * @returns The token, or null when notifications are not permitted or the token could
 *   not be fetched.
 */
export const getDevicePushToken = async (): Promise<PushToken | null> => {
  try {
    if (!isPermitted(await Notifications.getPermissionsAsync())) {
      console.warn("User has not granted notification permissions.");
      return null;
    }
    return await toPushToken(await Notifications.getDevicePushTokenAsync());
  } catch (error) {
    console.error("Error getting the device push token:", error);
    return null;
  }
};

/**
 * Calls `onRefresh` with the new token when the device push token (FCM/APNs) rotates.
 * @returns An unsubscribe function to be called on cleanup.
 */
export const setupTokenRefreshListener = (
  onRefresh: (token: PushToken) => void
): (() => void) => {
  const subscription = Notifications.addPushTokenListener((devicePushToken) => {
    toPushToken(devicePushToken)
      .then((pushToken) => {
        if (pushToken) onRefresh(pushToken);
      })
      .catch((error) =>
        console.error("Error handling the refreshed push token:", error)
      );
  });
  return () => subscription.remove();
};
