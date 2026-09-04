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
import {
  APP_LIST_CONFIG_KEY,
  BASE_URL,
  DOWNLOADED,
  USER_CONFIGURATIONS,
} from "@/constants/Constants";
import {
  setUserConfigValue,
  UserConfig,
} from "@/context/slices/userConfigSlice";
import { store } from "@/context/store";
import { apiRequest } from "@/utils/requestHandler";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Send downloaded appId to backend (user configurations)
export const UpdateUserConfiguration = async (
  appId: string,
  action: "downloaded" | "not-downloaded",
  onLogout: () => Promise<void>
) => {
  try {
    type CachedUserConfig = Omit<UserConfig, "email">;
    // Get the latest state directly from AsyncStorage each time
    const storedUserConfigsJson = await AsyncStorage.getItem(
      USER_CONFIGURATIONS
    );
    let storedUserConfigs: CachedUserConfig[] = storedUserConfigsJson
      ? JSON.parse(storedUserConfigsJson)
      : [];

    if (storedUserConfigs.length === 0) {
      const state = store.getState();
      const userId = state.auth.userId;

      if (!userId) {
        console.error("User userId not found in auth state.");
        return false;
      }

      storedUserConfigs = [
        {
          configKey: APP_LIST_CONFIG_KEY,
          configValue: [],
          isActive: 1,
        },
      ];
    }

    const appUserConfigs = storedUserConfigs.find(
      (config) => config.configKey === APP_LIST_CONFIG_KEY
    );

    if (!appUserConfigs) {
      console.warn("User config not found or invalid format.");
      return;
    }

    // The app-list config is always a string[] of appIds; annotate so the value
    // can be handed to the typed reducer below. No runtime change.
    let updatedConfigValue: string[] = Array.isArray(appUserConfigs.configValue)
      ? [...(appUserConfigs.configValue as string[])]
      : [];

    if (action === DOWNLOADED) {
      if (!updatedConfigValue.includes(appId)) {
        updatedConfigValue.push(appId);
      }
    } else {
      updatedConfigValue = updatedConfigValue.filter((id) => id !== appId);
    }

    const updatedUserConfigs = storedUserConfigs.map((config) =>
      config.configKey === APP_LIST_CONFIG_KEY
        ? { ...config, configValue: updatedConfigValue }
        : { ...config }
    );

    await AsyncStorage.setItem(
      USER_CONFIGURATIONS,
      JSON.stringify(updatedUserConfigs)
    );
    // Keep Redux in step with the write above. Without this, readers such as
    // the My Apps sync effect keep using the boot-time snapshot and treat a
    // just-downloaded app as one the user is no longer entitled to.
    store.dispatch(
      setUserConfigValue({
        configKey: APP_LIST_CONFIG_KEY,
        configValue: updatedConfigValue,
      })
    );
    const state = store.getState();
    const userId = state.auth.userId;
    if (!userId) {
      console.error(
        "Missing auth.userId in Redux (expected after SecureStore restore)."
      );
      return false;
    }

    const response = await apiRequest(
      {
        url: `${BASE_URL}/users/user-configs`,
        method: "POST",
        data: {
          configKey: APP_LIST_CONFIG_KEY,
          configValue: updatedConfigValue,
          uuid: userId,
          isActive: appUserConfigs.isActive,
        },
      },
      onLogout
    );

    if (response?.status !== 201) {
      console.warn(
        "Failed to update user config on server. Status:",
        response?.status
      );

      await AsyncStorage.setItem(
        USER_CONFIGURATIONS,
        JSON.stringify(storedUserConfigs)
      );
      store.dispatch(
        setUserConfigValue({
          configKey: APP_LIST_CONFIG_KEY,
          configValue: appUserConfigs.configValue,
        })
      );
    }

    return response?.status === 201;
  } catch (error) {
    console.error("Error updating user configuration:", error);
    return false;
  }
};
