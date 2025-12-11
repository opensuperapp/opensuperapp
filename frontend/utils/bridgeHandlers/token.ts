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
import { isTokenExpiringSoon } from "../../services/authService";
/**
 * Bridge handler: token
 *
 * Params: none
 * Resolves: string token via context.resolve or queued pendingTokenRequests
 * Rejects: none here; callers are queued until token becomes available
 * Side effects: may push resolver into context.pendingTokenRequests when token missing
 * Error modes: relies on external context provisioning; no explicit rejection path
 */
export const BRIDGE_FUNCTION: BridgeFunction = {
  topic: "token",
  handler: async (params, context) => {
    // Check if token exists and is not expiring soon
    if (context.token && !isTokenExpiringSoon(context.token)) {
      context.resolve(context.token);
      
      // Resolve any pending token requests
      while (context.pendingTokenRequests.length > 0) {
        const resolve = context.pendingTokenRequests.shift();
        resolve?.(context.token as string);
      }
    } else if (context.token && isTokenExpiringSoon(context.token)) {
      // Token is expiring soon - queue the request and trigger refresh
      context.pendingTokenRequests.push((token: string) => {
        context.resolve(token);
      });
      
      // Trigger token refresh
      if (context.refreshToken) {
        await context.refreshToken();
      }
    } else {
      // Token not available yet, queue the request
      context.pendingTokenRequests.push((token: string) => {
        context.resolve(token);
      });
    }
  }
};
