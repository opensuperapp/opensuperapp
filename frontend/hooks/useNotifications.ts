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

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as Notifications from "expo-notifications";
import { AppDispatch, RootState } from "@/context/store";
import {
    requestNotificationPermissions,
    getDevicePushToken,
    registerNotificationListeners,
    configureNotificationChannels,
} from "@/services/notificationService";
import {
    setDeviceToken,
    setPermissionGranted,
    setIsRegistered,
    setLastNotification,
} from "@/context/slices/notificationSlice";
import { registerDeviceToken } from "@/services/notificationApiService";
import { performLogout } from "@/utils/performLogout";
import { handleNotificationNavigation } from "@/utils/notificationNavigation";

/**
 * hook to manage push notifications lifecycle
 * 
 * Responsibilities:
 * - Request notification permissions
 * - Obtain and register device push tokens
 * - Handle notifications in foreground, background, and killed states
 * - Navigate to microapps when notification is tapped
 * 
 * @returns void - This hook manages side effects only
 */
export function useNotifications() {
    const dispatch = useDispatch<AppDispatch>();
    const cleanupRef = useRef<(() => void) | null>(null);

    // Redux state
    const { email } = useSelector((state: RootState) => state.auth);
    const { deviceToken, isRegistered } = useSelector(
        (state: RootState) => state.notification
    );
    const { apps } = useSelector((state: RootState) => state.apps);

    useEffect(() => {
        // Skip if user is not authenticated
        if (!email) {
            return;
        }

        const initializeNotifications = async () => {
            try {
                await setupNotificationSystem();
                await registerDeviceWithBackend();
                await handleAppOpenedFromNotification();
                setupNotificationListeners();
            } catch (error) {
                console.error("[useNotifications] Setup failed:", error);
            }
        };

        /**
         * Step 1: Configure notification system
         */
        const setupNotificationSystem = async () => {
            // Configure Android notification channels
            await configureNotificationChannels();

            // Request permissions from user
            const hasPermission = await requestNotificationPermissions();
            dispatch(setPermissionGranted(hasPermission));

            if (!hasPermission) {
                console.warn("[useNotifications] Permissions not granted");
                throw new Error("Notification permissions denied");
            }
        };

        /**
         * Step 2: Register device token with backend
         */
        const registerDeviceWithBackend = async () => {
            const token = await getDevicePushToken();
            console.log("[useNotifications] Device token:", token);

            if (!token) {
                console.warn("[useNotifications] Failed to get device token");
                return;
            }

            dispatch(setDeviceToken(token));

            // Register with backend if needed
            if (!isRegistered || deviceToken !== token) {
                const handleLogout = async () => {
                    await dispatch(performLogout()).unwrap();
                };

                const success = await registerDeviceToken(email, token, handleLogout);
                dispatch(setIsRegistered(success));

                if (success) {
                    // Token registered with backend
                } else {
                    console.error("[useNotifications] Backend registration failed");
                }
            }
        };

        /**
         * Step 3: Handle app opened from notification (killed state)
         */
        const handleAppOpenedFromNotification = async () => {
            const lastResponse = await Notifications.getLastNotificationResponseAsync();

            if (!lastResponse) {
                return;
            }

            // App opened from notification

            const data = lastResponse.notification.request.content.data;
            dispatch(setLastNotification(lastResponse.notification));

            // Navigate to microapp if specified
            handleNotificationNavigation(data, apps);
        };

        /**
         * Step 4: Set up listeners for incoming notifications
         */
        const setupNotificationListeners = () => {
            const cleanup = registerNotificationListeners(
                // Foreground notification handler
                (notification) => {
                    dispatch(setLastNotification(notification));
                },
                // Notification tap handler`
                (response) => {
                    const data = response.notification.request.content.data;
                    dispatch(setLastNotification(response.notification));

                    // Navigate to microapp if specified
                    handleNotificationNavigation(data, apps);
                }
            );

            cleanupRef.current = cleanup;
        };

        // Initialize
        initializeNotifications();

        // Cleanup on unmount
        return () => {
            if (cleanupRef.current) {
                cleanupRef.current();
            }
        };
    }, [email, deviceToken, isRegistered, dispatch, apps]);
}
