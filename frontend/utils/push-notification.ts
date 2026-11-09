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
  isIos,
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_CHANNEL_NAME,
} from "@/constants/Constants";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { PermissionsAndroid } from "react-native";
import { promptForExactAlarmOnce } from "@/utils/exactAlarmPermission";

/**
 * The device's own push token, as the backend needs it to pick a sender:
 * FCM on Android, APNs on iOS (which also needs the APNs host the build talks to).
 */
export type PushToken =
  | { token: string; tokenType: "fcm" }
  | { token: string; tokenType: "apns"; environment: string };

const toPushToken = (devicePushToken: Notifications.DevicePushToken): PushToken =>
  devicePushToken.type === "ios"
    ? {
        token: devicePushToken.data,
        tokenType: "apns",
        environment: Constants.expoConfig?.extra?.apsEnvironment,
      }
    : { token: devicePushToken.data, tokenType: "fcm" };

// Function to initialize notification service
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

// Request notification permission for Android
const requestNotificationPermissionAndroid = async (): Promise<boolean> => {
  const grantedNotificationPermission = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );
  const isGranted =
    grantedNotificationPermission === PermissionsAndroid.RESULTS.GRANTED;
  if (!isGranted) return false;

  await promptForExactAlarmOnce();
  return isGranted;
};

// Request notification permission
export const requestNotificationPermission = async () => {
  if (isIos) {
    await Notifications.requestPermissionsAsync();
  } else if (isAndroid) {
    await requestNotificationPermissionAndroid();
  }
};

const isPermitted = (permissions: Notifications.NotificationPermissionsStatus) =>
  permissions.granted ||
  permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

// Get the device push token
export const getPushToken = async (): Promise<PushToken | null> => {
  if (!isPermitted(await Notifications.getPermissionsAsync())) {
    console.warn("User has not granted notification permissions.");
    return null;
  }
  try {
    return toPushToken(await Notifications.getDevicePushTokenAsync());
  } catch (error) {
    console.error("Error getting push token:", error);
    return null;
  }
};

/**
 * Sets up a listener for when the device push token is rotated.
 * Returns an unsubscribe function to be called on cleanup.
 * @param onRefresh - The callback function to execute with the new token.
 */
export const setupTokenRefreshListener = (
  onRefresh: (token: PushToken) => void
): (() => void) => {
  const subscription = Notifications.addPushTokenListener((devicePushToken) =>
    onRefresh(toPushToken(devicePushToken))
  );
  return () => subscription.remove();
};
