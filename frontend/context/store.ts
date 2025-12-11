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
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import appReducer from "./slices/appSlice";
import authReducer from "./slices/authSlice";
import userConfigReducer from "./slices/userConfigSlice";
import versionReducer from "./slices/versionSlice";
import userInfoReducer from "./slices/userInfoSlice";
import notificationReducer from "./slices/notificationSlice";

// Note: Redux persist uses AsyncStorage for all slices due to SecureStore's 2048 byte limit
// Individual sensitive values (AUTH_DATA, USER_CONFIGURATIONS) are stored separately in SecureStore
// via the secureStorage wrapper in utils/secureStorage.ts

const authPersistConfig = {
  key: "auth",
  storage: AsyncStorage,
  // Security: Do not persist tokens in AsyncStorage; keep only non-sensitive fields
  whitelist: ["email"],
};

const appsPersistConfig = {
  key: "apps",
  storage: AsyncStorage,
  whitelist: ["installedApps"],
};

const userConfigPersistConfig = {
  key: "user-config",
  storage: AsyncStorage,
  whitelist: ["configurations"],
};

const userInfoPersistConfig = {
  key: "user-info",
  storage: AsyncStorage,
  whitelist: ["userInfo"],
};

const notificationPersistConfig = {
  key: "notification",
  storage: AsyncStorage,
  whitelist: ["deviceToken", "permissionGranted", "isRegistered"],
};

const appReducerCombined = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  apps: persistReducer(appsPersistConfig, appReducer),
  userConfig: persistReducer(userConfigPersistConfig, userConfigReducer),
  version: versionReducer,
  userInfo: persistReducer(userInfoPersistConfig, userInfoReducer),
  notification: persistReducer(notificationPersistConfig, notificationReducer),
});

const rootReducer = (
  state: ReturnType<typeof appReducerCombined> | undefined,
  action: any
) => {
  if (action.type === "auth/resetAll") {
    state = undefined;
  }
  return appReducerCombined(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
