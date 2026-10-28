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

// The rule this suite pins down: ending a session locally never depends on the
// network. Everything on the device is cleared first, each step whatever
// happened to the one before, and only then is Asgardeo told, best effort.
import { ScreenPaths } from "@/constants/ScreenPaths";
import authReducer, { setAuth } from "@/context/slices/authSlice";
import { clearNotifications } from "@/services/scheduledNotifications";
import { forgetUnsavedTokens } from "@/services/tokenRefresh";
import {
  clearAuthDataFromSecureStore,
  loadAuthDataFromSecureStore,
} from "@/utils/authTokenStore";
import { endSession } from "@/utils/endSession";
import { clearAllExchangedTokens } from "@/utils/exchangedTokenStore";
import { clearInterruptedRefresh } from "@/utils/rotationGuard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { configureStore, UnknownAction } from "@reduxjs/toolkit";
import { deleteItemAsync } from "expo-secure-store";
import { Alert } from "react-native";
import { logout as appLogout } from "react-native-app-auth";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("@/constants/Constants", () => ({
  APPS: "apps",
  USER_INFO: "user-info",
  REDIRECT_URI: "https://auth.example.com/redirect",
}));
jest.mock("@/config/authConfig", () => ({
  AUTH_CONFIG: { issuer: "https://auth.example.com/oauth2/token" },
}));
jest.mock("@/utils/authTokenStore", () => ({
  loadAuthDataFromSecureStore: jest.fn(),
  clearAuthDataFromSecureStore: jest.fn(),
}));
jest.mock("@/utils/exchangedTokenStore", () => ({
  clearAllExchangedTokens: jest.fn(),
}));
jest.mock("@/utils/rotationGuard", () => ({
  clearInterruptedRefresh: jest.fn(),
}));
jest.mock("@/services/scheduledNotifications", () => ({
  clearNotifications: jest.fn(),
}));
jest.mock("react-native-app-auth", () => ({ logout: jest.fn() }));
jest.mock("expo-secure-store", () => ({ deleteItemAsync: jest.fn() }));
const mockNavigate = jest.fn();
jest.mock("expo-router", () => ({
  router: { navigate: (...args: unknown[]) => mockNavigate(...args) },
}));
const mockPurge = jest.fn();
jest.mock("@/context/store", () => ({
  persistor: { purge: (...args: unknown[]) => mockPurge(...args) },
}));
jest.mock("@/context/slices/appSlice", () => ({
  setApps: (payload: unknown) => ({ type: "apps/setApps", payload }),
}));
jest.mock("@/context/slices/deviceSlice", () => ({
  clearDeviceState: () => ({ type: "device/clearDeviceState" }),
  clearLastSentFcmToken: () => ({ type: "device/clearLastSentFcmToken" }),
}));
// authSlice's own thunks reach for these; endSession does not.
jest.mock("@/services/authService", () => ({ loadAuthData: jest.fn() }));
jest.mock("@/services/tokenRefresh", () => ({
  refreshAccessToken: jest.fn(),
  forgetUnsavedTokens: jest.fn(),
}));
jest.mock("@/context/slices/appConfigSlice", () => ({
  getAppConfigurations: jest.fn(),
}));
jest.mock("@/services/googleService", () => ({
  removeGoogleAuthState: jest.fn(),
}));
jest.mock("@/utils/microAppCacheStore", () => ({
  syncMicroAppCacheForUser: jest.fn(),
}));

const EXPIRED = { status: "expired", rotationLost: false } as const;

const STORED = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  idToken: "id-token",
  email: "user@example.com",
  userId: "user-1",
  expiresAt: 0,
};

const buildSignedInStore = () => {
  const actions: UnknownAction[] = [];
  const store = configureStore({
    reducer: { auth: authReducer },
    middleware: (getDefault) =>
      getDefault({ serializableCheck: false }).concat(
        () => (next: (action: unknown) => unknown) => (action: unknown) => {
          actions.push(action as UnknownAction);
          return next(action);
        }
      ),
  });
  store.dispatch(setAuth(STORED));
  return { store, actions };
};

