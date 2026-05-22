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
import userConfigReducer, {
  getUserConfigurations,
  UserConfig,
} from "@/context/slices/userConfigSlice";
import * as requestHandler from "@/utils/requestHandler";
import * as secureStorage from "@/utils/secureStorage";

jest.mock("@/utils/requestHandler");
jest.mock("@/utils/secureStorage");

const initialState = {
  configurations: [],
  loading: false,
};

const mockUserConfig: UserConfig[] = [
  {
    email: "test@example.com",
    configKey: "key1",
    configValue: ["value1"],
    isActive: 1,
  },
];

describe("userConfigSlice", () => {
  describe("async thunks", () => {
    it("should handle getUserConfigurations.pending", () => {
      const action = { type: getUserConfigurations.pending.type };
      const nextState = userConfigReducer(initialState, action);
      expect(nextState.loading).toBe(true);
    });

    it("should handle getUserConfigurations.fulfilled with data", async () => {
      (requestHandler.apiRequest as jest.Mock).mockResolvedValue({
        status: 200,
        data: mockUserConfig,
      });
      const onLogout = jest.fn();
      const thunk = getUserConfigurations(onLogout);
      const dispatch = jest.fn();
      await thunk(dispatch, () => ({}), undefined);

      expect(secureStorage.setItem).toHaveBeenCalledWith(
        "user-configurations",
        JSON.stringify(mockUserConfig)
      );
      expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: getUserConfigurations.fulfilled.type, payload: mockUserConfig }));
    });

    it("should handle getUserConfigurations.fulfilled with no data", async () => {
        (requestHandler.apiRequest as jest.Mock).mockResolvedValue({
          status: 200,
          data: null,
        });
        const onLogout = jest.fn();
        const thunk = getUserConfigurations(onLogout);
        const dispatch = jest.fn();
        await thunk(dispatch, () => ({}), undefined);
  
        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: getUserConfigurations.fulfilled.type, payload: [] }));
      });

    it("should handle getUserConfigurations.rejected", () => {
      const action = { type: getUserConfigurations.rejected.type };
      const nextState = userConfigReducer({ ...initialState, loading: true }, action);
      expect(nextState.loading).toBe(false);
    });
  });
});
