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
import { SessionStatus } from "@/types/auth.types";
import React from "react";
import { Provider } from "react-redux";
import { createStore } from "redux";
import { Text } from "react-native";
import { WebView } from "react-native-webview";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import MicroApp from "../micro-app";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
// react-redux's package.json "react-native" export condition points at an
// ESM build this project's Jest transform can't parse; the "default"
// (alternate-renderers) condition resolves to the same API via CommonJS.
jest.mock("react-redux", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("react-redux/alternate-renderers")
);

const PARAMS = {
  webViewUri: "app-a/index.html",
  appName: "App A",
  clientId: "app-a-client",
  exchangedToken: "",
  exchangedIdToken: "",
  appId: "app-a",
};
let mockParams = PARAMS;
const MICRO_APP_URI = `file:///documents/${PARAMS.webViewUri}`;

const mockRouter = {
  back: jest.fn(),
  navigate: jest.fn(),
  push: jest.fn(),
  dismissAll: jest.fn(),
};
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
  Stack: { Screen: () => null },
}));

// Every factory forwards to its jest.fn() instead of returning it: the factories run
// while the screen is imported, before these consts are initialised.
const mockTokenExchange = jest.fn();
jest.mock("@/services/authService", () => ({
  tokenExchange: (...args: unknown[]) => mockTokenExchange(...args),
  isTokenExpired: () => false,
}));

const mockInjectJavaScript = jest.fn();
jest.mock("react-native-webview", () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual("react");
  return {
    WebView: forwardRef((_: unknown, ref: unknown) => {
      useImperativeHandle(ref, () => ({
        injectJavaScript: (script: string) => mockInjectJavaScript(script),
        reload: jest.fn(),
      }));
      return null;
    }),
  };
});

jest.mock("expo-file-system", () => ({
  Paths: { document: { uri: "file:///documents/" } },
  File: jest.fn(),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("expo-auth-session/providers/google", () => ({
  useAuthRequest: () => [null, null, jest.fn()],
}));
jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openBrowserAsync: jest.fn(),
}));
// Pulled in by the screen but never exercised here: stubbed so the import graph stays
// free of native modules.
jest.mock("@/services/googleService", () => ({
  __esModule: true,
  default: jest.fn(),
  getGoogleUserInfo: jest.fn(),
  isAuthenticatedWithGoogle: jest.fn(),
  restoreGoogleDriveBackup: jest.fn(),
  uploadToGoogleDrive: jest.fn(),
}));
jest.mock("@/services/scheduledNotifications", () => ({
  cancelLocalNotification: jest.fn(),
  clearNotifications: jest.fn(),
  scheduleSessionNotifications: jest.fn(),
}));
// The location flow's native edges. The orchestration under test lives in the screen.
const mockEnsureLocationPermissions = jest.fn();
const mockStartForegroundLocationStream = jest.fn();
const mockStopBackgroundLocationUpdates = jest.fn();
jest.mock("@/services/locationService", () => ({
  ...jest.requireActual("@/services/locationService"),
  ensureLocationPermissions: (...args: unknown[]) =>
    mockEnsureLocationPermissions(...args),
  startForegroundLocationStream: (...args: unknown[]) =>
    mockStartForegroundLocationStream(...args),
  stopBackgroundLocationUpdates: (...args: unknown[]) =>
    mockStopBackgroundLocationUpdates(...args),
}));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-mail-composer", () => ({ composeAsync: jest.fn() }));
jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("@/components/TextPromptDialog", () => () => null);
jest.mock("@/components/NotFound", () => () => null);
jest.mock("@/components/OfflineToast", () => ({
  __esModule: true,
  default: () => null,
  OFFLINE_TOAST_ANIMATION_MS: 200,
}));

type SetStatus = { type: "set"; sessionStatus: SessionStatus };
type StoredApp = { appId: string; requiredPermissions?: string[] };
type State = {
  apps: { apps: StoredApp[] };
  appConfig: { appScopes: never[] };
  auth: { sessionStatus: SessionStatus };
};

const buildStore = (sessionStatus: SessionStatus, apps: StoredApp[] = []) =>
  createStore(
    (
      state: State = {
        apps: { apps },
        appConfig: { appScopes: [] },
        auth: { sessionStatus },
      },
      action: SetStatus | { type: string }
    ): State =>
      action.type === "set"
        ? {
            ...state,
            auth: { sessionStatus: (action as SetStatus).sessionStatus },
          }
        : state
  );

