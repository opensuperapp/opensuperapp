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
import { apiRequest } from "@/utils/requestHandler";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { Platform } from "react-native";

export interface Version {
  version: string;
  build: number;
  platform: "android" | "ios";
  releaseNotes: string;
  downloadUrl: string;
}

interface VersionState {
  versions: Version[];
  loading: boolean;
  error: string | null;
}

const initialState: VersionState = {
  versions: [],
  loading: false,
  error: null,
};

// Async function to fetch versions
export const getVersions = createAsyncThunk(
  "version/fetch",
  async (onLogout: () => Promise<void>, { rejectWithValue }) => {
    try {
      const response = await apiRequest(
        {
          url: `${BASE_URL}/versions?platform=${Platform.OS}`,
          method: "GET",
        },
        onLogout
      );

      if (response?.data) return response.data;
      else rejectWithValue("Version data not found");
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Redux slice
const versionSlice = createSlice({
  name: "version",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getVersions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getVersions.fulfilled, (state, action) => {
        state.loading = false;
        state.versions = action.payload || [];
      })
      .addCase(getVersions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default versionSlice.reducer;
