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
import React from "react";
import { render, waitFor } from "@testing-library/react-native";
import { useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppInitializer from "@/components/AppInitializer";
import { setApps } from "@/context/slices/appSlice";
import { getUserConfigurations } from "@/context/slices/userConfigSlice";
import { restoreAuth } from "@/context/slices/authSlice";
import { getVersions } from "@/context/slices/versionSlice";
import { setUserInfo } from "@/context/slices/userInfoSlice";

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn(),
}));

jest.mock("@/context/slices/userConfigSlice", () => ({
  getUserConfigurations: jest.fn(() => ({ type: "userConfig/fetch" })),
}));

jest.mock("@/context/slices/authSlice", () => ({
  restoreAuth: jest.fn(() => ({ type: "auth/restoreAuth" })),
}));

jest.mock("@/context/slices/versionSlice", () => ({
  getVersions: jest.fn(() => ({ type: "version/fetch" })),
}));

jest.mock("@/utils/performLogout", () => ({
  performLogout: jest.fn(() => ({ type: "auth/logout" })),
}));

describe("AppInitializer", () => {
  const dispatch = jest.fn(() => Promise.resolve());
  const onReady = jest.fn();

  beforeEach(() => {
    (useDispatch as jest.Mock).mockReturnValue(dispatch);
    jest.clearAllMocks();
  });

  it("should dispatch actions and call onReady", async () => {
    const mockApps = [{ appId: "app1" }];
    const mockUserInfo = { workEmail: "test@example.com", firstName: "Test", lastName: "User", userThumbnail: null };
    
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify(mockApps))
      .mockResolvedValueOnce(JSON.stringify(mockUserInfo));

    render(<AppInitializer onReady={onReady} />);

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(setApps(mockApps));
      expect(dispatch).toHaveBeenCalledWith(setUserInfo(mockUserInfo));
      expect(dispatch).toHaveBeenCalledWith(getVersions(expect.any(Function)));
      expect(dispatch).toHaveBeenCalledWith(getUserConfigurations(expect.any(Function)));
      expect(dispatch).toHaveBeenCalledWith(restoreAuth());
      expect(onReady).toHaveBeenCalled();
    });
  });
});
