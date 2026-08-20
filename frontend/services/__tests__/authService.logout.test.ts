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
// Mocked to avoid pulling in @reduxjs/toolkit's ESM `immer` dependency, which
// this project's Jest transform isn't configured for. The two action
// creators are plain functions in the real slice; these stubs mirror that.
jest.mock("@/context/slices/appSlice", () => ({
  updateExchangedIdToken: (payload: unknown) => ({
    type: "app/updateExchangedIdToken",
    payload,
  }),
  updateExchangedToken: (payload: unknown) => ({
    type: "app/updateExchangedToken",
    payload,
  }),
}));
// authService.logout() throws if LOGOUT_URL is falsy; jest doesn't load the
// EXPO_PUBLIC_* env vars .env supplies at build/run time, so the real
// Constants module would leave it undefined here.
jest.mock("@/constants/Constants", () => ({
  APPS: "apps",
  CLIENT_ID: "test-client-id",
  LOGOUT_URL: "https://example.com/logout",
  REDIRECT_URI: "https://example.com/redirect",
  SUCCESS: "success",
  TOKEN_URL: "https://example.com/token",
  USER_INFO: "user-info",
}));
jest.mock("@/utils/authTokenStore", () => ({
  loadAuthDataFromSecureStore: jest.fn(),
  clearAuthDataFromSecureStore: jest.fn(),
  saveAuthDataToSecureStore: jest.fn(),
}));
jest.mock("@/utils/exchangedTokenStore", () => ({
  clearAllExchangedTokens: jest.fn(),
}));
jest.mock("react-native-app-auth", () => ({
  logout: jest.fn(),
}));

import { logout } from "@/services/authService";
import { Event } from "@/constants/enums/Event";
import {
  clearAuthDataFromSecureStore,
  loadAuthDataFromSecureStore,
} from "@/utils/authTokenStore";
import { authEmitter } from "@/utils/eventEmitter";
import { clearAllExchangedTokens } from "@/utils/exchangedTokenStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { logout as appLogout } from "react-native-app-auth";

describe("logout", () => {
  let emitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    emitSpy = jest.spyOn(authEmitter, "emit");
  });

  afterEach(() => {
    emitSpy.mockRestore();
    authEmitter.removeAllListeners();
  });

  it("does not emit AuthLoggedOut when there is no stored auth data", async () => {
    (loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue(null);

    await expect(logout()).resolves.toBeUndefined();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it("clears local state and emits AuthLoggedOut once when idToken is missing", async () => {
    (loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      idToken: undefined,
    });

    await logout();

    expect(clearAllExchangedTokens).toHaveBeenCalled();
    expect(clearAuthDataFromSecureStore).toHaveBeenCalled();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("user-info");
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith(Event.AuthLoggedOut, undefined);
  });

  it("clears local state and emits AuthLoggedOut once after a successful Asgardeo logout", async () => {
    (loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      idToken: "id-token",
    });
    (appLogout as jest.Mock).mockResolvedValue(undefined);

    await logout();

    expect(appLogout).toHaveBeenCalled();
    expect(clearAllExchangedTokens).toHaveBeenCalled();
    expect(clearAuthDataFromSecureStore).toHaveBeenCalled();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("user-info");
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith(Event.AuthLoggedOut, undefined);
  });

  it("does not emit AuthLoggedOut when the Asgardeo logout request fails", async () => {
    (loadAuthDataFromSecureStore as jest.Mock).mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      idToken: "id-token",
    });
    (appLogout as jest.Mock).mockRejectedValue(new Error("network error"));

    await expect(logout()).rejects.toThrow("network error");

    expect(Alert.alert).toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
  });
});
