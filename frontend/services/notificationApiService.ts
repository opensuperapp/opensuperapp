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

import { apiRequest } from "@/utils/requestHandler";
import { BASE_URL } from "@/constants/Constants";
import { Platform } from "react-native";

export interface DeviceTokenPayload {
    email: string;
    token: string;
    platform: "ios" | "android";
}

/**
 * Register device token with the backend
 * @param email - User's email address
 * @param token - FCM/APNs device token
 * @param onLogout - Logout callback for token refresh
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function registerDeviceToken(
    email: string,
    token: string,
    onLogout: () => Promise<void>
): Promise<boolean> {
    try {
        const platform = Platform.OS === "ios" ? "ios" : "android";

        const payload: DeviceTokenPayload = {
            email,
            token,
            platform,
        };

        const response = await apiRequest(
            {
                url: `${BASE_URL}/device-tokens`,
                method: "POST",
                data: payload,
            },
            onLogout
        );

        if (response?.status === 201 || response?.status === 200) {
            console.log("Device token registered successfully");
            return true;
        }

        console.error("Failed to register device token:", response);
        return false;
    } catch (error) {
        console.error("Error registering device token:", error);
        return false;
    }
}

/**
 * Update device token with the backend
 * @param email - User's email address
 * @param token - FCM/APNs device token
 * @param onLogout - Logout callback for token refresh
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function updateDeviceToken(
    email: string,
    token: string,
    onLogout: () => Promise<void>
): Promise<boolean> {
    // For now, we'll use the same endpoint as register
    // The backend should handle upsert logic
    return registerDeviceToken(email, token, onLogout);
}

/**
 * Unregister device token from the backend
 * @param email - User's email address
 * @param onLogout - Logout callback for token refresh
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function unregisterDeviceToken(
    email: string,
    onLogout: () => Promise<void>
): Promise<boolean> {
    try {
        const response = await apiRequest(
            {
                url: `${BASE_URL}/device-tokens`,
                method: "DELETE",
            },
            onLogout
        );

        if (response?.status === 204 || response?.status === 200) {
            console.log("Device token unregistered successfully");
            return true;
        }

        console.error("Failed to unregister device token:", response);
        return false;
    } catch (error) {
        console.error("Error unregistering device token:", error);
        return false;
    }
}
