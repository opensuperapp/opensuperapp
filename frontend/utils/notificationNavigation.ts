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

import { router } from "expo-router";
import { ScreenPaths } from "@/constants/ScreenPaths";
import type { MicroApp } from "@/context/slices/appSlice";

/**
 * Handles navigation when a notification with microapp data is tapped
 * @param notificationData - The data payload from the notification
 * @param apps - List of available microapps
 */
export function handleNotificationNavigation(
    notificationData: any,
    apps: MicroApp[]
): void {
    const microappId = notificationData?.microappId;

    if (!microappId) {
        // No microappId in notification data
        return;
    }

    const app = apps.find((a) => a.appId === microappId);

    if (!app) {
        // Microapp sent via notification not found in installed apps
        return;
    }

    router.push({
        pathname: ScreenPaths.MICRO_APP,
        params: {
            webViewUri: app.webViewUri,
            appName: app.name,
            clientId: app.clientId,
            exchangedToken: app.exchangedToken,
            appId: app.appId,
            displayMode: app.displayMode,
            notificationData: JSON.stringify(notificationData),
        },
    });
}
