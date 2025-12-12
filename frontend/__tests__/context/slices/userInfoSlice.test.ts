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
import userInfoReducer, {
  setUserInfo,
  getUserInfo,
  UserInfo,
} from "@/context/slices/userInfoSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { USER_INFO } from "@/constants/Constants";

jest.mock("@/utils/requestHandler");

const initialState = {
  loading: false,
  userInfo: null,
  error: null,
};

const mockUserInfo: UserInfo = {
  workEmail: "test@example.com",
  firstName: "John",
  lastName: "Doe",
  userThumbnail: null,
};

describe("userInfoSlice", () => {
  it("should handle setUserInfo", () => {
    const nextState = userInfoReducer(initialState, setUserInfo(mockUserInfo));
    expect(nextState.userInfo).toEqual(mockUserInfo);
  });

  describe("async thunks", () => {
    it("should handle getUserInfo.pending", () => {
      const action = { type: getUserInfo.pending.type };
      const nextState = userInfoReducer(initialState, action);
      expect(nextState.loading).toBe(true);
      expect(nextState.error).toBe(null);
    });

    it("should handle getUserInfo.fulfilled", () => {
      const action = { type: getUserInfo.fulfilled.type, payload: mockUserInfo };
      const nextState = userInfoReducer(initialState, action);
      expect(nextState.loading).toBe(false);
      expect(nextState.userInfo).toEqual(mockUserInfo);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        USER_INFO,
        JSON.stringify(mockUserInfo)
      );
    });

    it("should handle getUserInfo.rejected", () => {
      const error = "User info not found";
      const action = { type: getUserInfo.rejected.type, payload: error };
      const nextState = userInfoReducer({ ...initialState, loading: true }, action);
      expect(nextState.loading).toBe(false);
      expect(nextState.error).toBe(error);
    });
  });
});
