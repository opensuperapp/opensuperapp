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
 * Bridge handler: totp_qr_migration_data
 *
 * Params: none
 * Resolves: { data: string } containing migration QR data (mocked here)
 * Rejects: none
 * Side effects: none
 * Error modes: none (this returns mock data)
 */
export const BRIDGE_FUNCTION: BridgeFunction = {
    topic: "totp_qr_migration_data",
    handler: async (params, context) => {
        const mockData = "sample-data-1,sample-data-2";
        context.resolve({ data: mockData });
    }
};
