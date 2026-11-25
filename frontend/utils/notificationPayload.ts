// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
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
import type * as Notifications from "expo-notifications";

/** A micro app a notification asks to open, with the launch data to hand it. */
export type MicroAppTarget = { microAppId: string; launchData?: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The custom keys of a notification, wherever expo-notifications put them
 * (expo-notifications 58.1.9):
 *
 * - `request.content.data`: local notifications; Android remote messages
 *   (FCM `data`, copied as-is unless `data.body` is a JSON string —
 *   android/.../notifications/NotificationSerializer.java:61-75 and, for a tap on a
 *   tray notification, :177-188); Expo-service pushes on iOS.
 * - iOS raw APNs push: `content.data` is `userInfo["body"]` only
 *   (ios/.../Notifications/NotificationRecords.swift:328-333), so top-level keys next
 *   to `aps` are not there; they are in `request.trigger.payload`, the whole userInfo
 *   (NotificationRecords.swift:256-258).
 * - Android fallback: `request.trigger.remoteMessage.data`
 *   (src/Notifications.types.ts PushNotificationTrigger).
 *
 * `content.data` wins over the trigger copies; `aps` is dropped.
 */
export const readNotificationData = (
  response: Notifications.NotificationResponse
): Record<string, unknown> => {
  const request = response.notification?.request;
  const trigger = request?.trigger as
    | {
        payload?: unknown;
        remoteMessage?: { data?: unknown };
      }
    | null
    | undefined;

  const sources = [
    trigger?.remoteMessage?.data,
    trigger?.payload,
    request?.content?.data,
  ];
  const merged: Record<string, unknown> = {};
  for (const source of sources) {
    if (isRecord(source)) Object.assign(merged, source);
  }
  delete merged.aps;
  return merged;
};

/**
 * The micro app a tapped notification should open: `microAppId` (non-empty string)
 * and, optionally, `launchData` (a JSON string, passed on untouched; an object, as an
 * APNs payload may carry it, is stringified).
 * @returns null when the notification names no micro app.
 */
export const getMicroAppTarget = (
  response: Notifications.NotificationResponse
): MicroAppTarget | null => {
  const data = readNotificationData(response);
  const { microAppId, launchData } = data;
  if (typeof microAppId !== "string" || !microAppId.trim()) return null;

  if (typeof launchData === "string") {
    return { microAppId, launchData };
  }
  if (launchData !== undefined && launchData !== null) {
    return { microAppId, launchData: JSON.stringify(launchData) };
  }
  return { microAppId };
};
