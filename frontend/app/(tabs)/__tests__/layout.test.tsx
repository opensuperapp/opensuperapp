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

// NativeTabs cannot display a focused tab that is hidden, so a tab that loses its rule
// while open has to stay shown until focus has moved off it. NativeTabs is stubbed to
// record each trigger's hidden prop; the tab navigator's focus comes from a mocked route.
import TabLayout from "@/app/(tabs)/_layout";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { SessionStatus } from "@/types/auth.types";
import { TabVisibilityConfig } from "@/types/remoteConfig.types";
import React from "react";
import { Provider } from "react-redux";
import { createStore } from "redux";
import { act, create } from "react-test-renderer";

jest.mock("react-redux", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("react-redux/alternate-renderers")
);
jest.mock("@/context/slices/authSlice", () => ({
  selectIsSignedIn: (state: { auth: { sessionStatus: string } }) =>
    state.auth.sessionStatus === "authenticated",
}));
jest.mock("@/hooks/useRestoreLastTab", () => ({
  useRestoreLastTab: () => {},
}));

const RULES: TabVisibilityConfig = {
  version: 1,
  tabs: {
    index: { mode: "public" },
    library: { mode: "public" },
    apps: { mode: "public" },
    chat: { mode: "domain_specific", domains: ["example.com"] },
    profile: { mode: "public" },
  },
};
jest.mock("@/hooks/useRemoteConfig", () => ({
  useTabVisibilityRules: () => ({ loading: false, rules: RULES, error: null }),
}));

const mockRouter = { navigate: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));

// The (tabs) route as the root stack hands it to the layout, with the tab navigator's
// state nested in it.
const TAB_ROUTES = ["(feed)", "library", "apps", "chat", "profile"];
let mockFocusedTab = "chat";
let mockTabsFocused = true;
jest.mock("expo-router/react-navigation", () => ({
  ...jest.requireActual("expo-router/react-navigation"),
  useRoute: () => ({
    key: "tabs",
    name: "(tabs)",
    state: {
      type: "tab",
      index: TAB_ROUTES.indexOf(mockFocusedTab),
      routes: TAB_ROUTES.map((name) => ({ key: name, name })),
    },
  }),
  useIsFocused: () => mockTabsFocused,
}));

const mockHidden: Record<string, boolean | undefined> = {};
jest.mock("expo-router/native-tabs", () => {
  const Trigger = ({ name, hidden }: { name: string; hidden?: boolean }) => {
    mockHidden[name] = hidden;
    return null;
  };
  const NativeTabs = ({ children }: { children: React.ReactNode }) => children;
  Trigger.Icon = () => null;
  Trigger.Label = () => null;
  NativeTabs.Trigger = Trigger;
  return { NativeTabs };
});

type AuthState = {
  auth: { sessionStatus: SessionStatus; email: string };
  userInfo: { userInfo: null };
};

const mount = () => {
  const store = createStore(
    (
      state: AuthState = {
        auth: { sessionStatus: "authenticated", email: "user@example.com" },
        userInfo: { userInfo: null },
      },
      action: { type: string; sessionStatus?: SessionStatus }
    ) =>
      action.type === "set" && action.sessionStatus
        ? { ...state, auth: { ...state.auth, sessionStatus: action.sessionStatus } }
        : state
  );
  const element = () => (
    <Provider store={store}>
      <TabLayout />
    </Provider>
  );
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(element());
  });
  return {
    endSession: () =>
      act(() => {
        store.dispatch({ type: "set", sessionStatus: "expired" });
      }),
    // A navigation the layout did not cause re-renders it with the new route.
    rerender: () =>
      act(() => {
        tree.update(element());
      }),
  };
};

beforeEach(() => {
  mockFocusedTab = "chat";
  mockTabsFocused = true;
  mockRouter.navigate.mockClear();
});

describe("TabLayout", () => {
  it("shows Chat to a signed-in user of an allowed domain", () => {
    mount();
    expect(mockHidden.chat).toBe(false);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it("keeps Chat shown when the session ends on it, moves to the feed, then hides it", () => {
    const { endSession, rerender } = mount();

    endSession();
    expect(mockHidden.chat).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(ScreenPaths.FEED);

    mockFocusedTab = "(feed)";
    rerender();
    expect(mockHidden.chat).toBe(true);
  });

  it("hides Chat straight away when the session ends on another tab", () => {
    mockFocusedTab = "apps";
    const { endSession } = mount();

    endSession();
    expect(mockHidden.chat).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it("waits for a screen above the tabs to close before moving off Chat", () => {
    mockTabsFocused = false;
    const { endSession, rerender } = mount();

    endSession();
    expect(mockHidden.chat).toBe(false);
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    mockTabsFocused = true;
    rerender();
    expect(mockRouter.navigate).toHaveBeenCalledWith(ScreenPaths.FEED);
  });
});
