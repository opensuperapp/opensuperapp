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
  getApnsEnvironment,
  getDevicePushToken,
  initializeNotifications,
  requestNotificationPermission,
  setupTokenRefreshListener,
} from "@/utils/push-notification";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";

const mockConstants = { isAndroid: true };
jest.mock("@/constants/Constants", () => ({
  get isAndroid() {
    return mockConstants.isAndroid;
  },
  NOTIFICATION_CHANNEL_ID: "test_channel",
  NOTIFICATION_CHANNEL_NAME: "Test channel",
}));

let mockExpoConfig: { extra?: { apsEnvironment?: string } } | null;
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockExpoConfig;
    },
  },
}));

jest.mock("expo-application", () => ({
  ApplicationReleaseType: {
    UNKNOWN: 0,
    SIMULATOR: 1,
    ENTERPRISE: 2,
    DEVELOPMENT: 3,
    AD_HOC: 4,
    APP_STORE: 5,
  },
  getIosPushNotificationServiceEnvironmentAsync: jest.fn(),
  getIosApplicationReleaseTypeAsync: jest.fn(),
}));

const mockPromptForExactAlarmOnce = jest.fn(async () => {});
jest.mock("@/utils/exactAlarmPermission", () => ({
  promptForExactAlarmOnce: () => mockPromptForExactAlarmOnce(),
}));

const mockRemove = jest.fn();
jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getDevicePushTokenAsync: jest.fn(),
  addPushTokenListener: jest.fn(() => ({ remove: mockRemove })),
}));

const mocked = Notifications as jest.Mocked<typeof Notifications>;
const app = Application as jest.Mocked<typeof Application>;
const FCM_TOKEN = "test-fcm-token:abc";
const APNS_TOKEN = "0123456789abcdef";
const permissions = (granted: boolean, iosStatus?: number) =>
  ({ granted, ios: iosStatus === undefined ? undefined : { status: iosStatus } }) as never;
