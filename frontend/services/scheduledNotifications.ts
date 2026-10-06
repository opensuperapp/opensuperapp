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
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ANDROID_NOTIFICATION_SMALL_ICON_ACCENT_COLOR,
  NOTIFICATION_CHANNEL_ID,
} from "@/constants/Constants";
import {
  ScheduledNotificationData,
  ScheduledNotificationIdentifiable,
} from "@/types/microApp.types";
import notifee, {
  AndroidCategory,
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
} from "@notifee/react-native";

const SCHEDULED_LOCAL_NOTIFICATIONS_KEY = "scheduled_local_notifications";
const SCHEDULED_IDS_KEY = "scheduled_notification_ids";
const CANCELLED_IDS_KEY = "cancelled_notification_ids";
const SCHEDULED_DATA_PREFIX = "scheduled_data_";

export type LocalNotification = {
  id: string;
  title: string;
  body: string;
  triggeredAt: string;
};

const MAX_LOCAL_NOTIFICATIONS = 50;

// Schedule notifications for sessions
export const scheduleSessionNotifications = async (
  data: ScheduledNotificationData
) => {
  try {
    const now = new Date();
    const triggerTime = new Date(data.time);
    if (triggerTime.getTime() > now.getTime()) {
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: triggerTime.getTime(),
      };

      await notifee.createTriggerNotification(
        {
          title: data.title,
          body: data.body,
          id: data.id,
          data: { screen: "/(tabs)/apps/notifications" },
          android: {
            channelId: NOTIFICATION_CHANNEL_ID,
            smallIcon: "ic_notification",
            color: ANDROID_NOTIFICATION_SMALL_ICON_ACCENT_COLOR,
            importance: AndroidImportance.HIGH,
            sound: "default",
            category: AndroidCategory.ALARM,
            pressAction: {
              id: "default",
            },
          },
        },
        trigger
      );

      const existingIdsJson = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
      const existingIds: string[] = existingIdsJson
        ? JSON.parse(existingIdsJson)
        : [];
      existingIds.push(data.id);
      await AsyncStorage.setItem(
        SCHEDULED_IDS_KEY,
        JSON.stringify(existingIds)
      );

      await AsyncStorage.setItem(
        SCHEDULED_DATA_PREFIX + data.id,
        JSON.stringify({ id: data.id, title: data.title, body: data.body })
      );
    }
  } catch (error) {
    console.error("Error scheduling notifications:", error);
  }
};

// Clear notifications and local storage on logout
export const clearNotifications = async () => {
  try {
    await notifee.cancelAllNotifications();

    const scheduledIdsJson = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
    const scheduledIds: string[] = scheduledIdsJson
      ? JSON.parse(scheduledIdsJson)
      : [];
    const scheduledDataKeys = scheduledIds.map(
      (id) => SCHEDULED_DATA_PREFIX + id
    );

    await AsyncStorage.multiRemove([
      SCHEDULED_LOCAL_NOTIFICATIONS_KEY,
      SCHEDULED_IDS_KEY,
      CANCELLED_IDS_KEY,
      ...scheduledDataKeys,
    ]);
  } catch (error) {
    console.error("Error clearing notifications:", error);
  }
};

export const cancelLocalNotification = async (
  data: ScheduledNotificationIdentifiable
) => {
  try {
    await notifee.cancelTriggerNotification(data.id);

    const existingIdsJson = await AsyncStorage.getItem(CANCELLED_IDS_KEY);
    const existingIds: string[] = existingIdsJson
      ? JSON.parse(existingIdsJson)
      : [];
    existingIds.push(data.id);
    await AsyncStorage.setItem(
      CANCELLED_IDS_KEY,
      JSON.stringify(existingIds)
    );
  } catch (error) {
    console.error("Error cancelling notification:", error);
  }
};

export const persistTriggeredNotification = async (
  data: ScheduledNotificationData
) => {
  try {
    const existingJson = await AsyncStorage.getItem(
      SCHEDULED_LOCAL_NOTIFICATIONS_KEY
    );
    const existing: LocalNotification[] = existingJson
      ? JSON.parse(existingJson)
      : [];

    const entry: LocalNotification = {
      id: data.id,
      title: data.title,
      body: data.body,
      triggeredAt: new Date().toISOString(),
    };

    existing.push(entry);

    const trimmed =
      existing.length > MAX_LOCAL_NOTIFICATIONS
        ? existing.slice(existing.length - MAX_LOCAL_NOTIFICATIONS)
        : existing;

    await AsyncStorage.setItem(
      SCHEDULED_LOCAL_NOTIFICATIONS_KEY,
      JSON.stringify(trimmed)
    );
  } catch (error) {
    console.error("Error persisting triggered notification:", error);
  }
};

export const getLocalNotifications = async (): Promise<
  LocalNotification[]
> => {
  try {
    const json = await AsyncStorage.getItem(SCHEDULED_LOCAL_NOTIFICATIONS_KEY);
    if (!json) return [];
    const notifications: LocalNotification[] = JSON.parse(json);
    return notifications.sort(
      (a, b) =>
        new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    );
  } catch (error) {
    console.error("Error getting local notifications:", error);
    return [];
  }
};

export const clearLocalNotifications = async () => {
  try {
    await AsyncStorage.removeItem(SCHEDULED_LOCAL_NOTIFICATIONS_KEY);
  } catch (error) {
    console.error("Error clearing local notifications:", error);
  }
};

export const reconcileTriggeredNotifications = async () => {
  try {
    const triggerNotifications = await notifee.getTriggerNotifications();
    const pendingIds = new Set(
      triggerNotifications.map((n) => n.notification.id)
    );

    const scheduledIdsJson = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
    const scheduledIds: string[] = scheduledIdsJson
      ? JSON.parse(scheduledIdsJson)
      : [];

    const cancelledIdsJson = await AsyncStorage.getItem(CANCELLED_IDS_KEY);
    const cancelledIds: Set<string> = cancelledIdsJson
      ? new Set(JSON.parse(cancelledIdsJson))
      : new Set();

    const stillPendingIds: string[] = [];

    for (const id of scheduledIds) {
      if (pendingIds.has(id)) {
        stillPendingIds.push(id);
        continue;
      }
      if (cancelledIds.has(id)) {
        await AsyncStorage.removeItem(SCHEDULED_DATA_PREFIX + id);
        continue;
      }

      const dataJson = await AsyncStorage.getItem(SCHEDULED_DATA_PREFIX + id);
      if (dataJson) {
        const data = JSON.parse(dataJson);
        await persistTriggeredNotification(data);
        await AsyncStorage.removeItem(SCHEDULED_DATA_PREFIX + id);
      }
    }

    await AsyncStorage.setItem(
      SCHEDULED_IDS_KEY,
      JSON.stringify(stillPendingIds)
    );
    await AsyncStorage.removeItem(CANCELLED_IDS_KEY);
  } catch (error) {
    console.error("Error reconciling triggered notifications:", error);
  }
};