const mount = async (
  sessionStatus: SessionStatus = "authenticated",
  apps: StoredApp[] = []
) => {
  const store = buildStore(sessionStatus, apps);
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <Provider store={store}>
        <MicroApp />
      </Provider>
    );
  });
  const setStatus = (status: SessionStatus) =>
    act(() => {
      store.dispatch({ type: "set", sessionStatus: status });
    });
  return { tree, setStatus };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = PARAMS;
  mockTokenExchange.mockResolvedValue({
    accessToken: "exchanged-access",
    idToken: "exchanged-id",
  });
  mockEnsureLocationPermissions.mockResolvedValue(null);
  mockStartForegroundLocationStream.mockResolvedValue({ remove: jest.fn() });
  mockStopBackgroundLocationUpdates.mockResolvedValue(undefined);
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("MicroApp when the session ends", () => {
  it.each<SessionStatus>(["expired", "signedOut"])(
    "closes once the session is %s",
    async (status) => {
      const { setStatus } = await mount();

      setStatus(status);

      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    }
  );

  it("stays open while the session is only degraded", async () => {
    const { setStatus } = await mount();

    setStatus("degraded");

    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});

/** A message from the micro app's own document, as the bridge script posts it. */
const postFromMicroApp = async (tree: ReactTestRenderer, topic: string) => {
  await act(async () => {
    await tree.root.findByType(WebView).props.onMessage({
      nativeEvent: { url: MICRO_APP_URI, data: JSON.stringify({ topic }) },
    });
  });
};

const injected = () =>
  mockInjectJavaScript.mock.calls.map(([script]) => script as string);

const texts = (tree: ReactTestRenderer) =>
  tree.root.findAllByType(Text).map((node) => String(node.props.children));

const press = async (tree: ReactTestRenderer, label: string) => {
  const [button] = tree.root.findAll(
    (node) =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === "function"
  );
  await act(async () => {
    await button.props.onPress();
  });
};

describe("MicroApp token requests", () => {
  it("hands over the token the micro app asks for", async () => {
    const { tree } = await mount();
    mockInjectJavaScript.mockClear();

    await postFromMicroApp(tree, "token");

    expect(injected()).toEqual([
      'window.nativebridge.resolveToken("exchanged-access");',
    ]);
  });

  it.each([
    ["token", "rejectToken"],
    ["id_token", "rejectIdToken"],
  ])(
    "answers a %s request it cannot fill with %s, instead of leaving it hanging",
    async (topic, rejection) => {
      mockTokenExchange.mockResolvedValue(null);
      const { tree } = await mount();
      mockInjectJavaScript.mockClear();

      await postFromMicroApp(tree, topic);

      expect(injected()).toHaveLength(1);
      expect(injected()[0]).toMatch(
        new RegExp(`^window\\.nativebridge\\.${rejection}\\(".+"\\);$`)
      );
    }
  );

  it("answers a token request made during startup from the same exchange", async () => {
    let finishStartup!: (result: unknown) => void;
    mockTokenExchange
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finishStartup = resolve;
        })
      )
      // A second exchange, had one been started, would have failed.
      .mockResolvedValue(null);
    const { tree } = await mount();

    await postFromMicroApp(tree, "token");
    await act(async () => {
      finishStartup({ accessToken: "exchanged-access", idToken: "exchanged-id" });
    });

    expect(mockTokenExchange).toHaveBeenCalledTimes(1);
    expect(injected()).toContain(
      'window.nativebridge.resolveToken("exchanged-access");'
    );
    expect(injected().some((s) => s.includes("rejectToken("))).toBe(false);
    expect(texts(tree).join(" ")).not.toMatch(/try again/i);
  });

  it("tells the micro app when the token it opened with could not be had", async () => {
    mockTokenExchange.mockResolvedValue(null);

    await mount();

    expect(
      injected().some((s) => s.includes("nativebridge.rejectToken("))
    ).toBe(true);
  });

  it("tells the user, and keeps the app open, when no token can be had", async () => {
    mockTokenExchange.mockResolvedValue(null);

    const { tree } = await mount("degraded");

    expect(texts(tree).join(" ")).toMatch(/try again/i);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("says nothing while the token comes through", async () => {
    const { tree } = await mount();

    expect(texts(tree).join(" ")).not.toMatch(/try again/i);
  });

  it("delivers the token and clears the message when Try again works", async () => {
    mockTokenExchange.mockResolvedValue(null);
    const { tree } = await mount("degraded");
    mockTokenExchange.mockResolvedValue({
      accessToken: "exchanged-access",
      idToken: "exchanged-id",
    });
    mockInjectJavaScript.mockClear();

    await press(tree, "Try again");

    expect(injected()).toContain(
      'window.nativebridge.resolveToken("exchanged-access");'
    );
    expect(texts(tree).join(" ")).not.toMatch(/try again/i);
  });

  it("keeps the message up when Try again fails too", async () => {
    mockTokenExchange.mockResolvedValue(null);
    const { tree } = await mount("degraded");

    await press(tree, "Try again");

    expect(mockTokenExchange).toHaveBeenCalledTimes(2);
    expect(texts(tree).join(" ")).toMatch(/try again/i);
  });

  it("does not complain about an app that has no client id to exchange for", async () => {
    // Such an app was never meant to get a token, so there is nothing to retry.
    mockParams = { ...PARAMS, clientId: "" };
    mockTokenExchange.mockResolvedValue(null);

    const { tree } = await mount();

    expect(texts(tree).join(" ")).not.toMatch(/try again/i);
  });
});

describe("MicroApp when a background location task will not stop", () => {
  const LOCATION_APP: StoredApp = {
    appId: "app-a",
    requiredPermissions: ["location"],
  };
  const UNAVAILABLE = 'window.nativebridge.rejectLocationUpdates("unavailable");';

  it("tells the micro app that asked to stop that tracking may still be running", async () => {
    mockStopBackgroundLocationUpdates.mockRejectedValue(new Error("stop failed"));
    const { tree } = await mount("authenticated", [LOCATION_APP]);
    mockInjectJavaScript.mockClear();

    await postFromMicroApp(tree, "location_stop");

    expect(injected()).toEqual([UNAVAILABLE]);
  });

  it("says nothing when the stop works", async () => {
    const { tree } = await mount("authenticated", [LOCATION_APP]);
    mockInjectJavaScript.mockClear();

    await postFromMicroApp(tree, "location_stop");

    expect(mockStopBackgroundLocationUpdates).toHaveBeenCalled();
    expect(injected()).toEqual([]);
  });

  it("does not open a new stream over a task that is still recording", async () => {
    mockStopBackgroundLocationUpdates.mockRejectedValue(new Error("stop failed"));
    const { tree } = await mount("authenticated", [LOCATION_APP]);
    mockInjectJavaScript.mockClear();

    await postFromMicroApp(tree, "location_start");

    expect(mockStartForegroundLocationStream).not.toHaveBeenCalled();
    expect(injected()).toEqual([UNAVAILABLE]);
  });
});
