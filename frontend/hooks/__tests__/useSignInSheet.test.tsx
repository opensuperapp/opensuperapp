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
import { ScreenPaths } from "@/constants/ScreenPaths";
import { SignInReason, useSignInSheet } from "@/hooks/useSignInSheet";
import { SessionStatus } from "@/types/auth.types";
import { router } from "expo-router";
import React from "react";
import { Provider } from "react-redux";
import { createStore } from "redux";
import { act, create } from "react-test-renderer";

jest.mock("@react-native-async-storage/async-storage", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
// Forwarded rather than returned: the factory runs while the hook is imported,
// before this const is initialised.
const mockSignIn = jest.fn();
jest.mock("@/hooks/useSignInWithAsgardeo", () => ({
  useSignInWithAsgardeo:
    () =>
    (...args: unknown[]) =>
      mockSignIn(...args),
}));
// The route's ?reason= param; undefined when the route was opened without one.
let mockReason: SignInReason | undefined;
jest.mock("expo-router", () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () =>
    mockReason === undefined ? {} : { reason: mockReason },
}));
// react-redux's package.json "react-native" export condition points at an
// ESM build this project's Jest transform can't parse; the "default"
// (alternate-renderers) condition resolves to the same API via CommonJS.
jest.mock("react-redux", () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("react-redux/alternate-renderers")
);

type AuthSnapshot = { sessionStatus: SessionStatus; rotationLost: boolean };
type SetStatus = { type: "set"; sessionStatus: SessionStatus };
type Sheet = ReturnType<typeof useSignInSheet>;

const mount = (sessionStatus: SessionStatus, rotationLost = false) => {
  const store = createStore(
    (
      state: { auth: AuthSnapshot } = { auth: { sessionStatus, rotationLost } },
      action: SetStatus | { type: string }
    ) =>
      action.type === "set"
        ? {
            auth: {
              ...state.auth,
              sessionStatus: (action as SetStatus).sessionStatus,
            },
          }
        : state
  );
  const sheet: { current: Sheet } = { current: undefined as unknown as Sheet };
  const Screen = () => {
    sheet.current = useSignInSheet();
    return null;
  };
  act(() => {
    create(
      <Provider store={store}>
        <Screen />
      </Provider>
    );
  });
  const setStatus = (status: SessionStatus) =>
    act(() => {
      store.dispatch({ type: "set", sessionStatus: status });
    });
  return { sheet, setStatus };
};

const back = router.back as jest.Mock;
const canGoBack = router.canGoBack as jest.Mock;
const replace = router.replace as jest.Mock;

beforeEach(() => {
  mockSignIn.mockReset().mockResolvedValue(undefined);
  back.mockReset();
  replace.mockReset();
  canGoBack.mockReset().mockReturnValue(true);
  mockReason = "expired";
});

describe("useSignInSheet", () => {
  it("says the session expired", () => {
    const { sheet } = mount("expired");

    expect(sheet.current.title).toMatch(/session expired/i);
    expect(sheet.current.message).toMatch(/session has expired/i);
    expect(sheet.current.message).not.toMatch(/connection/i);
  });

  it("says the sign-in was lost to the connection when that is what happened", () => {
    const expired = mount("expired").sheet.current;
    const lost = mount("expired", true).sheet.current;

    expect(lost.message).toMatch(/connection/i);
    expect(lost.title).not.toEqual(expired.title);
    expect(lost.message).not.toEqual(expired.message);
  });

  it.each<[string, SignInReason | undefined]>([
    ["without a reason", undefined],
    ["for reason required", "required"],
  ])("asks the user to sign in when opened %s", (_, reason) => {
    mockReason = reason;

    const { title, message } = mount("signedOut").sheet.current;

    expect(title).toBe("Sign in Required");
    expect(message).toBe("Please sign in to continue using the app");
  });

  it.each<SignInReason | undefined>([undefined, "required"])(
    "ignores a lost sign-in unless opened for an expiry (reason %s)",
    (reason) => {
      mockReason = reason;

      const { title, message } = mount("expired", true).sheet.current;

      expect(title).toBe("Sign in Required");
      expect(message).not.toMatch(/connection|expired/i);
    }
  );

  it("is signing in only while the sign-in is in flight", async () => {
    let finish!: () => void;
    mockSignIn.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      })
    );
    const { sheet, setStatus } = mount("expired");
    expect(sheet.current.isSigningIn).toBe(false);

    let signingIn!: Promise<void>;
    act(() => {
      signingIn = sheet.current.signIn();
    });

    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(sheet.current.isSigningIn).toBe(true);

    setStatus("authenticated");
    await act(async () => {
      finish();
      await signingIn;
    });

    expect(sheet.current.isSigningIn).toBe(false);
  });

  it("stops signing in when the sign-in rejects, so the user can try again", async () => {
    mockSignIn.mockRejectedValue(new Error("authorize failed"));
    const { sheet } = mount("expired");

    await act(async () => {
      await sheet.current.signIn().catch(() => undefined);
    });

    expect(sheet.current.isSigningIn).toBe(false);
    expect(back).not.toHaveBeenCalled();
  });

  it("stays up after a cancelled sign-in, so the user can try again", async () => {
    // useSignInWithAsgardeo swallows a cancel and leaves the session expired.
    const { sheet } = mount("expired");

    await act(async () => {
      await sheet.current.signIn();
    });

    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(sheet.current.isSigningIn).toBe(false);
    expect(back).not.toHaveBeenCalled();
  });

  it.each<SessionStatus>(["authenticated", "refreshing", "degraded"])(
    "closes itself once the user is signed in (%s)",
    (status) => {
      const { setStatus } = mount("expired");

      setStatus(status);

      expect(back).toHaveBeenCalledTimes(1);
    }
  );

  it.each<SessionStatus>(["expired", "signedOut", "restoring"])(
    "stays open while the user is not signed in (%s)",
    (status) => {
      mount(status);

      expect(back).not.toHaveBeenCalled();
    }
  );

  it("stays open when an expired session becomes signed out", () => {
    const { setStatus } = mount("expired");

    setStatus("signedOut");

    expect(back).not.toHaveBeenCalled();
  });

  it.each<SessionStatus>(["authenticated", "refreshing", "degraded"])(
    "closes straight away when opened while signed in (%s)",
    (status) => {
      mockReason = undefined;

      mount(status);

      expect(back).toHaveBeenCalledTimes(1);
    }
  );

  it("goes to the feed on sign-in when there is nothing to go back to", () => {
    canGoBack.mockReturnValue(false);
    const { setStatus } = mount("expired");

    setStatus("authenticated");

    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith(ScreenPaths.FEED);
  });

  it("goes to the feed on dismiss when there is nothing to go back to", () => {
    canGoBack.mockReturnValue(false);
    const { sheet } = mount("expired");

    act(() => {
      sheet.current.dismiss();
    });

    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith(ScreenPaths.FEED);
  });

  it("closes on dismiss without signing in", () => {
    const { sheet } = mount("expired");

    act(() => {
      sheet.current.dismiss();
    });

    expect(back).toHaveBeenCalledTimes(1);
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
