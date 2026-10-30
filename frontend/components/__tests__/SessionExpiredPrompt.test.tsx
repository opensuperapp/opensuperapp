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
import SessionExpiredPrompt from "@/components/SessionExpiredPrompt";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { SessionStatus } from "@/types/auth.types";
import { router } from "expo-router";
import React from "react";
import { Provider } from "react-redux";
import { createStore } from "redux";
import { act, create, ReactTestRenderer } from "react-test-renderer";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
// The root navigator's key, or undefined before the root stack has mounted.
let mockNavigationKey: string | undefined;
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useRootNavigationState: () =>
    mockNavigationKey === undefined ? undefined : { key: mockNavigationKey },
}));
// react-redux's package.json "react-native" export condition points at an
// ESM build this project's Jest transform can't parse; the "default"
// (alternate-renderers) condition resolves to the same API via CommonJS.
jest.mock("react-redux", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("react-redux/alternate-renderers")
);

type AuthSnapshot = {
  sessionStatus: SessionStatus;
  rotationLost: boolean;
  isEndingSession: boolean;
};
type SetAuth = { type: "set"; auth: Partial<AuthSnapshot> };

const buildStore = (auth: AuthSnapshot) =>
  createStore(
    (
      state: { auth: AuthSnapshot } = { auth },
      action: SetAuth | { type: string }
    ) =>
      action.type === "set"
        ? { auth: { ...state.auth, ...(action as SetAuth).auth } }
        : state
  );

const mount = (
  sessionStatus: SessionStatus,
  { isEndingSession = false, rotationLost = false } = {}
) => {
  const store = buildStore({ sessionStatus, rotationLost, isEndingSession });
  const render = () => (
    <Provider store={store}>
      <SessionExpiredPrompt />
    </Provider>
  );
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(render());
  });
  const setAuth = (auth: Partial<AuthSnapshot>) =>
    act(() => {
      store.dispatch({ type: "set", auth });
    });
  const setStatus = (status: SessionStatus) =>
    setAuth({ sessionStatus: status });
  // useRootNavigationState re-renders its caller when the root stack mounts; the mock
  // can't, so the test re-renders by hand.
  const rerender = () =>
    act(() => {
      tree.update(render());
    });
  const navigationBecomesReady = () => {
    mockNavigationKey = "root-stack";
    rerender();
  };
  return { tree, setAuth, setStatus, rerender, navigationBecomesReady };
};

const push = router.push as jest.Mock;
const expiredSheet = {
  pathname: ScreenPaths.SIGN_IN,
  params: { reason: "expired" },
};

beforeEach(() => {
  push.mockReset();
  mockNavigationKey = "root-stack";
});

describe("SessionExpiredPrompt", () => {
  it("opens the session-expired sheet when the session expires", () => {
    const { setStatus } = mount("authenticated");
    expect(push).not.toHaveBeenCalled();

    setStatus("expired");

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(expiredSheet);
  });

  it("opens the sheet when the app starts with an expired session", () => {
    mount("expired");

    expect(push).toHaveBeenCalledWith(expiredSheet);
  });

  it("renders nothing itself", () => {
    expect(mount("expired").tree.toJSON()).toBeNull();
  });

  it.each<SessionStatus>([
    "signedOut",
    "degraded",
    "restoring",
    "authenticated",
    "refreshing",
  ])("stays out of the way when the session is %s", (status) => {
    // A sign-out was the user's own doing, and a degraded session is still theirs.
    mount(status);

    expect(push).not.toHaveBeenCalled();
  });

  it("waits for the expired session to be cleared before opening", () => {
    const { setAuth } = mount("expired", { isEndingSession: true });
    expect(push).not.toHaveBeenCalled();

    setAuth({ isEndingSession: false });

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(expiredSheet);
  });

  it("waits for the root stack on a cold start before opening", () => {
    mockNavigationKey = undefined;
    const { navigationBecomesReady } = mount("expired");
    expect(push).not.toHaveBeenCalled();

    navigationBecomesReady();

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(expiredSheet);
  });

  it("opens once per expiry, however often it re-renders", () => {
    const { rerender, setAuth } = mount("expired");

    rerender();
    rerender();
    setAuth({ rotationLost: true });
    setAuth({ isEndingSession: true });
    setAuth({ isEndingSession: false });

    expect(push).toHaveBeenCalledTimes(1);
  });

  it("opens again on a later, separate expiry", () => {
    const { setStatus } = mount("expired");

    setStatus("authenticated");
    setStatus("expired");

    expect(push).toHaveBeenCalledTimes(2);
  });

  it("opens again after the user signed out and a later session expired", () => {
    const { setStatus } = mount("expired");

    setStatus("signedOut");
    setStatus("authenticated");
    setStatus("expired");

    expect(push).toHaveBeenCalledTimes(2);
  });
});
