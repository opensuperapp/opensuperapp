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
import { BASE_URL, USER_CONFIGURATIONS } from "@/constants/Constants";
import { apiRequest } from "@/utils/requestHandler";
import * as secureStorage from "@/utils/secureStorage";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

interface AppArrangement {
  name: string;
  isDirectory: boolean;
  apps: string[];
}

export interface UserConfig {
  email: string;
  configKey: string;
  configValue: string[] | AppArrangement[];
  isActive: number;
}

interface UserConfigState {
  configurations: UserConfig[];
  loading: boolean;
}

const initialState: UserConfigState = {
  configurations: [],
  loading: false,
};

// Async function to fetch user configurations
export const getUserConfigurations = createAsyncThunk(
  "userConfig/fetch",
  async (onLogout: () => Promise<void>, { rejectWithValue }) => {
    try {
      const response = await apiRequest(
        { url: `${BASE_URL}/users/app-configs`, method: "GET" },
        onLogout
      );

      if (response?.status === 200 && response?.data) {
        await secureStorage.setItem(
          USER_CONFIGURATIONS,
          JSON.stringify(response.data)
        );
        return response.data;
      } else {
        return [];
      }
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Redux slice
const userConfigSlice = createSlice({
  name: "userConfig",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getUserConfigurations.pending, (state) => {
        state.loading = true;
      })
      .addCase(getUserConfigurations.fulfilled, (state, action) => {
        state.loading = false;
        state.configurations = action.payload || [];
      })
      .addCase(getUserConfigurations.rejected, (state, action) => {
        state.loading = false;
      });
  },
});

export default userConfigSlice.reducer;
