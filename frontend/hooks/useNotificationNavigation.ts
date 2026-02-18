import { PENDING_NOTIFICATION_NAVIGATION } from "@/constants/Constants";
import { router } from "expo-router";
import { useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  setupForegroundNotificationListener,
  getInitialNotification,
} from "@/utils/push-notification";

/**
 * Hook to handle notification tap navigation.
 * Sets up foreground event listener, checks for initial notifications,
 * and processes pending navigation from background state.
 */
export const useNotificationNavigation = () => {
  const navigateToNotifications = useCallback(() => {
    router.push("/(tabs)/apps/notifications");
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