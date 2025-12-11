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
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { APPS, DEFAULT_VIEWING_MODE } from "@/constants/Constants";
import { DisplayMode } from "@/types/navigation";

export type Version = {
  version: string;
  build: number;
  releaseNotes: string;
  downloadUrl: string;
  iconUrl: string;
};

export type MicroAppConfig = {
  microAppId: string;
  configKey: string;
  configValue: any;
  isActive: number;
};

export type MicroApp = {
  name: string;
  description: string;
  promoText: string;
  appId: string;
  iconUrl: string;
  bannerImageUrl: string;
  isMandatory: number;
  versions: Version[];
  configs?: MicroAppConfig[];
  status?: string | "";
  webViewUri?: string | "";
  clientId?: string | "";
  exchangedToken?: string | "";
  displayMode?: DisplayMode;
};

interface AppsState {
  apps: MicroApp[];
  downloading: string[];
}

const initialState: AppsState = {
  apps: [],
  downloading: [],
};

const appsSlice = createSlice({
  name: "apps",
  initialState,
  reducers: {
    setApps(state, action: PayloadAction<MicroApp[]>) {
      state.apps = action.payload || [];
    },
    addDownloading(state, action: PayloadAction<string>) {
      state.downloading.push(action.payload);
    },
    removeDownloading(state, action: PayloadAction<string>) {
      state.downloading = state.downloading.filter(
        (appId) => appId !== action.payload
      );
    },
    updateAppStatus: (
      state,
      action: PayloadAction<{
        appId: string;
        status: string;
        webViewUri: string;
        clientId: string;
        exchangedToken?: string;
        displayMode?: DisplayMode;
      }>
    ) => {
      const {
        appId,
        status,
        webViewUri,
        clientId,
        exchangedToken,
        displayMode,
      } = action.payload;
      const app = state.apps.find((app) => app.appId === appId);
      if (app) {
        app.status = status;
        app.webViewUri = webViewUri;
        app.clientId = clientId;
        app.displayMode = displayMode || DEFAULT_VIEWING_MODE;
        if (exchangedToken) {
          app.exchangedToken = exchangedToken;
        } else app.exchangedToken = "";
      }

      // Ensure state is saved in AsyncStorage immediately
      AsyncStorage.setItem(APPS, JSON.stringify(state.apps));
    },
    updateExchangedToken: (
      state,
      action: PayloadAction<{ appId: string; exchangedToken: string }>
    ) => {
      const { appId, exchangedToken } = action.payload;
      const app = state.apps.find((app) => app.appId === appId);
      if (app) app.exchangedToken = exchangedToken;

      // Ensure state is saved in AsyncStorage immediately
      AsyncStorage.setItem(APPS, JSON.stringify(state.apps));
    },
  },
});

export const {
  setApps,
  addDownloading,
  removeDownloading,
  updateAppStatus,
  updateExchangedToken,
} = appsSlice.actions;
export default appsSlice.reducer;
