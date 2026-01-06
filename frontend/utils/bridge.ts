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

// Bridge event topics used for communication between the main app and micro apps.
export const TOPIC = {
  TOKEN: "token",
  QR_REQUEST: "qr_request",
  SAVE_LOCAL_DATA: "save_local_data",
  GET_LOCAL_DATA: "get_local_data",
  DELETE_LOCAL_DATA: "delete_local_data",
  SAVE_TO_SECURE_STORE: "secure_store_persistence",
  GET_FROM_SECURE_STORE: "secure_store_retrieval",
  DELETE_FROM_SECURE_STORE: "secure_store_deletion",
  SCHEDULE_LOCAL_NOTIFICATION: "scheduling_local_notification",
  CANCEL_LOCAL_NOTIFICATION: "cancelling_local_notification",
  CLEAR_ALL_LOCAL_NOTIFICATIONS: "clearing_all_local_notifications",
  ALERT: "alert",
  CONFIRM_ALERT: "confirm_alert",
  TOTP: "totp",
  GOOGLE_LOGIN: "google_login",
  UPLOAD_TO_GOOGLE_DRIVE: "upload_to_google_drive",
  RESTORE_GOOGLE_DRIVE_BACKUP: "restore_google_drive_backup",
  GOOGLE_USER_INFO: "google_user_info",
  CHECK_GOOGLE_AUTH_STATE: "check_google_auth_state",
  CLOSE_WEBVIEW_FROM_MICROAPP: "close_webview",
  NATIVE_LOG: "native_log",
  DEVICE_SAFE_AREA_INSETS: "device_safe_area_insets",
  DEVICE_SCREEN_SIZE: "device_screen_size",
  OPEN_URL: "open_url",
  MICRO_APP_VERSION: "micro_app_version",
};

// JavaScript code injected into the WebView to enable communication between
// the micro app and the React Native app via the native bridge.
export const injectedJavaScript = `window.nativebridge = {
    requestToken: () => {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        topic: 'token'
      }));
    },
    requestQr: () => {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        topic: 'qr_request'
      }));
    },
    requestAlert: (title, message, buttonText) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ 
        topic: "alert", 
        data: { title, message, buttonText } 
      }));
    },
    requestConfirmAlert: (title, message, confirmButtonText, cancelButtonText) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ 
        topic: "confirm_alert", 
        data: { title, message, confirmButtonText, cancelButtonText } 
      }));
    },
    requestSaveLocalData: (key, value) => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "save_local_data", data: { key, value } })),
    resolveSaveLocalData: () => console.log("Local data saved successfully"),
    rejectSaveLocalData: (err) => console.error("Save Local Data failed:", err),
    requestGetLocalData: (key) => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "get_local_data", data: { key } })),
    resolveGetLocalData: (data) => console.log("Local data received:", data),
    rejectGetLocalData: (err) => console.error("Get Local Data failed:", err),
    requestDeleteLocalData: (key) => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "delete_local_data", data: { key } })),
    resolveDeleteLocalData: () => console.log("Local data deleted successfully"),
    rejectDeleteLocalData: (err) => console.error("Delete Local Data failed:", err),
    requestSecureStorePersistence: (key, value) => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "secure_store_persistence", data: { key, value } })),
    resolveSecureStorePersistence: () => console.log("Data saved to Secure Store successfully"),
    rejectSecureStorePersistence: (err) => console.error("Saving to Secure Store failed:", err),
    requestSecureStoreRetrieval: (key) => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "secure_store_retrieval", data: { key } })),
    resolveSecureStoreRetrieval: (data) => console.log("Data retrieved from Secure Store:", data),
    rejectSecureStoreRetrieval: (err) => console.error("Retrieval from Secure Store failed:", err),
    requestSecureStoreDeletion: (key) => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "secure_store_deletion", data: { key } })),
    resolveSecureStoreDeletion: () => console.log("Data deleted from Secure Store successfully"),
    rejectSecureStoreDeletion: (err) => console.error("Deletion from Secure Store failed:", err),
    requestSchedulingLocalNotification: (data) => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "scheduling_local_notification", data })),
    resolveSchedulingLocalNotification: () => console.log("Local notification scheduled successfully"),
    rejectSchedulingLocalNotification: (err) => console.error("Scheduling local notification failed:", err),
    requestCancellingLocalNotification: (data) => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "cancelling_local_notification", data })),
    resolveCancellingLocalNotification: () => console.log("Local notification cancelled successfully"),
    rejectCancellingLocalNotification: (err) => console.error("Cancelling local notification failed:", err),
    requestClearingAllLocalNotifications: () => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "clearing_all_local_notifications" })),
    resolveClearingAllLocalNotifications: () => console.log("All local notifications cleared successfully"),
    rejectClearingAllLocalNotifications: (err) => console.error("Clearing all local notifications failed:", err),
    requestTotpQrMigrationData: () => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "totp" })),
    resolveTotpQrMigrationData: (data) => console.log("TOTP QR Migration Data:", data),
    rejectTotpQrMigrationData: (err) => console.error("TOTP Data retrieval failed:", err),
    requestGoogleLogin: () => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "google_login" })),
    resolveGoogleLogin: (data) => console.log("Google login data received:", data),
    rejectGoogleLogin: (err) => console.error("Google login failed:", err),
    requestUploadToGoogleDrive: (data) => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "upload_to_google_drive", data })),
    resolveUploadToGoogleDrive: () => console.log("Google Drive upload successful"),
    rejectUploadToGoogleDrive: (err) => console.error("Google Drive upload failed:", err),
    requestRestoreGoogleDriveBackup: () => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "restore_google_drive_backup" })),
    resolveRestoreGoogleDriveBackup: (data) => console.log("Google Drive backup restored:", data),
    rejectRestoreGoogleDriveBackup: (err) => console.error("Google Drive restore failed:", err),
    requestGoogleAuthState: () => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "check_google_auth_state" })),
    resolveGoogleAuthState: (data) => console.log("Google Auth State:", data),
    rejectGoogleAuthState: (err) => console.error("Google Auth State check failed:", err),
    requestGoogleUserInfo: () => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "google_user_info" })),
    resolveGoogleUserInfo: (data) => console.log("Google User Info:", data),
    rejectGoogleUserInfo: (err) => console.error("Google User Info retrieval failed:", err),
    requestOpenUrl: (config) => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "open_url", data: { config } })),
    resolveOpenUrl: () => console.log("URL opened successfully"),
    rejectOpenUrl: (err) => console.error("Failed to open URL:", err),
    requestMicroAppVersion: () => window.ReactNativeWebView.postMessage(JSON.stringify({ topic: "micro_app_version" })),
    resolveMicroAppVersion: (version) => console.log("Micro App Version:", version),
    rejectMicroAppVersion: (err) => console.error("Failed to get Micro App version:", err)
  };`;
