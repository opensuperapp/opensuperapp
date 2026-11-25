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
import type { RootState } from "@/context/store";
import {
  getMicroAppTarget,
  MicroAppTarget,
} from "@/utils/notificationPayload";
import { openMicroApp } from "@/utils/openMicroApp";
import { useIsStartupRouteSettled } from "@/utils/startupRoute";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

/**
 * How long a tap that names a micro app waits for the installed apps list (restored
 * from storage at startup) before giving up and opening Notifications instead.
 */
export const APPS_LIST_WAIT_MS = 5000;

// A tap, identified so the same one is never handled twice: the response that
// launched the app can arrive both from getLastNotificationResponseAsync and from
// the listener, as the same serialized response. The identifier alone is not one
// notification (Android uses data.tag, iOS the apns-collapse-id, a local reminder
// the id its micro app chose), so a later notification can reuse it; its date tells
// them apart.
type Tap = { key: string; target: MicroAppTarget | null };

const toTap = (response: Notifications.NotificationResponse): Tap | null =>
  response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER
    ? {
        key: `${response.notification.request.identifier}:${response.notification.date}`,
        target: getMicroAppTarget(response),
      }
    : null;

// A tap can arrive while a root-level screen (a micro app) is on top of the tabs.
// Pushing the tab route from there stacked a second (tabs) and the follow-up push
// landed on Feed, so close those screens first, then switch tab and push.
const openNotifications = () => {
  if (router.canDismiss()) router.dismissAll();
  router.navigate(ScreenPaths.MY_APPS);
  router.push(ScreenPaths.NOTIFICATIONS);
};

/**
 * Handles a tap on a notification: in the foreground or background (response
 * listener) or one that launched the app (last notification response).
 *
 * - A notification naming a micro app (`microAppId`, optional `launchData`) opens it
 *   the way the bridge's OPEN_MICRO_APP does, once the installed apps list is
 *   loaded. Not installed or not downloaded, or no list within APPS_LIST_WAIT_MS:
 *   Notifications instead, without asking anything.
 * - Any other notification opens Notifications (under My Apps).
 *
 * Nothing navigates before the tab bar has restored the last tab, which would
 * otherwise replace the screen a launching tap opened; the restore leaves the first
 * screen to a pending tap.
 */
export const useNotificationNavigation = () => {
  const isStartupRouteSettled = useIsStartupRouteSettled();
  const apps = useSelector((state: RootState) => state.apps.apps);
  const [pendingTap, setPendingTap] = useState<Tap | null>(null);
  const [hasWaitedForApps, setHasWaitedForApps] = useState(false);
  const handled = useRef(new Set<string>());

  useEffect(() => {
    let isMounted = true;
    const queue = (response: Notifications.NotificationResponse | null) => {
      const tap = response ? toTap(response) : null;
      if (isMounted && tap && !handled.current.has(tap.key)) {
        setHasWaitedForApps(false);
        setPendingTap(tap);
      }
    };

    const subscription =
      Notifications.addNotificationResponseReceivedListener(queue);

    Notifications.getLastNotificationResponseAsync()
      .then(queue)
      .catch((error) =>
        console.error("Error reading the last notification response:", error)
      );

    // A tap stored by a pre-expo-notifications (notifee) build before this update.
    AsyncStorage.getItem(PENDING_NOTIFICATION_NAVIGATION)
      .then(async (pending) => {
        if (!pending) return;
        await AsyncStorage.removeItem(PENDING_NOTIFICATION_NAVIGATION);
        if (isMounted) setPendingTap({ key: `legacy:${pending}`, target: null });
      })
      .catch((error) =>
        console.error("Error reading pending notification navigation:", error)
      );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const needsApps =
    pendingTap?.target != null && apps.length === 0 && !hasWaitedForApps;

  // Bounded wait for the apps list; started only once navigation may happen.
  useEffect(() => {
    if (!isStartupRouteSettled || !needsApps) return;
    const timer = setTimeout(() => {
      console.warn(
        `Notification tap: no installed apps list after ${APPS_LIST_WAIT_MS} ms; opening Notifications instead.`
      );
      setHasWaitedForApps(true);
    }, APPS_LIST_WAIT_MS);
    return () => clearTimeout(timer);
  }, [isStartupRouteSettled, needsApps]);

  useEffect(() => {
    if (!isStartupRouteSettled || !pendingTap || needsApps) return;
    if (handled.current.has(pendingTap.key)) return;
    handled.current.add(pendingTap.key);

    const { target } = pendingTap;
    const opened =
      target !== null &&
      openMicroApp({
        router,
        apps,
        appId: target.microAppId,
        launchData: target.launchData,
        // A micro app already open would stay mounted under this one and still
        // receive what the shared QR scanner emits.
        dismissAll: true,
      });
    if (target && !opened) {
      console.warn(
        `Notification tap: micro app ${target.microAppId} is not installed; opening Notifications instead.`
      );
    }
    if (!opened) openNotifications();

    setPendingTap(null);
    // Otherwise a remount of the root layout would replay the launching tap.
    Notifications.clearLastNotificationResponseAsync().catch((error) =>
      console.error("Error clearing the last notification response:", error)
    );
  }, [pendingTap, isStartupRouteSettled, needsApps, apps]);
};
