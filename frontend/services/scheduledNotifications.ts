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
    }
  } catch (error) {
    console.error("Error scheduling notifications:", error);
  }
};

// Clear notifications and local storage on logout
export const clearNotifications = async () => {
  try {
    await notifee.cancelAllNotifications();
  } catch (error) {
    console.error("Error clearing notifications:", error);
  }
};

export const cancelLocalNotification = async (
  data: ScheduledNotificationIdentifiable
) => {
  try {
    await notifee.cancelTriggerNotification(data.id);
  } catch (error) {
    console.error("Error cancelling notification:", error);
  }
};
