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
import { BASE_URL } from "@/constants/Constants";
import { AppConfigState } from "@/types/appConfig.types";
import { apiRequest } from "@/utils/requestHandler";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const initialState: AppConfigState = {
  configs: [],
  defaultMicroAppIds: [],
  appScopes: [],
  loading: false,
  error: null,
};

export const getAppConfigurations = createAsyncThunk(
  "appConfig/getConfigurations",
  async (onLogout: () => Promise<void>, { rejectWithValue }) => {
    try {
      const response = await apiRequest(
        {
          url: `${BASE_URL}/app-configs`,
          method: "GET",
        },
        onLogout
      );

      if (response?.data) return response.data;
      else return rejectWithValue("App configs not found");
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const appConfigSlice = createSlice({
  name: "appConfig",
  initialState,
  reducers: {
    resetAppConfig: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAppConfigurations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAppConfigurations.fulfilled, (state, action) => {
        state.loading = false;
        state.configs = action.payload.appConfigs;
        state.defaultMicroAppIds = action.payload.defaultMicroAppIds;
        state.appScopes = action.payload.appScopes;
      })
      .addCase(getAppConfigurations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetAppConfig } = appConfigSlice.actions;
export default appConfigSlice.reducer;
