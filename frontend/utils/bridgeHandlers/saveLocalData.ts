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
import { BridgeFunction } from "../../types/bridge.types";
import AsyncStorage from "@react-native-async-storage/async-storage";
/**
 * Bridge handler: save_local_data
 *
 * Params: { key: string, value: string }
 * Resolves: void when value is successfully saved to AsyncStorage
 * Rejects: error message string when AsyncStorage.setItem fails
 * Side effects: writes to device local storage
 * Error modes: storage errors are caught and rejected
 */
export const BRIDGE_FUNCTION: BridgeFunction = {
  topic: "save_local_data",
  handler: async (params, context) => {
    try {
      const { key, value } = params;
      await AsyncStorage.setItem(key, value);
      context.resolve();
    } catch (error) {
      console.error("Error saving local data:", error);
      const errMessage = error instanceof Error ? error.message : "Unknown error";
      context.reject(errMessage);
    }
  }
};
