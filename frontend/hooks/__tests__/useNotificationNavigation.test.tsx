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
import { PENDING_NOTIFICATION_NAVIGATION } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import {
  APPS_LIST_WAIT_MS,
  useNotificationNavigation,
} from "@/hooks/useNotificationNavigation";
import {
  markStartupRouteSettled,
  resetStartupRouteForTests,
} from "@/utils/startupRoute";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// The installed apps list as the store holds it; empty until restored at startup.
let mockApps: unknown[] = [];
const mockRerenders = new Set<() => void>();
jest.mock("react-redux", () => {
  const { useReducer, useEffect } = jest.requireActual("react");
  return {
    useSelector: (select: (state: unknown) => unknown) => {
      const [, rerender] = useReducer((n: number) => n + 1, 0);
      useEffect(() => {
        mockRerenders.add(rerender);
        return () => {
          mockRerenders.delete(rerender);
        };
      }, []);
      return select({ apps: { apps: mockApps } });
    },
  };
});
const setApps = async (apps: unknown[]) => {
  await act(async () => {
    mockApps = apps;
    mockRerenders.forEach((rerender) => rerender());
  });
};

const mockRouter = {
  push: jest.fn(),
  navigate: jest.fn(),
  canDismiss: jest.fn(() => false),
  dismissAll: jest.fn(),
};
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));

// The response that launched the app (cold start), and the listener that gets taps
// while the app runs (foreground or background).
let mockLaunchResponse: unknown = null;
let mockListener: ((response: unknown) => void) | undefined;
const mockRemove = jest.fn();
jest.mock("expo-notifications", () => ({
  DEFAULT_ACTION_IDENTIFIER: "expo.modules.notifications.actions.DEFAULT",
  addNotificationResponseReceivedListener: jest.fn((listener) => {
    mockListener = listener;
    return { remove: mockRemove };
  }),
  getLastNotificationResponseAsync: jest.fn(async () => mockLaunchResponse),
  clearLastNotificationResponseAsync: jest.fn(async () => {}),
}));

const DEFAULT = "expo.modules.notifications.actions.DEFAULT";
const tap = (id: string, actionIdentifier = DEFAULT, date = 1) => ({
  actionIdentifier,
  notification: {
    date,
    request: {
      identifier: id,
      content: { data: { screen: "/(tabs)/apps/notifications" } },
      trigger: null,
    },
  },
});
const APP_ID = "com.example.microapp.events";
// A raw FCM push as expo-notifications reports it on Android: data in content.data.
const androidMicroAppTap = (id: string, data: Record<string, string>) => ({
  actionIdentifier: DEFAULT,
  notification: {
    date: 1,
    request: {
      identifier: id,
      content: { title: "t", body: "b", data },
      trigger: { type: "push", remoteMessage: { data } },
    },
  },
});
// A raw APNs push on iOS: top-level keys only in trigger.payload, content.data null.
const iosMicroAppTap = (id: string, keys: Record<string, unknown>) => ({
  actionIdentifier: DEFAULT,
  notification: {
    date: 1,
    request: {
      identifier: id,
      content: { title: "t", body: "b", data: null },
      trigger: {
        type: "push",
        payload: { aps: { alert: { title: "t", body: "b" } }, ...keys },
      },
    },
  },
});
const installed = (status = "downloaded") => ({
  appId: APP_ID,
  name: "Events",
  status,
  webViewUri: "events/index.html",
  clientId: "events-client",
  exchangedToken: "test-exchanged-token",
  exchangedIdToken: "test-exchanged-id-token",
  displayMode: "default",
});
const OPEN_EVENTS = (launchData?: string) => [
  [
    {
      pathname: ScreenPaths.MICRO_APP,
      params: {
        webViewUri: "events/index.html",
        appName: "Events",
        clientId: "events-client",
        exchangedToken: "test-exchanged-token",
        exchangedIdToken: "test-exchanged-id-token",
        appId: APP_ID,
        displayMode: "default",
        launchData,
      },
    },
  ],
];
// Notifications opens as: close root screens if any, switch to My Apps, push Notifications.
const expectOpenedNotifications = () => {
  expect(mockRouter.navigate.mock.calls).toEqual([[ScreenPaths.MY_APPS]]);
  expect(mockRouter.push.mock.calls).toEqual([[ScreenPaths.NOTIFICATIONS]]);
};

