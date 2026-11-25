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
  cleanupLegacyFcmToken,
  clearLastSentPushToken,
  disablePushToken,
  registerPushToken,
  syncPushToken,
} from "@/context/slices/deviceSlice";

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
  LAST_SENT_PUSH_TOKEN: "last-sent-push-token",
  LAST_SENT_FCM_TOKEN: "last-sent-fcm-token",
}));

// A stand-in secure store: key -> value.
let mockStore: Record<string, string> = {};
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore[key] ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete mockStore[key];
  }),
}));

const mockApiRequest = jest.fn();
jest.mock("@/utils/requestHandler", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

const mockEnqueueForReconnect = jest.fn();
jest.mock("@/utils/offlineQueue", () => ({
  enqueueForReconnect: (...args: unknown[]) => mockEnqueueForReconnect(...args),
}));

const mockGetDevicePushToken = jest.fn();
const mockRequestPermission = jest.fn();
jest.mock("@/utils/push-notification", () => ({
  getDevicePushToken: () => mockGetDevicePushToken(),
  requestNotificationPermission: () => mockRequestPermission(),
}));

type Thunk = (dispatch: (action: unknown) => unknown) => Promise<unknown>;

const dispatch: jest.Mock = jest.fn((action: unknown): unknown =>
  typeof action === "function" ? (action as Thunk)(dispatch) : action
);
const run = (thunk: unknown) => (thunk as Thunk)(dispatch);

const FCM_1 = { token: "test-fcm-token:1", tokenType: "fcm" } as const;
const FCM_2 = { token: "test-fcm-token:2", tokenType: "fcm" } as const;
const APNS = {
  token: "0123456789abcdef",
  tokenType: "apns",
  environment: "production",
} as const;
const LEGACY_FCM = "test-fcm-token:legacy";
const TOKENS_URL = "https://api.example.com/users/fcm-tokens";
const deleteCall = (token: string) => ({
  url: `${TOKENS_URL}?fcmToken=${encodeURIComponent(token)}`,
  method: "DELETE",
});
const register = (pushToken: typeof FCM_1 | typeof FCM_2 | typeof APNS) =>
  run(registerPushToken(pushToken));

// What axios throws when the request never reached the server.
const networkError = () =>
  Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" });
const serverError = (status = 500) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status },
  });

