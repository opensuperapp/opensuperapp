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
/**
 * Bridge handler: google_login
 *
 * Params: none
 * Resolves: none (triggers authentication flow)
 * Rejects: may call context.reject if promptAsync is unavailable
 * Side effects: triggers context.promptAsync() to start Google authentication UI
 * Error modes: missing promptAsync will reject with a message
 */
export const BRIDGE_FUNCTION: BridgeFunction = {
  topic: "google_login",
  handler: async (params, context) => {
    if (context.promptAsync) {
      await context.promptAsync();
      context.resolve();
    } else {
      console.error("promptAsync not available in bridge context");
      context.reject?.("Google authentication not available");
    }
  }
};
