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
import * as Notifications from "expo-notifications";
import {
  getPushToken,
  initializeNotifications,
  setupTokenRefreshListener,
} from "@/utils/push-notification";

const mockPlatform = { isAndroid: true, isIos: false };
jest.mock("@/constants/Constants", () => ({
  NOTIFICATION_CHANNEL_ID: "test-channel",
  NOTIFICATION_CHANNEL_NAME: "Test Channel",
  get isAndroid() {
    return mockPlatform.isAndroid;
  },
  get isIos() {
    return mockPlatform.isIos;
  },
}));

const mockExtra: { apsEnvironment?: string } = {};
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: mockExtra };
    },
  },
}));

jest.mock("@/utils/exactAlarmPermission", () => ({
  promptForExactAlarmOnce: jest.fn(),
}));

jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  setNotificationChannelAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getDevicePushTokenAsync: jest.fn(),
  addPushTokenListener: jest.fn(),
}));

const N = Notifications as jest.Mocked<typeof Notifications>;

const granted = { granted: true, status: "granted" } as never;
const denied = { granted: false, status: "denied", ios: { status: 1 } } as never;

beforeEach(() => {
  jest.clearAllMocks();
  mockPlatform.isAndroid = true;
  mockPlatform.isIos = false;
  delete mockExtra.apsEnvironment;
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("initializeNotifications", () => {
  it("creates the app's high-importance Android channel", async () => {
    await initializeNotifications();

    expect(N.setNotificationChannelAsync).toHaveBeenCalledWith(
      "test-channel",
      expect.objectContaining({ name: "Test Channel", importance: 4 })
    );
  });

  it("creates no channel on iOS", async () => {
    mockPlatform.isAndroid = false;
    mockPlatform.isIos = true;

    await initializeNotifications();

    expect(N.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  // notifee drew foreground pushes itself; expo-notifications shows them only
  // when the handler says so.
  it("shows notifications that arrive while the app is open", async () => {
    await initializeNotifications();

    const { handleNotification } = N.setNotificationHandler.mock.calls[0][0]!;
    await expect(handleNotification({} as never)).resolves.toEqual(
      expect.objectContaining({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
      })
    );
  });
});

describe("getPushToken", () => {
  it("returns the FCM token on Android", async () => {
    N.getPermissionsAsync.mockResolvedValue(granted);
    N.getDevicePushTokenAsync.mockResolvedValue({
      type: "android",
      data: "fcm-token-1",
    });

    await expect(getPushToken()).resolves.toEqual({
      token: "fcm-token-1",
      tokenType: "fcm",
    });
  });

  it("returns the APNs token and its environment on iOS", async () => {
    mockPlatform.isAndroid = false;
    mockPlatform.isIos = true;
    mockExtra.apsEnvironment = "production";
    N.getPermissionsAsync.mockResolvedValue(granted);
    N.getDevicePushTokenAsync.mockResolvedValue({
      type: "ios",
      data: "apns-token-1",
    });

    await expect(getPushToken()).resolves.toEqual({
      token: "apns-token-1",
      tokenType: "apns",
      environment: "production",
    });
  });

  it("accepts provisional authorization on iOS", async () => {
    mockPlatform.isAndroid = false;
    mockPlatform.isIos = true;
    N.getPermissionsAsync.mockResolvedValue({
      granted: false,
      status: "undetermined",
      ios: { status: 3 },
    } as never);
    N.getDevicePushTokenAsync.mockResolvedValue({
      type: "ios",
      data: "apns-token-1",
    });

    await expect(getPushToken()).resolves.toMatchObject({
      token: "apns-token-1",
    });
  });

  it("returns null without permission and never asks for a token", async () => {
    N.getPermissionsAsync.mockResolvedValue(denied);

    await expect(getPushToken()).resolves.toBeNull();
    expect(N.getDevicePushTokenAsync).not.toHaveBeenCalled();
  });

  it("returns null when the token request fails", async () => {
    N.getPermissionsAsync.mockResolvedValue(granted);
    N.getDevicePushTokenAsync.mockRejectedValue(new Error("no play services"));

    await expect(getPushToken()).resolves.toBeNull();
  });
});

describe("setupTokenRefreshListener", () => {
  it("hands each rotated token over in the same shape and unsubscribes", () => {
    const remove = jest.fn();
    N.addPushTokenListener.mockReturnValue({ remove });
    const onRefresh = jest.fn();

    const unsubscribe = setupTokenRefreshListener(onRefresh);
    const listener = N.addPushTokenListener.mock.calls[0][0];
    listener({ type: "android", data: "fcm-token-2" });

    expect(onRefresh).toHaveBeenCalledWith({
      token: "fcm-token-2",
      tokenType: "fcm",
    });

    unsubscribe();
    expect(remove).toHaveBeenCalled();
  });
});
