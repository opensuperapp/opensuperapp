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
import { PENDING_NOTIFICATION_NAVIGATION } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import {
  getInitialNotification,
  setupForegroundNotificationListener,
} from "@/utils/push-notification";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useCallback, useEffect } from "react";

/**
 * Hook to handle notification tap navigation.
 * Sets up foreground event listener, checks for initial notifications,
 * and processes pending navigation from background state.
 */
export const useNotificationNavigation = () => {
  const navigateToNotifications = useCallback(() => {
    router.push(ScreenPaths.MY_APPS);
    router.push(ScreenPaths.NOTIFICATIONS);
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupNotificationHandlers = async () => {
      unsubscribe = setupForegroundNotificationListener(() => {
        navigateToNotifications();
      });
    };

    setupNotificationHandlers();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [navigateToNotifications]);

  useEffect(() => {
    const checkInitialAndPendingNotifications = async () => {
      const initialNotification = await getInitialNotification();
      if (initialNotification) {
        navigateToNotifications();
        return;
      }

      const pendingNav = await AsyncStorage.getItem(
        PENDING_NOTIFICATION_NAVIGATION
      );
      if (pendingNav) {
        navigateToNotifications();
        await AsyncStorage.removeItem(PENDING_NOTIFICATION_NAVIGATION);
      }
    };

    checkInitialAndPendingNotifications();
  }, [navigateToNotifications]);
};
