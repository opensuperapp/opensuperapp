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
import { ScreenPaths } from "@/constants/ScreenPaths";
import { useNotificationNavigation } from "@/hooks/useNotificationNavigation";
import * as Notifications from "expo-notifications";
import React from "react";
import { act, create } from "react-test-renderer";

const mockRouter = { push: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
}));

// The last response is what the OS hands back for a tap, whether the app was
// open, in the background or launched by it, so one hook covers all three.
let mockLastResponse: unknown;
jest.mock("expo-notifications", () => ({
  DEFAULT_ACTION_IDENTIFIER: "expo.modules.notifications.actions.DEFAULT",
  useLastNotificationResponse: () => mockLastResponse,
  clearLastNotificationResponse: jest.fn(),
}));

const tap = (id: string, actionIdentifier = "expo.modules.notifications.actions.DEFAULT") => ({
  actionIdentifier,
  notification: { request: { identifier: id, content: { data: {} } } },
});

const Probe = () => {
  useNotificationNavigation();
  return null;
};

const render = async () => {
  let root: ReturnType<typeof create>;
  await act(async () => {
    root = create(<Probe />);
  });
  return root!;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockLastResponse = undefined;
});

describe("useNotificationNavigation", () => {
  it("opens Notifications under My Apps when a notification is tapped", async () => {
    mockLastResponse = tap("n-1");

    await render();

    expect(mockRouter.push.mock.calls).toEqual([
      [ScreenPaths.MY_APPS],
      [ScreenPaths.NOTIFICATIONS],
    ]);
  });

  // Otherwise every remount of the root layout would replay the last tap.
  it("clears the tap once it has navigated", async () => {
    mockLastResponse = tap("n-1");

    await render();

    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["no tap yet", undefined],
    ["no tap at all", null],
  ])("stays put with %s", async (_, response) => {
    mockLastResponse = response;

    await render();

    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("ignores a dismissed notification", async () => {
    mockLastResponse = tap("n-1", "expo.modules.notifications.actions.DISMISSED");

    await render();

    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("navigates again for a later tap", async () => {
    mockLastResponse = tap("n-1");
    const root = await render();

    mockLastResponse = tap("n-2");
    await act(async () => {
      root.update(<Probe />);
    });

    expect(mockRouter.push).toHaveBeenCalledTimes(4);
  });
});
