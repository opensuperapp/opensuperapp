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
import { isAuthenticatedWithGoogle } from "../../services/googleService";
/**
 * Bridge handler: check_google_auth_state
 *
 * Params: none
 * Resolves: authentication state object from isAuthenticatedWithGoogle
 * Rejects: error message when not authenticated or service fails
 * Side effects: none
 * Error modes: service/network errors are caught and rejected
 */
export const BRIDGE_FUNCTION: BridgeFunction = {
  topic: "check_google_auth_state",
  handler: async (params, context) => {
    try {
      const res = await isAuthenticatedWithGoogle();
      if (res) {
        context.resolve(res);
      } else {
        context.reject("Not authenticated");
      }
    } catch (err: any) {
      console.error("Error checking Google auth state:", err);
      context.reject(err.message || "Failed to check auth state");
    }
  }
};
