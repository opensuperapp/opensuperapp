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
import { getGoogleUserInfo } from "../../services/googleService";
/**
 * Bridge handler: google_user_info
 *
 * Params: none
 * Resolves: user info object returned from getGoogleUserInfo
 * Rejects: error message when service fails or no user info is found
 * Side effects: none
 * Error modes: service/network errors are caught and rejected
 */
export const BRIDGE_FUNCTION: BridgeFunction = {
  topic: "google_user_info",
  handler: async (params, context) => {
    try {
      const res = await getGoogleUserInfo();
      if (res) {
        context.resolve(res);
      } else {
        context.reject("No user info found");
      }
    } catch (err: any) {
      console.error("Error getting Google user info:", err);
      context.reject(err.message || "Failed to get user info");
    }
  }
};
