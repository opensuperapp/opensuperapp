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
import { LAST_ACTIVE_PATH_KEY } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { useRestoreLastTab } from "@/hooks/useRestoreLastTab";
import { SessionStatus } from "@/types/auth.types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { Provider } from "react-redux";
import { createStore } from "redux";
import { act, create } from "react-test-renderer";

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
const mockRouter = { navigate: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));

type SetStatus = { type: "set"; sessionStatus: SessionStatus };

// Stands in for the tab bar's own rules: Chat is shown only to a signed-in user, and
// only if the visibility rules allow it.
type Rules = { loaded: boolean; chatHidden: boolean };
const LOADED_RULES: Rules = { loaded: true, chatHidden: false };

const visibleTabs = (signedIn: boolean, rules: Rules) => (tabName: string) =>
  tabName !== "chat" || (signedIn && !rules.chatHidden);

const Tabs = ({ signedIn, rules }: { signedIn: boolean; rules: Rules }) => {
  useRestoreLastTab(visibleTabs(signedIn, rules), rules.loaded);
  return null;
};

const mount = async (
  sessionStatus: SessionStatus,
  lastPath: ScreenPaths,
  initialRules: Rules = LOADED_RULES
) => {
  await AsyncStorage.setItem(LAST_ACTIVE_PATH_KEY, lastPath);
  const store = createStore(
    (
      state: { auth: { sessionStatus: SessionStatus } } = {
        auth: { sessionStatus },
      },
      action: SetStatus | { type: string }
    ) =>
      action.type === "set"
        ? { auth: { sessionStatus: (action as SetStatus).sessionStatus } }
        : state
  );
  const signedIn = (status: SessionStatus) =>
    ["authenticated", "refreshing", "degraded"].includes(status);
  let rules = initialRules;

  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <Provider store={store}>
        <Tabs signedIn={signedIn(sessionStatus)} rules={rules} />
      </Provider>
    );
  });
  await act(async () => {
    jest.runOnlyPendingTimers();
  });

  const setStatus = async (status: SessionStatus) => {
    await act(async () => {
      store.dispatch({ type: "set", sessionStatus: status });
      rerender();
    });
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
  };
  const setRules = async (next: Rules) => {
    rules = next;
    await act(async () => {
      rerender();
    });
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
  };
  const rerender = () =>
    tree.update(
      <Provider store={store}>
        <Tabs
          signedIn={signedIn(store.getState().auth.sessionStatus)}
          rules={rules}
        />
      </Provider>
    );
  return { setStatus, setRules };
};

beforeEach(async () => {
  jest.useFakeTimers();
  mockRouter.navigate.mockClear();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useRestoreLastTab", () => {
  it("puts a signed-in user back on the tab they left", async () => {
    await mount("authenticated", ScreenPaths.CHAT);

    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(ScreenPaths.CHAT);
  });

  it.each<SessionStatus>(["signedOut", "expired"])(
    "sends a %s user to the Feed rather than a tab they cannot see",
    async (status) => {
      await mount(status, ScreenPaths.CHAT);

      expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
      expect(mockRouter.navigate).toHaveBeenCalledWith(ScreenPaths.FEED);
    }
  );

  it("still restores a tab a signed-out user can see", async () => {
    await mount("signedOut", ScreenPaths.PROFILE);

    expect(mockRouter.navigate).toHaveBeenCalledWith(ScreenPaths.PROFILE);
  });

  it("decides nothing while the session is still being restored", async () => {
    await mount("restoring", ScreenPaths.CHAT);

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it("restores once the session is known, and only once", async () => {
    const { setStatus } = await mount("restoring", ScreenPaths.CHAT);

    await setStatus("authenticated");
    await setStatus("refreshing");
    await setStatus("authenticated");

    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(ScreenPaths.CHAT);
  });

  it("waits for the visibility rules before deciding", async () => {
    const { setRules } = await mount("authenticated", ScreenPaths.CHAT, {
      loaded: false,
      chatHidden: false,
    });
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    // The loaded rules hide Chat, which the defaults used while loading had shown.
    await setRules({ loaded: true, chatHidden: true });

    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(ScreenPaths.FEED);
  });

  it("goes to the Feed when a restore ends signed out", async () => {
    const { setStatus } = await mount("restoring", ScreenPaths.CHAT);

    await setStatus("signedOut");

    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(ScreenPaths.FEED);
  });
});
