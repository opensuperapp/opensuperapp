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
import { BRIDGE_FUNCTION as alert } from "./alert";
import { BRIDGE_FUNCTION as authenticateWithGoogle } from "./authenticateWithGoogle";
import { BRIDGE_FUNCTION as checkGoogleAuthState } from "./checkGoogleAuthState";
import { BRIDGE_FUNCTION as closeWebview } from "./closeWebview";
import { BRIDGE_FUNCTION as confirmAlert } from "./confirmAlert";
import { BRIDGE_FUNCTION as deviceSafeAreaInsets } from "./deviceSafeAreaInsets";
import { BRIDGE_FUNCTION as getLocalData } from "./getLocalData";
import { BRIDGE_FUNCTION as googleUserInfo } from "./googleUserInfo";
import { BRIDGE_FUNCTION as nativeLog } from "./nativeLog";
import { BRIDGE_FUNCTION as qrRequest } from "./qrRequest";
import { BRIDGE_FUNCTION as restoreGoogleDriveBackup } from "./restoreGoogleDriveBackup";
import { BRIDGE_FUNCTION as saveLocalData } from "./saveLocalData";
import { BRIDGE_FUNCTION as token } from "./token";
import { BRIDGE_FUNCTION as totpQrMigrationData } from "./totpQrMigrationData";
import { BRIDGE_FUNCTION as uploadToGoogleDrive } from "./uploadToGoogleDrive";
import { BRIDGE_FUNCTION as downloadFile } from "./downloadFile";
import { BRIDGE_FUNCTION as notificationData } from "./notificationData";

export const BRIDGE_REGISTRY = [
  alert,
  authenticateWithGoogle,
  checkGoogleAuthState,
  closeWebview,
  confirmAlert,
  deviceSafeAreaInsets,
  getLocalData,
  googleUserInfo,
  nativeLog,
  qrRequest,
  restoreGoogleDriveBackup,
  saveLocalData,
  token,
  totpQrMigrationData,
  uploadToGoogleDrive,
  downloadFile,
  notificationData,
];
