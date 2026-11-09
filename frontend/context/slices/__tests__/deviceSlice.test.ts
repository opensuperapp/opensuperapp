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
import { pushFcmToken } from "@/context/slices/deviceSlice";
import type { PushToken } from "@/utils/push-notification";

// @reduxjs/toolkit pulls in immer as ESM, which this project's Jest transform does not
// handle (see microAppCacheStore.test.ts). This stand-in runs a thunk's payload creator
// directly, which is all these tests exercise.
jest.mock("@reduxjs/toolkit", () => ({
  createAsyncThunk:
    (
      _type: string,
      payloadCreator: (arg: unknown, api: unknown) => Promise<unknown>
    ) =>
    (arg: unknown) =>
    (dispatch: unknown) =>
      payloadCreator(arg, {
        dispatch,
        rejectWithValue: (value: unknown) => ({ rejected: value }),
      }),
  createSlice: () => ({ actions: {}, reducer: () => ({}) }),
}));

jest.mock("@/constants/Constants", () => ({
  BASE_URL: "https://api.example.com",
  LAST_SENT_FCM_TOKEN: "last-sent-fcm-token",
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockApiRequest = jest.fn();
jest.mock("@/utils/requestHandler", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

const mockEnqueueForReconnect = jest.fn();
jest.mock("@/utils/offlineQueue", () => ({
  enqueueForReconnect: (...args: unknown[]) => mockEnqueueForReconnect(...args),
}));

type Thunk = (dispatch: (action: unknown) => unknown) => Promise<unknown>;

const dispatch: jest.Mock = jest.fn((action: unknown): unknown =>
  typeof action === "function" ? (action as Thunk)(dispatch) : action
);
const push = (token: string, extra: Partial<PushToken> = {}) =>
  (
    pushFcmToken({ token, tokenType: "fcm", ...extra } as PushToken) as unknown as Thunk
  )(dispatch);

// What axios throws when the request never reached the server.
const networkError = () =>
  Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" });

beforeEach(() => {
  mockApiRequest.mockReset();
  mockEnqueueForReconnect.mockReset();
  dispatch.mockClear();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("pushFcmToken", () => {
  // The query parameter is what the current backend reads; the body is for the
  // one that can route APNs tokens. Sending both keeps either working.
  it("sends the token as the query parameter and the typed token as the body", async () => {
    mockApiRequest.mockResolvedValueOnce({ status: 200, data: {} });

    await push("apns-token-1", {
      tokenType: "apns",
      environment: "production",
    });

    expect(mockApiRequest).toHaveBeenCalledWith({
      url: "https://api.example.com/users/fcm-tokens?fcmToken=apns-token-1",
      method: "POST",
      data: {
        token: "apns-token-1",
        tokenType: "apns",
        environment: "production",
      },
    });
  });

  it("queues the same push for the next reconnect when it never reached the server", async () => {
    mockApiRequest.mockRejectedValueOnce(networkError());

    await push("fcm-token-1");

    expect(mockEnqueueForReconnect).toHaveBeenCalledTimes(1);
    const [, replay] = mockEnqueueForReconnect.mock.calls[0];

    mockApiRequest.mockResolvedValueOnce({ status: 200, data: {} });
    await replay();

    expect(mockApiRequest).toHaveBeenCalledTimes(2);
    expect(mockApiRequest.mock.calls[1][0]).toEqual(
      mockApiRequest.mock.calls[0][0]
    );
  });

  // Keyed by the push, not the token: an FCM token that rotates while offline replaces
  // the one waiting, rather than queueing both.
  it("queues every token under one key", async () => {
    mockApiRequest.mockRejectedValue(networkError());

    await push("fcm-token-1");
    await push("fcm-token-2");

    const keys = mockEnqueueForReconnect.mock.calls.map(([key]) => key);
    expect(new Set(keys).size).toBe(1);
  });

  it("does not queue a push the server answered and refused", async () => {
    mockApiRequest.mockRejectedValueOnce(
      Object.assign(new Error("Request failed with status code 500"), {
        response: { status: 500 },
      })
    );

    await push("fcm-token-1");

    expect(mockEnqueueForReconnect).not.toHaveBeenCalled();
  });

  it("does not queue a push that went through", async () => {
    mockApiRequest.mockResolvedValueOnce({ status: 200, data: {} });

    await push("fcm-token-1");

    expect(mockEnqueueForReconnect).not.toHaveBeenCalled();
  });
});
