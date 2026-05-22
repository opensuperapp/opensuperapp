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
import { uploadToGoogleDrive } from "../../services/googleService";
/**
 * Bridge handler: upload_to_google_drive
 *
 * Params: object passed to uploadToGoogleDrive (files, metadata, etc.)
 * Resolves: response object from googleService when upload returns { id }
 * Rejects: error message from service or generic "Upload failed"
 * Side effects: performs network upload via googleService.uploadToGoogleDrive
 * Error modes: network/service errors are caught and rejected
 */
export const BRIDGE_FUNCTION: BridgeFunction = {
  topic: "upload_to_google_drive",
  handler: async (params, context) => {
    try {
      const res = await uploadToGoogleDrive(params || {});
      if (res.id) {
        context.resolve(res);
      } else {
        context.reject(res.error || "Upload failed");
      }
    } catch (err: any) {
      console.error("Error uploading to Google Drive:", err);
      context.reject(err.message || "Upload failed");
    }
  }
};
