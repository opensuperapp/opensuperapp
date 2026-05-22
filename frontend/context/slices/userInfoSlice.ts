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
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL, USER_INFO } from "@/constants/Constants";
import { apiRequest } from "@/utils/requestHandler";

export type UserInfo = {
  workEmail: string;
  firstName: string;
  lastName: string;
  userThumbnail: string | null;
};

interface AppsState {
  loading: boolean;
  userInfo: UserInfo | null;
  error: string | null;
}

const initialState: AppsState = {
  loading: false,
  userInfo: null,
  error: null,
};

// Async function to fetch user info
export const getUserInfo = createAsyncThunk(
  "userInfo/fetch",
  async (onLogout: () => Promise<void>, { rejectWithValue }) => {
    try {
      const response = await apiRequest(
        {
          url: `${BASE_URL}/user-info`,
          method: "GET",
        },
        onLogout
      );

      if (response?.status === 200) return response.data;
      else return rejectWithValue("User info not found");
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Redux slice
const userInfoSlice = createSlice({
  name: "userInfo",
  initialState,
  reducers: {
    setUserInfo(state, action: PayloadAction<UserInfo>) {
      state.userInfo = action.payload || null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getUserInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserInfo.fulfilled, (state, action) => {
        state.loading = false;
        state.userInfo = action.payload;

        AsyncStorage.setItem(USER_INFO, JSON.stringify(state.userInfo));
      })
      .addCase(getUserInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setUserInfo } = userInfoSlice.actions;
export default userInfoSlice.reducer;
