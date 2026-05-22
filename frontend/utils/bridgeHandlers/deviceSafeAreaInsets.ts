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
 * Bridge handler: device_safe_area_insets
 *
 * Params: none
 * Resolves: { insets } when device safe area insets are available on the bridge context
 * Rejects: "Device insets not available" if insets are missing
 * Side effects: none
 * Error modes: synchronous missing-context error is logged and rejected via context.reject
 */
export const BRIDGE_FUNCTION: BridgeFunction = {
  topic: "device_safe_area_insets",
  handler: async (params, context) => {
    if (context.insets) {
      context.resolve({ insets: context.insets });
    } else {
      console.error("Device insets not available in bridge context");
      context.reject("Device insets not available");
    }
  }
};
