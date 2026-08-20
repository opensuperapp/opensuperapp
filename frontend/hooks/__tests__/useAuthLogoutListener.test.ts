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

// Mocked to avoid pulling in @reduxjs/toolkit's ESM `immer` dependency, which
// this project's Jest transform isn't configured for (see
// utils/__tests__/microAppCacheStore.test.ts for the same precedent). These
// stubs mirror the real action creators' shapes exactly.
jest.mock("@/context/slices/authSlice", () => ({
  resetAll: () => ({ type: "auth/resetAll" }),
}));
jest.mock("@/context/slices/deviceSlice", () => ({
  clearDeviceState: () => ({ type: "device/clearDeviceState" }),
  clearLastSentFcmToken: () => ({ type: "device/clearLastSentFcmToken" }),
}));

const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch }));

import { Event } from "@/constants/enums/Event";
import { authEmitter } from "@/utils/eventEmitter";
import { useAuthLogoutListener } from "@/hooks/useAuthLogoutListener";
import { createElement } from "react";
import { act, create } from "react-test-renderer";

function TestHost() {
  useAuthLogoutListener();
  return null;
}

describe("useAuthLogoutListener", () => {
  afterEach(() => {
    mockDispatch.mockClear();
    authEmitter.removeAllListeners();
  });

  it("subscribes on mount without dispatching anything yet", () => {
    act(() => {
      create(createElement(TestHost));
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("dispatches resetAll, clearDeviceState, and clearLastSentFcmToken in order when Event.AuthLoggedOut fires", () => {
    act(() => {
      create(createElement(TestHost));
    });

    act(() => {
      authEmitter.emit(Event.AuthLoggedOut, undefined);
    });

    expect(mockDispatch).toHaveBeenCalledTimes(3);
    expect(mockDispatch).toHaveBeenNthCalledWith(1, { type: "auth/resetAll" });
    expect(mockDispatch).toHaveBeenNthCalledWith(2, {
      type: "device/clearDeviceState",
    });
    expect(mockDispatch).toHaveBeenNthCalledWith(3, {
      type: "device/clearLastSentFcmToken",
    });
  });

  it("stops dispatching after unmount (cleanup unsubscribes)", () => {
    let root: ReturnType<typeof create> | undefined;
    act(() => {
      root = create(createElement(TestHost));
    });

    act(() => {
      root!.unmount();
    });

    act(() => {
      authEmitter.emit(Event.AuthLoggedOut, undefined);
    });

    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
