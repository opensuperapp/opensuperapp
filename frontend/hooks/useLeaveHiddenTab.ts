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
import {
  getFocusedRouteNameFromRoute,
  useIsFocused,
  useRoute,
} from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useEffect } from "react";

/**
 * Moves focus off a tab whose visibility rule has just turned false, for the layout
 * that renders the native tabs.
 *
 * NativeTabs unmounts a hidden tab and cannot show a focused one that is hidden (it
 * throws in development and silently shows another tab in production). So a tab that
 * loses its rule while open, such as Chat when the session ends, has to stay shown
 * until focus has moved off it. The returned route name is that tab: the layout keeps
 * it visible, and once the navigation lands the hook returns undefined and the tab
 * hides. The tab stays mounted meanwhile, so its own leave logic still runs.
 *
 * The move waits while a screen above the tabs is open, so it never closes that screen;
 * the tab is kept shown until the user comes back to the tabs.
 *
 * @param isRouteHidden - Whether the tab with this route name should be hidden.
 * @param fallbackPath - Where to go instead: a tab that is visible.
 * @returns The route name of the focused tab that is waiting to hide, if any.
 */
export const useLeaveHiddenTab = (
  isRouteHidden: (routeName: string) => boolean,
  fallbackPath: ScreenPaths
): string | undefined => {
  const router = useRouter();
  const route = useRoute();
  const areTabsFocused = useIsFocused();
  const focusedRoute = getFocusedRouteNameFromRoute(route);
  const leavingRoute =
    focusedRoute !== undefined && isRouteHidden(focusedRoute)
      ? focusedRoute
      : undefined;

  useEffect(() => {
    if (leavingRoute !== undefined && areTabsFocused) {
      router.navigate(fallbackPath);
    }
  }, [leavingRoute, areTabsFocused, fallbackPath, router]);

  return leavingRoute;
};
