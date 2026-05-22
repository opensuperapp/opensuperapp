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
import authReducer, {
  setAuth,
  resetAll,
  restoreAuth,
  setAuthWithCheck,
} from "@/context/slices/authSlice";
import * as authService from "@/services/authService";
import * as googleService from "@/services/googleService";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@/services/authService");
jest.mock("@/services/googleService");

const initialState = {
  accessToken: null,
  refreshToken: null,
  idToken: null,
  email: null,
  isLoading: false,
};

const mockAuthData = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  idToken: "id-token",
  email: "test@example.com",
  expiresAt: Date.now() + 3600 * 1000,
};

describe("authSlice", () => {
  it("should handle setAuth", () => {
    const nextState = authReducer(initialState, setAuth(mockAuthData));
    expect(nextState.accessToken).toEqual(mockAuthData.accessToken);
    expect(nextState.refreshToken).toEqual(mockAuthData.refreshToken);
    expect(nextState.idToken).toEqual(mockAuthData.idToken);
    expect(nextState.email).toEqual(mockAuthData.email);
  });

  it("should handle resetAll", () => {
    const currentState = { ...initialState, accessToken: "some-token" };
    const nextState = authReducer(currentState, resetAll());
    expect(nextState).toEqual(initialState);
  });

  describe("async thunks", () => {
    it("should handle restoreAuth.fulfilled with valid auth data", async () => {
      (authService.loadAuthData as jest.Mock).mockResolvedValue(mockAuthData);
      const action = { type: restoreAuth.fulfilled.type, payload: mockAuthData };
      const nextState = authReducer(initialState, action);
      expect(nextState.accessToken).toEqual(mockAuthData.accessToken);
    });

    it("should handle restoreAuth.fulfilled with expired auth data", async () => {
      const expiredAuthData = { ...mockAuthData, expiresAt: Date.now() - 1000 };
      const refreshedAuthData = { ...mockAuthData, accessToken: "refreshed-token" };
      (authService.loadAuthData as jest.Mock).mockResolvedValue(expiredAuthData);
      (authService.refreshAccessToken as jest.Mock).mockResolvedValue(refreshedAuthData);
      const action = { type: restoreAuth.fulfilled.type, payload: refreshedAuthData };
      const nextState = authReducer(initialState, action);
      expect(nextState.accessToken).toEqual(refreshedAuthData.accessToken);
    });

    it("should handle setAuthWithCheck.fulfilled", async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify("different@example.com"));
        (googleService.removeGoogleAuthState as jest.Mock).mockResolvedValue(undefined);
        const dispatch = jest.fn();
        const thunk = setAuthWithCheck(mockAuthData);
        await thunk(dispatch, () => ({}), undefined);
        expect(AsyncStorage.setItem).toHaveBeenCalledWith("authMail", JSON.stringify(mockAuthData.email));
        expect(dispatch).toHaveBeenCalledWith(setAuth(mockAuthData));
      });
  });
});
