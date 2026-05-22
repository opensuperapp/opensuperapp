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
import { restoreGoogleDriveBackup } from "../../services/googleService";
/**
 * Bridge handler: restore_google_drive_backup
 *
 * Params: none
 * Resolves: backup data when restore succeeds
 * Rejects: error message when restore fails
 * Side effects: performs network call to googleService.restoreGoogleDriveBackup
 * Error modes: network/service errors are caught and rejected
 */
export const BRIDGE_FUNCTION: BridgeFunction = {
  topic: "restore_google_drive_backup",
  handler: async (params, context) => {
    try {
      const res = await restoreGoogleDriveBackup();
      if (res) {
        context.resolve(res.data);
      } else {
        context.reject(res?.error || "Restore failed");
      }
    } catch (err: any) {
      console.error("Error restoring Google Drive backup:", err);
      context.reject(err.message || "Restore failed");
    }
  }
};
