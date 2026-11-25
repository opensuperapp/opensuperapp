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
import {
  getMicroAppTarget,
  readNotificationData,
} from "@/utils/notificationPayload";
import type * as Notifications from "expo-notifications";

const response = (content: unknown, trigger: unknown) =>
  ({
    actionIdentifier: "expo.modules.notifications.actions.DEFAULT",
    notification: { date: 1, request: { identifier: "n-1", content, trigger } },
  }) as unknown as Notifications.NotificationResponse;

const APP_ID = "com.example.microapp.events";

// Shapes as expo-notifications 58.1.9 serializes them (see notificationPayload.ts).
describe("readNotificationData", () => {
  it("iOS raw APNs: takes top-level keys from trigger.payload, without aps", () => {
    const r = response(
      { title: "t", body: "b", data: null },
      {
        type: "push",
        payload: { aps: { alert: "hi" }, microAppId: APP_ID, launchData: '{"a":1}' },
      },
    );

    expect(readNotificationData(r)).toEqual({ microAppId: APP_ID, launchData: '{"a":1}' });
  });

  it("Android raw FCM: takes the data map from content.data", () => {
    const data = { microAppId: APP_ID, launchData: '{"a":1}' };
    const r = response({ data }, { type: "push", remoteMessage: { data } });

    expect(readNotificationData(r)).toEqual(data);
  });

  it("Android: falls back to trigger.remoteMessage.data when content.data is missing", () => {
    const r = response({ data: null }, { type: "push", remoteMessage: { data: { microAppId: APP_ID } } });

    expect(readNotificationData(r)).toEqual({ microAppId: APP_ID });
  });

  it("local notification: content.data, no trigger payload", () => {
    const r = response({ data: { screen: "/(tabs)/apps/notifications" } }, { type: "date", value: 1 });

    expect(readNotificationData(r)).toEqual({ screen: "/(tabs)/apps/notifications" });
  });

  it("prefers content.data over the trigger copies", () => {
    const r = response(
      { data: { microAppId: "from-content" } },
      { type: "push", payload: { microAppId: "from-payload" } },
    );

    expect(readNotificationData(r).microAppId).toBe("from-content");
  });

  it("copes with no trigger and no data", () => {
    expect(readNotificationData(response({}, null))).toEqual({});
  });
});

describe("getMicroAppTarget", () => {
  const ios = (keys: Record<string, unknown>) =>
    response({ data: null }, { type: "push", payload: { aps: {}, ...keys } });

  it("returns the micro app id and the launch data string as sent", () => {
    expect(getMicroAppTarget(ios({ microAppId: APP_ID, launchData: '{"a":1}' }))).toEqual({
      microAppId: APP_ID,
      launchData: '{"a":1}',
    });
  });

  it("stringifies launch data an APNs payload carries as an object", () => {
    expect(getMicroAppTarget(ios({ microAppId: APP_ID, launchData: { a: 1 } }))).toEqual({
      microAppId: APP_ID,
      launchData: '{"a":1}',
    });
  });

  it("omits launch data when there is none", () => {
    expect(getMicroAppTarget(ios({ microAppId: APP_ID }))).toEqual({ microAppId: APP_ID });
  });

  it.each([
    ["no microAppId", {}],
    ["an empty microAppId", { microAppId: "  " }],
    ["a non-string microAppId", { microAppId: 42 }],
  ])("returns null with %s", (_, keys) => {
    expect(getMicroAppTarget(ios(keys))).toBeNull();
  });
});
