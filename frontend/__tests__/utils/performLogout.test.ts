// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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
import { performLogout } from "@/utils/performLogout";
import * as authService from "@/services/authService";
import { persistor } from "@/context/store";
import { resetAll } from "@/context/slices/authSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SecureStorage from "@/utils/secureStorage";
import { router } from "expo-router";
import { Alert } from "react-native";

jest.mock("react-native", () => ({ Platform: { OS: 'ios' }, Alert: { alert: jest.fn() } }));

jest.mock("@/services/authService");
jest.mock("@/context/store", () => ({
  persistor: {
    purge: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock("@/context/slices/authSlice", () => ({
  resetAll: jest.fn(() => ({ type: "auth/resetAll" })),
}));
jest.mock("@/utils/secureStorage");
jest.mock("expo-router", () => ({
  router: {
    navigate: jest.fn(),
  },
}));

describe("performLogout", () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should perform a successful logout", async () => {
    (authService.logout as jest.Mock).mockResolvedValue(undefined);

    await performLogout()(dispatch, () => {}, undefined);

    expect(authService.logout).toHaveBeenCalled();
    expect(persistor.purge).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(resetAll());
    expect(SecureStorage.removeItem).toHaveBeenCalledWith("authData");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("user-info");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("apps");
    expect(Alert.alert).toHaveBeenCalledWith(
      "Logout Successful",
      "You have been logged out successfully.",
      [
        {
          text: "OK",
          onPress: expect.any(Function),
        },
      ],
      { cancelable: false }
    );
    // Simulate onPress and check if router.navigate is called
    const onPressFunction = (Alert.alert as jest.Mock).mock.calls[0][2][0].onPress;
    onPressFunction();
  expect(router.navigate).toHaveBeenCalledWith("/login");
  });

  it("should handle logout errors gracefully", async () => {
    const error = new Error("Logout failed");
    (authService.logout as jest.Mock).mockRejectedValue(error);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await performLogout()(dispatch, () => {}, undefined);

    expect(authService.logout).toHaveBeenCalled();
    expect(persistor.purge).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalledWith(resetAll());
    expect(SecureStorage.removeItem).not.toHaveBeenCalled();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Logout error:", error);

    consoleErrorSpy.mockRestore();
  });
});
