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
import { ScreenPaths } from "@/constants/ScreenPaths";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";

/**
 * Hook to handle notification tap navigation.
 * The last notification response covers a tap from the foreground, from the
 * background and the one that launched the app.
 */
export const useNotificationNavigation = () => {
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (
      lastResponse?.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      return;
    }
    router.push(ScreenPaths.MY_APPS);
    router.push(ScreenPaths.NOTIFICATIONS);
    Notifications.clearLastNotificationResponse();
  }, [lastResponse]);
};
