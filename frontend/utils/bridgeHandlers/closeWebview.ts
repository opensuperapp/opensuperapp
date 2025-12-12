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
 * Bridge handler: close_webview
 *
 * Params: none
 * Resolves: none
 * Rejects: none
 * Side effects: navigates back using context.router if available
 * Error modes: logs an error if router is not available
 */
export const BRIDGE_FUNCTION: BridgeFunction = {
  topic: "close_webview",
  handler: async (params, context) => {
    if (context.router) {
      context.router.back();
    } else {
      console.error("Router not available in bridge context");
    }
  }
};