const actionTypes = (actions: UnknownAction[]) => actions.map((a) => a.type);

const alertMock = () => Alert.alert as jest.Mock;

/** Every local step endSession is responsible for, as mocks that can be asserted. */
const localSteps = () => [
  clearAuthDataFromSecureStore as jest.Mock,
  // A set SecureStore refused lives only in tokenRefresh's memory.
  forgetUnsavedTokens as jest.Mock,
  clearAllExchangedTokens as jest.Mock,
  deleteItemAsync as jest.Mock,
  mockPurge,
  clearNotifications as jest.Mock,
  // A lost rotation explains the end of this session, not the next one's.
  clearInterruptedRefresh as jest.Mock,
];

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await AsyncStorage.setItem(
    "apps",
    JSON.stringify([{ appId: "app-a" }, { appId: "app-b" }])
  );
  (loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue(STORED);
  (appLogout as jest.Mock).mockResolvedValue(undefined);
  for (const step of localSteps()) step.mockResolvedValue(undefined);
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  mockNavigate.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("endSession('signedOut')", () => {
  it("clears everything on the device, then tells Asgardeo", async () => {
    const { store, actions } = buildSignedInStore();

    await store.dispatch(endSession({ status: "signedOut" }));

    expect(clearAuthDataFromSecureStore).toHaveBeenCalledTimes(1);
    expect(clearAllExchangedTokens).toHaveBeenCalledWith(["app-a", "app-b"]);
    expect(deleteItemAsync).toHaveBeenCalledWith("user-info");
    expect(mockPurge).toHaveBeenCalledTimes(1);
    expect(clearNotifications).toHaveBeenCalledTimes(1);
    expect(actionTypes(actions)).toEqual(
      expect.arrayContaining([
        "auth/resetAll",
        "apps/setApps",
        "device/clearDeviceState",
        "device/clearLastSentFcmToken",
      ])
    );
    expect(actions.find((a) => a.type === "apps/setApps")?.payload).toEqual([]);

    expect(appLogout).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ idToken: "id-token" })
    );
    const appLogoutOrder = (appLogout as jest.Mock).mock.invocationCallOrder[0];
    for (const step of localSteps()) {
      expect(step.mock.invocationCallOrder[0]).toBeLessThan(appLogoutOrder);
    }

    const { auth } = store.getState();
    expect(auth.sessionStatus).toBe("signedOut");
    expect(auth.accessToken).toBeNull();
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(ScreenPaths.FEED);
  });

  it("still signs out locally, without an error dialog, when Asgardeo cannot be reached", async () => {
    (appLogout as jest.Mock).mockRejectedValue(new Error("Network request failed"));
    const { store } = buildSignedInStore();

    await store.dispatch(endSession({ status: "signedOut" }));

    for (const step of localSteps()) {
      expect(step).toHaveBeenCalled();
    }
    expect(store.getState().auth.sessionStatus).toBe("signedOut");
    expect(store.getState().auth.accessToken).toBeNull();
    const titles = alertMock().mock.calls.map((call) => call[0]);
    expect(titles).not.toContain("Error Logging Out");
  });

  it("signs out locally when there is no id token to send", async () => {
    (loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({
      ...STORED,
      idToken: undefined,
    });
    const { store } = buildSignedInStore();

    await store.dispatch(endSession({ status: "signedOut" }));

    expect(appLogout).not.toHaveBeenCalled();
    expect(clearAuthDataFromSecureStore).toHaveBeenCalled();
    expect(store.getState().auth.sessionStatus).toBe("signedOut");
  });
});