beforeEach(() => {
  mockStore = {};
  mockApiRequest.mockReset();
  mockEnqueueForReconnect.mockReset();
  mockGetDevicePushToken.mockReset();
  mockRequestPermission.mockReset();
  dispatch.mockClear();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("registerPushToken", () => {
  it("POSTs an FCM token with its type and no environment, and remembers it", async () => {
    mockApiRequest.mockResolvedValueOnce({ status: 200, data: {} });

    await register(FCM_1);

    expect(mockApiRequest).toHaveBeenCalledWith({
      url: TOKENS_URL,
      method: "POST",
      data: { token: FCM_1.token, tokenType: "fcm" },
    });
    expect(mockStore["last-sent-push-token"]).toBe(FCM_1.token);
  });

  it("POSTs an APNs token with its type and environment", async () => {
    mockApiRequest.mockResolvedValueOnce({ status: 200, data: {} });

    await register(APNS);

    expect(mockApiRequest).toHaveBeenCalledWith({
      url: TOKENS_URL,
      method: "POST",
      data: { token: APNS.token, tokenType: "apns", environment: "production" },
    });
  });

  // Only old builds use the query parameter.
  it("never sends the fcmToken query parameter", async () => {
    mockApiRequest.mockResolvedValueOnce({ status: 200, data: {} });

    await register(FCM_1);

    expect(mockApiRequest.mock.calls[0][0].url).not.toContain("?");
  });

  it("does not remember a token the server refused", async () => {
    mockApiRequest.mockResolvedValueOnce({ status: 400, data: {} });

    await register(FCM_1);

    expect(mockStore["last-sent-push-token"]).toBeUndefined();
  });

  it("queues the same push for the next reconnect when it never reached the server", async () => {
    mockApiRequest.mockRejectedValueOnce(networkError());

    await register(APNS);

    expect(mockEnqueueForReconnect).toHaveBeenCalledTimes(1);
    const [, replay] = mockEnqueueForReconnect.mock.calls[0];

    mockApiRequest.mockResolvedValueOnce({ status: 200, data: {} });
    await replay();

    expect(mockApiRequest).toHaveBeenCalledTimes(2);
    expect(mockApiRequest.mock.calls[1][0]).toEqual(
      mockApiRequest.mock.calls[0][0]
    );
  });

  // Keyed by the push, not the token: a token that rotates while offline replaces
  // the one waiting, rather than queueing both.
  it("queues every token under one key", async () => {
    mockApiRequest.mockRejectedValue(networkError());

    await register(FCM_1);
    await register(FCM_2);

    const keys = mockEnqueueForReconnect.mock.calls.map(([key]) => key);
    expect(new Set(keys).size).toBe(1);
  });

  it("does not queue a push the server answered and refused", async () => {
    mockApiRequest.mockRejectedValueOnce(serverError());

    await register(FCM_1);

    expect(mockEnqueueForReconnect).not.toHaveBeenCalled();
  });
});

describe("syncPushToken", () => {
  const posts = () =>
    mockApiRequest.mock.calls.filter(([config]) => config.method === "POST");
  const deletes = () =>
    mockApiRequest.mock.calls.filter(([config]) => config.method === "DELETE");

  beforeEach(() => {
    mockApiRequest.mockResolvedValue({ status: 200, data: {} });
  });

  it("asks for permission and registers a new token on sign-in", async () => {
    mockGetDevicePushToken.mockResolvedValue(APNS);

    await run(syncPushToken({ prompt: true }));

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(posts()).toEqual([
      [{ url: TOKENS_URL, method: "POST", data: { token: APNS.token, tokenType: "apns", environment: "production" } }],
    ]);
  });

  it("does not register a token that is unchanged since the last registration", async () => {
    mockStore["last-sent-push-token"] = FCM_1.token;
    mockGetDevicePushToken.mockResolvedValue(FCM_1);

    await run(syncPushToken({ prompt: true }));

    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("registers a token that changed", async () => {
    mockStore["last-sent-push-token"] = FCM_1.token;
    mockGetDevicePushToken.mockResolvedValue(FCM_2);

    await run(syncPushToken({ prompt: true }));

    expect(posts()).toEqual([
      [{ url: TOKENS_URL, method: "POST", data: { token: FCM_2.token, tokenType: "fcm" } }],
    ]);
    expect(mockStore["last-sent-push-token"]).toBe(FCM_2.token);
  });

  // getDevicePushToken answers null when permission is denied, the token cannot be
  // fetched or an APNs environment is unknown (see push-notification.test.ts).
  it("registers nothing, and keeps a legacy token, when there is no token", async () => {
    mockStore["last-sent-fcm-token"] = LEGACY_FCM;
    mockGetDevicePushToken.mockResolvedValue(null);

    await run(syncPushToken({ prompt: true }));

    expect(mockApiRequest).not.toHaveBeenCalled();
    expect(mockStore["last-sent-fcm-token"]).toBe(LEGACY_FCM);
  });

  describe("token rotation (addPushTokenListener)", () => {
    it("registers the delivered token without fetching or prompting", async () => {
      mockStore["last-sent-push-token"] = FCM_1.token;

      await run(syncPushToken({ prompt: false, pushToken: FCM_2 }));

      expect(mockRequestPermission).not.toHaveBeenCalled();
      expect(mockGetDevicePushToken).not.toHaveBeenCalled();
      expect(posts()).toHaveLength(1);
      expect(posts()[0][0].data).toEqual({ token: FCM_2.token, tokenType: "fcm" });
    });

    it("ignores a delivered token that is already registered", async () => {
      mockStore["last-sent-push-token"] = FCM_1.token;

      await run(syncPushToken({ prompt: false, pushToken: FCM_1 }));

      expect(mockApiRequest).not.toHaveBeenCalled();
    });
  });

  describe("legacy FCM token (RNFirebase messaging builds)", () => {
    // RNFirebase registered an FCM token for iOS too; the APNs token replaces it, and
    // leaving it would get every push twice (once through FCM, once through APNs).
    it("iOS: deletes the legacy FCM token once, then registers the APNs token", async () => {
      mockStore["last-sent-fcm-token"] = LEGACY_FCM;
      mockGetDevicePushToken.mockResolvedValue(APNS);

      await run(syncPushToken({ prompt: true }));
      await run(syncPushToken({ prompt: true }));

      expect(mockApiRequest.mock.calls.map(([c]) => c.method)).toEqual(["DELETE", "POST"]);
      expect(deletes()[0][0]).toEqual(deleteCall(LEGACY_FCM));
      expect(mockStore["last-sent-fcm-token"]).toBeUndefined();
    });

    // On Android the device token is the FCM token RNFirebase registered: deleting it
    // would only drop a working registration. Re-registering adds its type.
    it("Android: keeps a legacy token equal to the device token and re-registers it with its type", async () => {
      mockStore["last-sent-fcm-token"] = FCM_1.token;
      mockGetDevicePushToken.mockResolvedValue(FCM_1);

      await run(syncPushToken({ prompt: true }));

      expect(deletes()).toEqual([]);
      expect(posts()).toEqual([
        [{ url: TOKENS_URL, method: "POST", data: { token: FCM_1.token, tokenType: "fcm" } }],
      ]);
      expect(mockStore["last-sent-fcm-token"]).toBeUndefined();
    });

    it("Android: deletes a legacy token that differs from the device token", async () => {
      mockStore["last-sent-fcm-token"] = LEGACY_FCM;
      mockGetDevicePushToken.mockResolvedValue(FCM_1);

      await run(syncPushToken({ prompt: true }));

      expect(deletes()).toEqual([[deleteCall(LEGACY_FCM)]]);
    });
  });
});

describe("cleanupLegacyFcmToken", () => {
  const cleanup = (currentToken = APNS.token) =>
    run(cleanupLegacyFcmToken({ currentToken }));

  it("does nothing on a device that never registered an FCM token", async () => {
    await cleanup();

    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("URL-encodes the legacy token", async () => {
    mockStore["last-sent-fcm-token"] = "test:token/with+chars";
    mockApiRequest.mockResolvedValue({ status: 200, data: {} });

    await cleanup();

    expect(mockApiRequest).toHaveBeenCalledWith({
      url: `${TOKENS_URL}?fcmToken=test%3Atoken%2Fwith%2Bchars`,
      method: "DELETE",
    });
  });

  it.each([
    ["rejects with a server error", () => mockApiRequest.mockRejectedValue(serverError())],
    ["answers with a failure status", () => mockApiRequest.mockResolvedValue({ status: 500 })],
  ])("tolerates a server that %s: logs, forgets the token, never retries", async (_, arrange) => {
    mockStore["last-sent-fcm-token"] = LEGACY_FCM;
    arrange();

    await expect(cleanup()).resolves.not.toThrow();
    await cleanup();

    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    expect(mockStore["last-sent-fcm-token"]).toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
  });

  // Nothing reached the backend (offline, or apiRequest had no session to send), so
  // the next launch tries again.
  it.each([
    ["the network is down", () => mockApiRequest.mockRejectedValue(networkError())],
    ["there is no session", () => mockApiRequest.mockResolvedValue(undefined)],
  ])("keeps the token for a later attempt when %s", async (_, arrange) => {
    mockStore["last-sent-fcm-token"] = LEGACY_FCM;
    arrange();

    await cleanup();

    expect(mockStore["last-sent-fcm-token"]).toBe(LEGACY_FCM);
  });
});

describe("disablePushToken (sign-out)", () => {
  it("deletes the registered raw token, URL-encoded", async () => {
    mockStore["last-sent-push-token"] = FCM_1.token;
    mockApiRequest.mockResolvedValue({ status: 200, data: {} });

    await run(disablePushToken());

    expect(mockApiRequest.mock.calls).toEqual([[deleteCall(FCM_1.token)]]);
    expect(deleteCall(FCM_1.token).url).toBe(`${TOKENS_URL}?fcmToken=test-fcm-token%3A1`);
  });

  it("also deletes a different legacy FCM token still on record", async () => {
    mockStore["last-sent-fcm-token"] = LEGACY_FCM;
    mockStore["last-sent-push-token"] = APNS.token;
    mockApiRequest.mockResolvedValue({ status: 200, data: {} });

    await run(disablePushToken());

    expect(mockApiRequest.mock.calls.map(([c]) => c.url)).toEqual([
      deleteCall(LEGACY_FCM).url,
      deleteCall(APNS.token).url,
    ]);
  });

  it("deletes a legacy token only once when it is the registered token", async () => {
    mockStore["last-sent-fcm-token"] = FCM_1.token;
    mockStore["last-sent-push-token"] = FCM_1.token;
    mockApiRequest.mockResolvedValue({ status: 200, data: {} });

    await run(disablePushToken());

    expect(mockApiRequest.mock.calls).toEqual([[deleteCall(FCM_1.token)]]);
  });

  // A build that signed in before this update and never registered a typed token.
  it("deletes a legacy token when no new token was registered", async () => {
    mockStore["last-sent-fcm-token"] = LEGACY_FCM;
    mockApiRequest.mockResolvedValue({ status: 200, data: {} });

    const result = await run(disablePushToken());

    expect(mockApiRequest.mock.calls).toEqual([[deleteCall(LEGACY_FCM)]]);
    expect(result).toEqual({ rejected: "No push token found" });
  });

  it("calls nothing when no token was registered", async () => {
    const result = await run(disablePushToken());

    expect(mockApiRequest).not.toHaveBeenCalled();
    expect(result).toEqual({ rejected: "No push token found" });
  });
});

describe("clearLastSentPushToken", () => {
  it("forgets both the current and the legacy FCM token", async () => {
    mockStore["last-sent-fcm-token"] = LEGACY_FCM;
    mockStore["last-sent-push-token"] = FCM_1.token;

    await run(clearLastSentPushToken());

    expect(mockStore).toEqual({});
  });
});
