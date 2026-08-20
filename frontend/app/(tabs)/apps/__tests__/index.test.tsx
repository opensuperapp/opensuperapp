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
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("@/services/appStoreService", () => ({
  loadMicroAppDetails: jest.fn(),
  downloadMicroApp: jest.fn(),
  removeMicroApp: jest.fn(),
}));
jest.mock("@/services/authService", () => ({
  logout: jest.fn(),
}));
jest.mock("@/context/slices/userConfigSlice", () => ({
  getUserConfigurations: (onLogout: unknown) => ({
    type: "userConfig/mock",
    payload: onLogout,
  }),
}));
jest.mock("@react-navigation/bottom-tabs", () => ({
  ...jest.requireActual("@react-navigation/bottom-tabs"),
  useBottomTabBarHeight: () => 0,
}));
jest.mock("@/hooks/useTrackActiveScreen", () => ({
  useTrackActiveScreen: jest.fn(),
}));
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useFocusEffect: jest.fn(),
}));
jest.mock("@/hooks/useSignInWithAsgardeo", () => ({
  useSignInWithAsgardeo: () => jest.fn(),
}));
jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));
// react-redux's package.json "react-native" export condition points at an
// ESM build this project's Jest transform can't parse; the "default"
// (alternate-renderers) condition resolves to the same API via CommonJS.
jest.mock("react-redux", () => require("react-redux/alternate-renderers"));

import SignInMessage from "@/components/SignInMessage";
import React from "react";
import { FlatList } from "react-native";
import { Provider } from "react-redux";
import { createStore } from "redux";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import HomeScreen from "../index";

const baseState = {
  apps: { apps: [], downloading: [], downloadProgress: {} },
  auth: {
    accessToken: null as string | null,
    refreshToken: null,
    idToken: null,
    email: null,
    userId: null,
    isLoading: false,
  },
  appConfig: {
    configs: [],
    defaultMicroAppIds: [],
    appScopes: [],
    loading: false,
    error: null,
  },
  version: { versions: [], loading: false, error: null },
  userConfig: { configurations: [], loading: false },
};

const buildStore = (accessToken: string | null) =>
  createStore(() => ({
    ...baseState,
    auth: { ...baseState.auth, accessToken },
  }));

const renderHomeScreen = async (accessToken: string | null) => {
  const store = buildStore(accessToken);
  let renderer: ReactTestRenderer;

  jest.useFakeTimers();
  await act(async () => {
    renderer = create(
      <Provider store={store}>
        <HomeScreen />
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

// React.memo() without a custom comparator collapses to a SimpleMemoComponent
// fiber whose reported `type` is the inner render function, not the memo
// wrapper object, so findAllByType needs the unwrapped function to match.
const signInMessageType = (SignInMessage as unknown as { type: unknown }).type;

describe("HomeScreen auth gate", () => {
  it("shows SignInMessage and no app grid when signed out", async () => {
    const renderer = await renderHomeScreen(null);

    expect(renderer.root.findAllByType(signInMessageType as never).length).toBe(1);
    expect(renderer.root.findAllByType(FlatList).length).toBe(0);
  });

  it("shows the app grid and no SignInMessage when signed in", async () => {
    const renderer = await renderHomeScreen("some-token");

    expect(renderer.root.findAllByType(FlatList).length).toBe(1);
    expect(renderer.root.findAllByType(signInMessageType as never).length).toBe(0);
  });
});
