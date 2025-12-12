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
import { UserConfig } from "@/context/slices/userConfigSlice";
import { apiRequest } from "@/utils/requestHandler";
import * as secureStorage from "@/utils/secureStorage";
import { store } from "@/context/store";

// Send downloaded appId to backend (user configurations)
export const UpdateUserConfiguration = async (
  appId: string,
  action: "downloaded" | "not-downloaded",
  onLogout: () => Promise<void>
) => {
  try {
    // Get the latest state directly from secure storage each time
    const storedUserConfigsJson = await secureStorage.getItem(
      USER_CONFIGURATIONS
    );
    let storedUserConfigs: UserConfig[] = storedUserConfigsJson
      ? JSON.parse(storedUserConfigsJson)
      : [];

    if (storedUserConfigs.length === 0) {
      const state = store.getState();
      const email = state.auth.email;

      if (!email) {
        console.error("User email not found in auth state.");
        return false;
      }

      storedUserConfigs = [
        {
          configKey: APP_LIST_CONFIG_KEY,
          configValue: [],
          email,
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

    let updatedConfigValue = Array.isArray(appUserConfigs.configValue)
      ? [...appUserConfigs.configValue]
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

    await secureStorage.setItem(
      USER_CONFIGURATIONS,
      JSON.stringify(updatedUserConfigs)
    );

    const response = await apiRequest(
      {
        url: `${BASE_URL}/users/app-configs`,
        method: "POST",
        data: {
          configKey: APP_LIST_CONFIG_KEY,
          configValue: updatedConfigValue,
          email: appUserConfigs.email,
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

      await secureStorage.setItem(
        USER_CONFIGURATIONS,
        JSON.stringify(storedUserConfigs)
      );
    }

    return response?.status === 201;
  } catch (error) {
    console.error("Error updating user configuration:", error);
    return false;
  }
};
