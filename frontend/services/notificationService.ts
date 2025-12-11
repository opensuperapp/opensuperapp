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

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

export interface NotificationData {
    microappId?: string;
    action?: string;
    [key: string]: any;
}

export interface PushNotification {
    title: string;
    body: string;
    data?: NotificationData;
}

/**
 * Configure how notifications are handled when the app is in the foreground
 */
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Request notification permissions from the user
 * @returns Promise<boolean> - true if permissions granted, false otherwise
 */
export async function requestNotificationPermissions(): Promise<boolean> {
    // if (!Device.isDevice) {
    //     console.warn("Push notifications only work on physical devices");
    //     return false;
    // }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        console.warn("Failed to get push notification permissions");
        return false;
    }

    return true;
}

/**
 * Get the Expo push token for this device (OPTIONAL - not needed for Firebase)
 * This is only required if you want to use Expo's push notification service
 * For Firebase Cloud Messaging, use getDevicePushToken() instead
 * @returns Promise<string | null> - The push token or null if failed
 */
export async function getExpoPushToken(): Promise<string | null> {
    console.warn("getExpoPushToken is not needed for Firebase Cloud Messaging. Use getDevicePushToken() instead.");
    return null;
}

/**
 * Get the device's FCM token (Android) or APNs token (iOS)
 * This is the token that should be sent to your backend for Firebase
 * @returns Promise<string | null> - The device token or null if failed
 */
export async function getDevicePushToken(): Promise<string | null> {
    try {
        // if (!Device.isDevice) {
        //     console.warn("Must use physical device for push notifications");
        //     return null;
        // }

        // For Android, this returns the FCM token
        // For iOS, this returns the APNs token
        const token = await Notifications.getDevicePushTokenAsync();

        return token.data;
    } catch (error) {
        console.error("Error getting device push token:", error);
        return null;
    }
}

/**
 * Register notification listeners
 * @param onNotificationReceived - Callback when notification is received (foreground)
 * @param onNotificationTapped - Callback when notification is tapped
 * @returns Cleanup function to remove listeners
 */
export function registerNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationTapped?: (response: Notifications.NotificationResponse) => void
): () => void {
    const receivedSubscription = Notifications.addNotificationReceivedListener(
        (notification) => {
            onNotificationReceived?.(notification);
        }
    );

    const responseSubscription =
        Notifications.addNotificationResponseReceivedListener((response) => {
            onNotificationTapped?.(response);
        });

    // Return cleanup function
    return () => {
        receivedSubscription.remove();
        responseSubscription.remove();
    };
}

/**
 * Configure notification channels for Android
 * Required for Android 8.0+
 */
export async function configureNotificationChannels(): Promise<void> {
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "Default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#476481",
        });

        await Notifications.setNotificationChannelAsync("microapp-updates", {
            name: "Micro App Updates",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#476481",
        });

        await Notifications.setNotificationChannelAsync("system-alerts", {
            name: "System Alerts",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF0000",
            sound: "default",
        });
    }
}

/**
 * Schedule a local notification (for testing)
 * @param notification - The notification to schedule
 * @param seconds - Seconds from now to schedule the notification
 */
export async function scheduleLocalNotification(
    notification: PushNotification,
    seconds: number = 1
): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
            title: notification.title,
            body: notification.body,
            data: notification.data || {},
            sound: true,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds,
        },
    });

    return notificationId;
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear badge count
 */
export async function clearBadgeCount(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
}
