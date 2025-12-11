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

type NativeLogLevel = "info" | "warn" | "error";
/**
 * Bridge handler: native_log
 *
 * Params: { level: 'info'|'warn'|'error', message: string, data?: any }
 * Resolves: none
 * Rejects: none
 * Side effects: logs message to console when __DEV__ is true
 * Error modes: none; silently no-ops in production
 */
export const BRIDGE_FUNCTION: BridgeFunction = {
  topic: "native_log",
  handler: async (params, context) => {
    if (!__DEV__) return;
    
    const level = params.level as NativeLogLevel;
    const message = params.message;
    const injectedData = params.data;

    switch (level) {
      case "info":
        console.info(
          `[Micro App] ${message}.`,
          injectedData !== undefined ? injectedData : ""
        );
        break;
      case "warn":
        console.warn(
          `[Micro App] ${message}.`,
          injectedData !== undefined ? injectedData : ""
        );
        break;
      case "error":
        console.error(
          `[Micro App] ${message}.`,
          injectedData !== undefined ? injectedData : ""
        );
        break;
    }
  }
};
