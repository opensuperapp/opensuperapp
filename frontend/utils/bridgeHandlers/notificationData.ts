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

import { BridgeFunction } from "@/types/bridge.types";

/**
 * Bridge function to handle notification data
 */
export const BRIDGE_FUNCTION: BridgeFunction = {
    topic: "notification_data",
    handler: async (data: any, context: any) => {
        try {
            // If data is requested (e.g. web app calls this), return the data from context
            if (context.notificationData) {
                context.resolve(context.notificationData);
            } else {
                context.resolve(null);
            }
        } catch (e) {
            console.error("Failed to handle notification data", e);
            context.reject(e);
        }
    },
};
