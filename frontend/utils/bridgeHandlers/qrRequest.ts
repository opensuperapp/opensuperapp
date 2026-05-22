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
 * Bridge handler: qr_request
 *
 * Params: none
 * Resolves: scanned QR code string via context.resolve when scanner callback triggers
 * Rejects: none directly; calling code should handle timeouts if needed
 * Side effects: sets context.qrScanCallback and toggles scanner UI via context.setScannerVisible
 * Error modes: if scanner UI or callback not available, no resolution occurs
 */
export const BRIDGE_FUNCTION: BridgeFunction = {
  topic: "QR_code",
  handler: async (params, context) => {
    // Set the callback to resolve with the scanned QR code
    context.qrScanCallback = (qrCode: string) => {
      context.resolve(qrCode);
    };
    // Open the scanner
    context.setScannerVisible(true);
  }
};
