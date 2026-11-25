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
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  cancelLocalNotification,
  clearNotifications,
  getLocalNotifications,
  reconcileTriggeredNotifications,
  scheduleSessionNotifications,
} from "@/services/scheduledNotifications";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@/constants/Constants", () => ({
  NOTIFICATION_CHANNEL_ID: "test_channel",
}));

jest.mock("expo-notifications", () => ({
  SchedulableTriggerInputTypes: { DATE: "date" },
  scheduleNotificationAsync: jest.fn(async () => "id"),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  dismissAllNotificationsAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
}));

const mocked = Notifications as jest.Mocked<typeof Notifications>;

// Requests the OS still holds; anything not in here has fired or was cancelled.
const pendingInOs = (...ids: string[]) =>
  mocked.getAllScheduledNotificationsAsync.mockResolvedValue(
    ids.map((identifier) => ({ identifier }) as Notifications.NotificationRequest),
  );

const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000);
const session = (id: string, time = inAnHour()) => ({
  id,
  title: `Session ${id}`,
  body: "Starts soon",
  time,
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  pendingInOs();
});

describe("scheduleSessionNotifications", () => {
  it("schedules a future session at its start time, on the app's channel, under the micro-app's id", async () => {
    const time = inAnHour();
    await scheduleSessionNotifications(session("s1", time));

    expect(mocked.scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: "s1",
      content: {
        title: "Session s1",
        body: "Starts soon",
        data: { screen: "/(tabs)/apps/notifications" },
        sound: "default",
      },
      trigger: { type: "date", date: time.getTime(), channelId: "test_channel" },
    });
  });

  it("ignores a session whose time has passed", async () => {
    await scheduleSessionNotifications(session("past", new Date(Date.now() - 1000)));

    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("does not record a session the OS refused to schedule", async () => {
    mocked.scheduleNotificationAsync.mockRejectedValueOnce(new Error("denied"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    await scheduleSessionNotifications(session("s1"));
    await reconcileTriggeredNotifications();

    expect(await getLocalNotifications()).toEqual([]);
  });
});

describe("reconcileTriggeredNotifications", () => {
  it("moves sessions the OS no longer holds into the notifications list", async () => {
    await scheduleSessionNotifications(session("fired"));
    await scheduleSessionNotifications(session("waiting"));
    pendingInOs("waiting");

    await reconcileTriggeredNotifications();

    expect(await getLocalNotifications()).toEqual([
      expect.objectContaining({ id: "fired", title: "Session fired", body: "Starts soon" }),
    ]);
  });

  it("keeps a still-pending session for the next reconcile", async () => {
    await scheduleSessionNotifications(session("waiting"));
    pendingInOs("waiting");
    await reconcileTriggeredNotifications();

    pendingInOs();
    await reconcileTriggeredNotifications();

    expect((await getLocalNotifications()).map((n) => n.id)).toEqual(["waiting"]);
  });

  it("does not list a session the micro-app cancelled", async () => {
    await scheduleSessionNotifications(session("cancelled"));
    await cancelLocalNotification({ id: "cancelled" });

    await reconcileTriggeredNotifications();

    expect(mocked.cancelScheduledNotificationAsync).toHaveBeenCalledWith("cancelled");
    expect(await getLocalNotifications()).toEqual([]);
  });
});

describe("clearNotifications", () => {
  it("cancels pending sessions, removes delivered ones and forgets the list", async () => {
    await scheduleSessionNotifications(session("fired"));
    await reconcileTriggeredNotifications();
    await scheduleSessionNotifications(session("waiting"));

    await clearNotifications();
    await reconcileTriggeredNotifications();

    expect(mocked.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(mocked.dismissAllNotificationsAsync).toHaveBeenCalled();
    expect(await getLocalNotifications()).toEqual([]);
  });
});
