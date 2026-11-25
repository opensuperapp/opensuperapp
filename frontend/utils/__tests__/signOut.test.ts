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
import { AppDispatch } from "@/context/store";
import { signOut } from "@/utils/signOut";

jest.mock("@/context/store", () => ({}));
jest.mock("@/context/slices/deviceSlice", () => ({
  disablePushToken: () => ({ type: "device/disablePushToken" }),
}));
jest.mock("@/utils/endSession", () => ({
  endSession: (end: unknown) => ({ type: "auth/endSession", payload: end }),
}));

// Telling the backend to stop pushing to this device needs the access token, so it has
// to start before endSession clears it; it must not hold the sign-out behind the network.
const SIGN_OUT_PUSH_TOKEN_WAIT_MS = 3000;

const build = (disable: () => Promise<unknown>) => {
  const types: string[] = [];
  const dispatch = jest.fn((action: { type: string }) => {
    types.push(action.type);
    return action.type === "device/disablePushToken"
      ? disable()
      : Promise.resolve();
  });
  return { dispatch: dispatch as unknown as AppDispatch, types };
};

const flush = () => jest.advanceTimersByTimeAsync(0);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("signOut", () => {
  it("removes the push token before the session, while there is still a token to send", async () => {
    const { dispatch, types } = build(() => Promise.resolve());

    await signOut(dispatch);

    expect(types).toEqual(["device/disablePushToken", "auth/endSession"]);
    expect(dispatch).toHaveBeenLastCalledWith({
      type: "auth/endSession",
      payload: { status: "signedOut" },
    });
  });

  it("signs out without waiting on a fast removal any longer than it takes", async () => {
    const { dispatch, types } = build(() => Promise.resolve());

    void signOut(dispatch);
    await flush();

    expect(types).toContain("auth/endSession");
  });

  it("signs out locally within a short bound when the network does not answer", async () => {
    const { dispatch, types } = build(() => new Promise(() => {}));

    const signingOut = signOut(dispatch);
    await jest.advanceTimersByTimeAsync(SIGN_OUT_PUSH_TOKEN_WAIT_MS - 1);
    expect(types).not.toContain("auth/endSession");

    await jest.advanceTimersByTimeAsync(1);
    await signingOut;
    expect(types).toEqual(["device/disablePushToken", "auth/endSession"]);
  });
});
