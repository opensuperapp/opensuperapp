// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
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
import { REMOTE_CONFIG_INITIAL_VALUES } from "@/config/remoteConfig";
import {
  fetchAndActivate,
  getRemoteConfig,
  getValue,
  setDefaults
} from "@react-native-firebase/remote-config";

export const setRemoteConfigDefaults = () => {
  try {
    setDefaults(getRemoteConfig(), REMOTE_CONFIG_INITIAL_VALUES);
  } catch (error) {
    console.error("Error setting remote config defaults:", error);
  }
};

export const fetchAndActivateRemoteConfig = async () => {
  try {
    await fetchAndActivate(getRemoteConfig());
  } catch (error) {
    console.error("Error fetching and activating remote config:", error);
  }
};

export const getRemoteConfigValueAsString = (key: string): string => {
  return getValue(getRemoteConfig(), key).asString();
};

export const getRemoteConfigValueAsBoolean = (key: string): boolean => {
  return getValue(getRemoteConfig(), key).asBoolean();
};

export const getRemoteConfigValueAsNumber = (key: string): number => {
  return getValue(getRemoteConfig(), key).asNumber();
};

export const getRemoteConfigValueAsJson = <T>(key: string): T => {
  const jsonString = getValue(getRemoteConfig(), key).asString();
  return JSON.parse(jsonString) as T;
};

// export const onRemoteConfigChange = (
//   callback: (error: Error | null, updatedKeys: string[] | null) => void
// ) => {
//   const unsubscribe = onConfigUpdate(
//     getRemoteConfig(),
//     async () => {
//       if (error) {
//         console.error("Error fetching remote config:", error);
//         return;
//       }

//       if (event) {
//         try {
//           await getRemoteConfig().activate();
//           callback(null, event.updatedKeys);
//         } catch (activationError) {
//           console.error(
//             "Error activating updated remote config:",
//             activationError
//           );
//           callback(activationError as Error, null);
//         }
//       }
//     }
//   );
//   return unsubscribe;
// };