const Probe = () => {
  useNotificationNavigation();
  return null;
};

const render = async () => {
  let root: ReactTestRenderer;
  await act(async () => {
    root = create(<Probe />);
  });
  return root!;
};

const deliver = async (response: unknown) => {
  await act(async () => {
    mockListener!(response);
  });
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockRouter.canDismiss.mockReturnValue(false);
  jest.useRealTimers();
  mockApps = [];
  jest.spyOn(console, "warn").mockImplementation(() => {});
  mockLaunchResponse = null;
  mockListener = undefined;
  await AsyncStorage.clear();
  resetStartupRouteForTests();
  // Most cases start after the tab bar has put the user on their first screen.
  markStartupRouteSettled();
});

describe("useNotificationNavigation", () => {
  describe("warm (app running, foreground or background)", () => {
    it("opens Notifications under My Apps when a notification is tapped", async () => {
      await render();
      await deliver(tap("n-1"));

      expectOpenedNotifications();
    });

    it("closes an open micro app before opening Notifications", async () => {
      mockRouter.canDismiss.mockReturnValueOnce(true);
      await render();
      await deliver(tap("n-1"));

      expect(mockRouter.dismissAll).toHaveBeenCalledTimes(1);
      expect(mockRouter.dismissAll.mock.invocationCallOrder[0]).toBeLessThan(
        mockRouter.navigate.mock.invocationCallOrder[0]
      );
      expectOpenedNotifications();
    });

    it("does not dismiss when nothing is above the tabs", async () => {
      await render();
      await deliver(tap("n-1"));

      expect(mockRouter.dismissAll).not.toHaveBeenCalled();
      expectOpenedNotifications();
    });

    it("ignores a dismissal or another action", async () => {
      await render();
      await deliver(tap("n-1", "expo.modules.notifications.actions.DISMISSED"));

      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it("navigates again for a later tap", async () => {
      await render();
      await deliver(tap("n-1"));
      await deliver(tap("n-2"));

      expect(mockRouter.navigate).toHaveBeenCalledTimes(2);
      expect(mockRouter.push).toHaveBeenCalledTimes(2);
    });

    it("stops listening on unmount", async () => {
      const root = await render();
      await act(async () => {
        root.unmount();
      });

      expect(mockRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe("cold (a tap launched the app)", () => {
    it("opens Notifications for the launching tap and clears it", async () => {
      mockLaunchResponse = tap("n-1");

      await render();

      expectOpenedNotifications();
      expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalledTimes(1);
    });

    it("stays put when nothing launched the app", async () => {
      await render();

      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    // The launching response can also reach the listener; it is one tap.
    it("navigates once when the listener repeats the launching tap", async () => {
      mockLaunchResponse = tap("n-1");

      await render();
      await deliver(tap("n-1", DEFAULT, 2));

      expectOpenedNotifications();
    });

    // A launching tap arrives before the session is restored and before the tab bar
    // restores the last tab. Navigating then would be undone by that restore.
    it("waits for the startup route to settle before navigating", async () => {
      resetStartupRouteForTests();
      mockLaunchResponse = tap("n-1");

      await render();
      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(Notifications.clearLastNotificationResponseAsync).not.toHaveBeenCalled();

      await act(async () => {
        markStartupRouteSettled();
      });

      expectOpenedNotifications();
    });

    // Left by a notifee build's background handler before the update.
    it("honours a pending navigation stored by the previous build, once", async () => {
      await AsyncStorage.setItem(
        PENDING_NOTIFICATION_NAVIGATION,
        JSON.stringify({ screen: "/(tabs)/apps/notifications" }),
      );

      await render();

      expectOpenedNotifications();
      await expect(AsyncStorage.getItem(PENDING_NOTIFICATION_NAVIGATION)).resolves.toBeNull();
    });
  });

  describe("micro-app deep link", () => {
    it("warm: opens the named micro app with its launch data (Android shape)", async () => {
      mockApps = [installed()];
      await render();

      await deliver(androidMicroAppTap("m-1", { microAppId: APP_ID, launchData: '{"eventId":"e1"}' }));

      expect(mockRouter.push.mock.calls).toEqual(OPEN_EVENTS('{"eventId":"e1"}'));
    });

    it("warm: reads top-level APNs keys from the trigger payload (iOS shape)", async () => {
      mockApps = [installed()];
      await render();

      await deliver(iosMicroAppTap("m-1", { microAppId: APP_ID, launchData: '{"eventId":"e1"}' }));

      expect(mockRouter.push.mock.calls).toEqual(OPEN_EVENTS('{"eventId":"e1"}'));
    });

    // Otherwise the open micro app stays mounted under the new one and both get
    // whatever the shared QR scanner emits.
    it("closes an open micro app before opening the named one", async () => {
      mockRouter.canDismiss.mockReturnValue(true);
      mockApps = [installed()];
      await render();

      await deliver(androidMicroAppTap("m-1", { microAppId: APP_ID }));

      expect(mockRouter.dismissAll).toHaveBeenCalledTimes(1);
      expect(mockRouter.dismissAll.mock.invocationCallOrder[0]).toBeLessThan(
        mockRouter.push.mock.invocationCallOrder[0]
      );
      expect(mockRouter.push.mock.calls).toEqual(OPEN_EVENTS(undefined));
    });

    it("does not dismiss from a tab root before opening the named one", async () => {
      mockApps = [installed()];
      await render();

      await deliver(androidMicroAppTap("m-1", { microAppId: APP_ID }));

      expect(mockRouter.dismissAll).not.toHaveBeenCalled();
      expect(mockRouter.push.mock.calls).toEqual(OPEN_EVENTS(undefined));
    });

    it("opens without launch data when the push has none", async () => {
      mockApps = [installed()];
      await render();

      await deliver(androidMicroAppTap("m-1", { microAppId: APP_ID }));

      expect(mockRouter.push.mock.calls).toEqual(OPEN_EVENTS(undefined));
    });

    it.each([
      ["not downloaded", [installed("not-downloaded")]],
      ["unknown", [{ ...installed(), appId: "com.example.other" }]],
    ])("falls back to Notifications, without asking, when the app is %s", async (_, apps) => {
      mockApps = apps;
      await render();

      await deliver(androidMicroAppTap("m-1", { microAppId: APP_ID }));

      expectOpenedNotifications();
    });

    it("cold: waits for the startup route, then opens the app", async () => {
      resetStartupRouteForTests();
      mockApps = [installed()];
      mockLaunchResponse = iosMicroAppTap("m-1", { microAppId: APP_ID });

      await render();
      expect(mockRouter.push).not.toHaveBeenCalled();

      await act(async () => {
        markStartupRouteSettled();
      });

      expect(mockRouter.push.mock.calls).toEqual(OPEN_EVENTS(undefined));
      expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalledTimes(1);
    });

    it("cold: waits for the apps list to be restored, then opens the app", async () => {
      mockLaunchResponse = androidMicroAppTap("m-1", { microAppId: APP_ID });

      await render();
      expect(mockRouter.push).not.toHaveBeenCalled();

      await setApps([installed()]);

      expect(mockRouter.push.mock.calls).toEqual(OPEN_EVENTS(undefined));
    });

    it("cold: falls back to Notifications, and logs, when the list never arrives", async () => {
      jest.useFakeTimers();
      mockLaunchResponse = androidMicroAppTap("m-1", { microAppId: APP_ID });

      await render();
      await act(async () => {
        jest.advanceTimersByTime(APPS_LIST_WAIT_MS - 1);
      });
      expect(mockRouter.push).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(1);
      });

      expectOpenedNotifications();
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(`${APPS_LIST_WAIT_MS} ms`));
    });

    it("cold: opens the app once when both sources deliver the launching tap", async () => {
      mockApps = [installed()];
      mockLaunchResponse = androidMicroAppTap("m-1", { microAppId: APP_ID });

      await render();
      await deliver(androidMicroAppTap("m-1", { microAppId: APP_ID }));

      expect(mockRouter.push.mock.calls).toEqual(OPEN_EVENTS(undefined));
    });

    it("does not wait for apps when the push names no micro app", async () => {
      await render();

      await deliver(androidMicroAppTap("m-1", { title: "news" }));

      expectOpenedNotifications();
    });
  });
});
