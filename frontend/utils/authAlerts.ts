// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
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
import { Alert } from "react-native";

// Global flag to prevent multiple alerts from being shown
let alertShown = false;

/**
 * Shows a logout confirmation dialog.
 * @param title - The title of the dialog.
 * @param message - The message of the dialog.
 * @param onLogout - The function to call when the user confirms the logout.
 */
export async function showLogoutConfirmation(
  title: string,
  message: string,
  onLogout: () => Promise<void>
) {
  if (!alertShown) {
    alertShown = true;
    Alert.alert(title, message, [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => {
          alertShown = false;
        },
      },
      {
        text: "Sign Out",
        onPress: async () => {
          await onLogout();
          alertShown = false;
        },
      },
    ]);
  }
}

/**
 * Shows a retry dialog with Retry and Sign In buttons.
 * @param title - The title of the dialog.
 * @param message - The message of the dialog.
 * @param onRetry - The function to call when the user clicks Retry.
 * @param onLogout - The function to call when the user clicks Sign In.
 */
export async function showRefreshRetryDialog(
  title: string,
  message: string,
  onRetry: () => Promise<void>,
  onLogout: () => Promise<void>
) {
  if (!alertShown) {
    alertShown = true;
    Alert.alert(title, message, [
      {
        text: "Retry",
        onPress: async () => {
          await onRetry();
          alertShown = false;
        },
      },
      {
        text: "Sign Out",
        onPress: async () => {
          await onLogout();
          alertShown = false;
        },
      },
    ]);
  }
}

/**
 * Shows a network error dialog.
 * @param message - The message of the dialog.
 */
export async function showNetworkError(message = "Check your connection and try again.") {
  if (!alertShown) {
    alertShown = true;
    Alert.alert("Network Error", message, [
      {
        text: "OK",
        onPress: () => {
          alertShown = false;
        },
      },
    ]);
  }
}

export function resetAlertState() {
  alertShown = false;
}

export function isAlertShown() {
  return alertShown;
}