describe("endSession('expired')", () => {
  it("clears local state without Asgardeo or a dialog: the user asked for nothing", async () => {
    const { store } = buildSignedInStore();

    await store.dispatch(endSession(EXPIRED));

    for (const step of localSteps()) {
      expect(step).toHaveBeenCalled();
    }
    expect(appLogout).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(store.getState().auth.sessionStatus).toBe("expired");
    expect(store.getState().auth.accessToken).toBeNull();
  });

  it("remembers that the sign-in was lost in a rotation, for the sign-in prompt", async () => {
    const { store } = buildSignedInStore();

    await store.dispatch(endSession({ status: "expired", rotationLost: true }));

    expect(store.getState().auth.sessionStatus).toBe("expired");
    expect(store.getState().auth.rotationLost).toBe(true);

    // The next session starts with a clean slate.
    store.dispatch(setAuth(STORED));
    expect(store.getState().auth.rotationLost).toBe(false);
  });

  it("does not report a lost rotation for an ordinary expiry", async () => {
    const { store } = buildSignedInStore();

    await store.dispatch(endSession(EXPIRED));

    expect(store.getState().auth.rotationLost).toBe(false);
  });

  it("runs once however many times the expiry is reported", async () => {
    const { store } = buildSignedInStore();

    await Promise.all([
      store.dispatch(endSession(EXPIRED)),
      store.dispatch(endSession(EXPIRED)),
      store.dispatch(endSession(EXPIRED)),
    ]);
    await store.dispatch(endSession(EXPIRED));

    expect(clearAuthDataFromSecureStore).toHaveBeenCalledTimes(1);
    expect(mockPurge).toHaveBeenCalledTimes(1);
  });
});

describe("a sign-in while the session is still being cleared", () => {
  it("holds the sign-in prompt back until the clearing is done", async () => {
    const { store } = buildSignedInStore();

    const ending = store.dispatch(endSession(EXPIRED));
    expect(store.getState().auth.sessionStatus).toBe("expired");
    expect(store.getState().auth.isEndingSession).toBe(true);

    await ending;
    expect(store.getState().auth.isEndingSession).toBe(false);
  });

  it("is left alone by the clearing still in progress", async () => {
    const { store, actions } = buildSignedInStore();
    let finishPurge!: () => void;
    mockPurge.mockReturnValue(
      new Promise<void>((resolve) => {
        finishPurge = resolve;
      })
    );

    const ending = store.dispatch(endSession(EXPIRED));
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockPurge).toHaveBeenCalled();

    const newSession = { ...STORED, accessToken: "new-access-token" };
    store.dispatch(setAuth(newSession));
    finishPurge();
    await ending;

    expect(clearNotifications).not.toHaveBeenCalled();
    expect(actionTypes(actions)).not.toContain("auth/resetAll");
    const { auth } = store.getState();
    expect(auth.sessionStatus).toBe("authenticated");
    expect(auth.accessToken).toBe("new-access-token");
    expect(auth.isEndingSession).toBe(false);
  });
});

describe("each local step is independent", () => {
  it.each([
    ["clearing the tokens", () => clearAuthDataFromSecureStore as jest.Mock],
    ["clearing exchanged tokens", () => clearAllExchangedTokens as jest.Mock],
    ["deleting user info", () => deleteItemAsync as jest.Mock],
    ["purging persisted state", () => mockPurge],
    ["clearing notifications", () => clearNotifications as jest.Mock],
  ])("runs every other step when %s fails", async (_, failing) => {
    failing().mockRejectedValue(new Error("boom"));
    const { store, actions } = buildSignedInStore();

    await store.dispatch(endSession({ status: "signedOut" }));

    for (const step of localSteps()) {
      expect(step).toHaveBeenCalled();
    }
    expect(actionTypes(actions)).toContain("auth/resetAll");
    expect(store.getState().auth.sessionStatus).toBe("signedOut");
    expect(appLogout).toHaveBeenCalled();
  });

  it("still clears when the stored session cannot be read", async () => {
    (loadAuthDataFromSecureStore as jest.Mock).mockRejectedValue(
      new Error("keychain unavailable")
    );
    const { store } = buildSignedInStore();

    await store.dispatch(endSession({ status: "signedOut" }));

    for (const step of localSteps()) {
      expect(step).toHaveBeenCalled();
    }
    expect(store.getState().auth.sessionStatus).toBe("signedOut");
  });
});