const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.clearAllMocks();
  mockConstants.isAndroid = true;
  mockExpoConfig = { extra: { apsEnvironment: "development" } };
  mocked.getPermissionsAsync.mockResolvedValue(permissions(true));
  mocked.getDevicePushTokenAsync.mockResolvedValue({ type: "android", data: FCM_TOKEN });
  app.getIosPushNotificationServiceEnvironmentAsync.mockResolvedValue("production");
  app.getIosApplicationReleaseTypeAsync.mockResolvedValue(
    Application.ApplicationReleaseType.AD_HOC,
  );
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("initializeNotifications", () => {
  it("shows foreground notifications as a banner, in the list, with sound", async () => {
    await initializeNotifications();

    const handler = mocked.setNotificationHandler.mock.calls[0][0]!;
    await expect(handler.handleNotification({} as never)).resolves.toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
  });

  it("creates the app's Android channel with high importance", async () => {
    await initializeNotifications();

    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith("test_channel", {
      name: "Test channel",
      importance: 4,
    });
  });

  it("creates no channel on iOS", async () => {
    mockConstants.isAndroid = false;

    await initializeNotifications();

    expect(mocked.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});

describe("getDevicePushToken", () => {
  it("returns an Android device token as an FCM token, without an environment", async () => {
    await expect(getDevicePushToken()).resolves.toEqual({
      token: FCM_TOKEN,
      tokenType: "fcm",
    });
    expect(app.getIosPushNotificationServiceEnvironmentAsync).not.toHaveBeenCalled();
  });

  it("returns an iOS device token as an APNs token with its environment", async () => {
    mocked.getDevicePushTokenAsync.mockResolvedValue({ type: "ios", data: APNS_TOKEN });

    await expect(getDevicePushToken()).resolves.toEqual({
      token: APNS_TOKEN,
      tokenType: "apns",
      environment: "production",
    });
  });

  it("does not return an APNs token whose environment is unknown", async () => {
    mocked.getDevicePushTokenAsync.mockResolvedValue({ type: "ios", data: APNS_TOKEN });
    app.getIosPushNotificationServiceEnvironmentAsync.mockResolvedValue(null);
    app.getIosApplicationReleaseTypeAsync.mockResolvedValue(
      Application.ApplicationReleaseType.UNKNOWN,
    );
    mockExpoConfig = { extra: {} };

    await expect(getDevicePushToken()).resolves.toBeNull();
  });

  it("accepts provisional authorization on iOS", async () => {
    mocked.getPermissionsAsync.mockResolvedValue(permissions(false, 3));

    await expect(getDevicePushToken()).resolves.toEqual({
      token: FCM_TOKEN,
      tokenType: "fcm",
    });
  });

  it("returns null without asking for a token when permission is denied", async () => {
    mocked.getPermissionsAsync.mockResolvedValue(permissions(false));

    await expect(getDevicePushToken()).resolves.toBeNull();
    expect(mocked.getDevicePushTokenAsync).not.toHaveBeenCalled();
  });

  it("returns null when the token cannot be fetched", async () => {
    mocked.getDevicePushTokenAsync.mockRejectedValue(new Error("no FCM credentials"));

    await expect(getDevicePushToken()).resolves.toBeNull();
  });

  it("returns null for a web token", async () => {
    mocked.getDevicePushTokenAsync.mockResolvedValue({ type: "web", data: {} } as never);

    await expect(getDevicePushToken()).resolves.toBeNull();
  });
});

describe("getApnsEnvironment", () => {
  it.each(["development", "production"] as const)(
    "reads %s from the provisioning profile",
    async (environment) => {
      app.getIosPushNotificationServiceEnvironmentAsync.mockResolvedValue(environment);

      await expect(getApnsEnvironment()).resolves.toBe(environment);
    },
  );

  // App Store and TestFlight builds have no embedded profile and use production APNs.
  it("answers production for an App Store or TestFlight build", async () => {
    app.getIosPushNotificationServiceEnvironmentAsync.mockResolvedValue(null);
    app.getIosApplicationReleaseTypeAsync.mockResolvedValue(
      Application.ApplicationReleaseType.APP_STORE,
    );
    mockExpoConfig = { extra: { apsEnvironment: "development" } };

    await expect(getApnsEnvironment()).resolves.toBe("production");
  });

  it("answers development on the simulator (sandbox tokens)", async () => {
    app.getIosPushNotificationServiceEnvironmentAsync.mockResolvedValue(null);
    app.getIosApplicationReleaseTypeAsync.mockResolvedValue(
      Application.ApplicationReleaseType.SIMULATOR,
    );
    mockExpoConfig = { extra: { apsEnvironment: "production" } };

    await expect(getApnsEnvironment()).resolves.toBe("development");
  });

  it.each([
    ["no profile and an unknown release type", async () => {
      app.getIosPushNotificationServiceEnvironmentAsync.mockResolvedValue(null);
      app.getIosApplicationReleaseTypeAsync.mockResolvedValue(
        Application.ApplicationReleaseType.UNKNOWN,
      );
    }],
    ["expo-application failing", async () => {
      app.getIosPushNotificationServiceEnvironmentAsync.mockRejectedValue(new Error("boom"));
    }],
  ])("falls back to the build profile's value with %s", async (_, arrange) => {
    await arrange();
    mockExpoConfig = { extra: { apsEnvironment: "production" } };

    await expect(getApnsEnvironment()).resolves.toBe("production");
  });
});

describe("requestNotificationPermission", () => {
  it("asks once for exact alarms on Android when notifications are allowed", async () => {
    mocked.requestPermissionsAsync.mockResolvedValue(permissions(true));

    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(mockPromptForExactAlarmOnce).toHaveBeenCalledTimes(1);
  });

  it("does not ask for exact alarms when notifications are denied", async () => {
    mocked.requestPermissionsAsync.mockResolvedValue(permissions(false));

    await expect(requestNotificationPermission()).resolves.toBe(false);
    expect(mockPromptForExactAlarmOnce).not.toHaveBeenCalled();
  });

  it("never asks for exact alarms on iOS", async () => {
    mockConstants.isAndroid = false;
    mocked.requestPermissionsAsync.mockResolvedValue(permissions(true));

    await requestNotificationPermission();

    expect(mockPromptForExactAlarmOnce).not.toHaveBeenCalled();
  });

  it("answers false when the request throws", async () => {
    mocked.requestPermissionsAsync.mockRejectedValue(new Error("boom"));

    await expect(requestNotificationPermission()).resolves.toBe(false);
  });
});

describe("setupTokenRefreshListener", () => {
  it("passes on the rotated device token, until unsubscribed", async () => {
    const onRefresh = jest.fn();

    const unsubscribe = setupTokenRefreshListener(onRefresh);
    const listener = mocked.addPushTokenListener.mock.calls[0][0];
    listener({ type: "android", data: "test-fcm-token:rotated" });
    await flush();

    expect(onRefresh).toHaveBeenCalledWith({
      token: "test-fcm-token:rotated",
      tokenType: "fcm",
    });

    unsubscribe();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  it("adds the APNs environment to a rotated iOS token", async () => {
    const onRefresh = jest.fn();

    setupTokenRefreshListener(onRefresh);
    mocked.addPushTokenListener.mock.calls[0][0]({ type: "ios", data: APNS_TOKEN });
    await flush();

    expect(onRefresh).toHaveBeenCalledWith({
      token: APNS_TOKEN,
      tokenType: "apns",
      environment: "production",
    });
  });
});
