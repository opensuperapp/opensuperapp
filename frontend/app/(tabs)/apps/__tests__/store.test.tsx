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
jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("@/services/appStoreService", () => ({
  loadMicroAppDetails: jest.fn(),
  downloadMicroApp: jest.fn(),
  removeMicroApp: jest.fn(),
}));
// Drives connectivity by hand: each useIsOnline subscriber registers here.
const mockConnectivityListeners = new Set<(online: boolean) => void>();
jest.mock("@/utils/connectivity", () => ({
  ...jest.requireActual("@/utils/connectivity"),
  subscribeToConnectivity: (listener: (online: boolean) => void) => {
    mockConnectivityListeners.add(listener);
    return () => mockConnectivityListeners.delete(listener);
  },
}));
const setOnline = async (online: boolean) => {
  jest.useFakeTimers();
  await act(async () => {
    mockConnectivityListeners.forEach((listener) => listener(online));
  });
  // A reload re-renders the list, which schedules another delayed cell update.
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
};
// Earlier tests leave their screens mounted; only this test's should hear a change.
beforeEach(() => mockConnectivityListeners.clear());
jest.mock("@/components/ListItem", () => () => null);
jest.mock("@/hooks/useSignInWithAsgardeo", () => ({
  useSignInWithAsgardeo: () => jest.fn(),
}));
jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));
// See index.test.tsx: the "react-native" export condition of react-redux is an
// ESM build this project's Jest transform can't parse.
jest.mock("react-redux", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("react-redux/alternate-renderers")
);

import WheelLoader from "@/components/brand/WheelLoader";
import { loadMicroAppDetails } from "@/services/appStoreService";
import { SessionStatus } from "@/types/auth.types";
import React from "react";
import { FlatList } from "react-native";
import { Provider } from "react-redux";
import { createStore } from "redux";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import Store from "../store";

const mockLoadMicroAppDetails = loadMicroAppDetails as jest.Mock;

const cachedApp = {
  appId: "cached-app",
  name: "Cached App",
  description: "Installed before the network went away",
  iconUrl: "https://cdn.example.com/icon.png",
  status: "downloaded",
  versions: [
    { version: "1.0.0", downloadUrl: "https://cdn.example.com/app.zip" },
  ],
};

const buildStore = (
  sessionStatus: SessionStatus,
  accessToken: string | null,
  apps: unknown[] = []
) =>
  createStore(() => ({
    apps: { apps, downloading: [], downloadProgress: {} },
    auth: {
      accessToken,
      refreshToken: null,
      idToken: null,
      email: null,
      userId: null,
      isLoading: false,
      sessionStatus,
    },
    appConfig: {
      configs: [],
      defaultMicroAppIds: [],
      appScopes: [],
      loading: false,
      error: null,
    },
  }));

const renderStore = async (store: ReturnType<typeof buildStore>) => {
  let renderer: ReactTestRenderer;

  jest.useFakeTimers();
  await act(async () => {
    renderer = create(
      <Provider store={store}>
        <Store />
      </Provider>
    );
  });
  // FlatList/VirtualizedList schedules a delayed cell-render update via
  // setTimeout on mount; flush it now so it doesn't fire after the test ends.
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();

  return renderer!;
};

const isSpinning = (renderer: ReactTestRenderer) =>
  renderer.root.findAllByType(WheelLoader).length > 0;

describe("Store loading", () => {
  beforeEach(() => {
    mockLoadMicroAppDetails.mockReset();
  });

  it("loads and stops spinning for a degraded session with no token in Redux", async () => {
    // A cold start without signal restores degraded with Redux auth cleared.
    // loadMicroAppDetails catches its own errors, so offline it still resolves.
    mockLoadMicroAppDetails.mockResolvedValue(undefined);

    const renderer = await renderStore(buildStore("degraded", null));

    expect(mockLoadMicroAppDetails).toHaveBeenCalledTimes(1);
    expect(isSpinning(renderer)).toBe(false);
    expect(renderer.root.findAllByType(FlatList).length).toBe(1);
  });

  it("keeps the cached apps on screen while the list is being refreshed", async () => {
    mockLoadMicroAppDetails.mockReturnValue(new Promise(() => {}));

    const renderer = await renderStore(
      buildStore("degraded", null, [cachedApp])
    );

    expect(isSpinning(renderer)).toBe(false);
    const list = renderer.root.findByType(FlatList);
    expect(list.props.data).toEqual([cachedApp]);
  });

  it("loads again when the connection comes back after an offline start", async () => {
    mockLoadMicroAppDetails.mockResolvedValue(undefined);

    await renderStore(buildStore("degraded", null));
    await setOnline(false);
    expect(mockLoadMicroAppDetails).toHaveBeenCalledTimes(1);

    await setOnline(true);
    expect(mockLoadMicroAppDetails).toHaveBeenCalledTimes(2);
  });

  it("does not load again while the connection holds", async () => {
    mockLoadMicroAppDetails.mockResolvedValue(undefined);

    await renderStore(buildStore("authenticated", "some-token"));
    await setOnline(true);

    expect(mockLoadMicroAppDetails).toHaveBeenCalledTimes(1);
  });

  it("does not load on reconnect once the session has ended", async () => {
    await renderStore(buildStore("expired", null));
    await setOnline(false);
    await setOnline(true);

    expect(mockLoadMicroAppDetails).not.toHaveBeenCalled();
  });

  it("loads when signed in", async () => {
    mockLoadMicroAppDetails.mockResolvedValue(undefined);

    await renderStore(buildStore("authenticated", "some-token"));

    expect(mockLoadMicroAppDetails).toHaveBeenCalledTimes(1);
  });

  it("does not load for an ended session, whatever token is left in Redux", async () => {
    await renderStore(buildStore("expired", "stale-token"));
    await renderStore(buildStore("signedOut", null));

    expect(mockLoadMicroAppDetails).not.toHaveBeenCalled();
  });
});
