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
import { usePushNotificationHandler } from "@/hooks/usePushNotificationHandler";
import React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";

let mockAccessToken: string | null = null;
const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (select: (state: unknown) => unknown) =>
    select({ auth: { accessToken: mockAccessToken } }),
}));

jest.mock("@/context/slices/deviceSlice", () => ({
  syncPushToken: (arg: unknown) => ({ type: "device/syncPushToken", arg }),
}));

let mockOnRefresh: ((token: unknown) => void) | undefined;
const mockUnsubscribe = jest.fn();
jest.mock("@/utils/push-notification", () => ({
  setupTokenRefreshListener: (onRefresh: (token: unknown) => void) => {
    mockOnRefresh = onRefresh;
    return mockUnsubscribe;
  },
}));

const Probe = () => {
  usePushNotificationHandler();
  return null;
};

const render = async () => {
  let root: ReactTestRenderer;
  await act(async () => {
    root = create(<Probe />);
  });
  return root!;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAccessToken = null;
  mockOnRefresh = undefined;
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("usePushNotificationHandler", () => {
  it("does nothing while signed out", async () => {
    await render();

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockOnRefresh).toBeUndefined();
  });

  it("syncs the push token, prompting for permission, once signed in", async () => {
    mockAccessToken = "test-access-token";

    await render();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "device/syncPushToken",
      arg: { prompt: true },
    });
  });

  it("registers the rotated device token without prompting", async () => {
    mockAccessToken = "test-access-token";
    await render();
    mockDispatch.mockClear();
    const rotated = { token: "test-fcm-token:rotated", tokenType: "fcm" };

    mockOnRefresh!(rotated);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "device/syncPushToken",
      arg: { prompt: false, pushToken: rotated },
    });
  });

  it("stops listening for rotations on unmount", async () => {
    mockAccessToken = "test-access-token";
    const root = await render();

    await act(async () => {
      root.unmount();
    });

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
