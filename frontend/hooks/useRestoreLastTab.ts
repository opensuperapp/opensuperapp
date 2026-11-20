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
import { LAST_ACTIVE_PATH_KEY } from "@/constants/Constants";
import { ScreenPaths } from "@/constants/ScreenPaths";
import { selectSessionStatus } from "@/context/slices/authSlice";
import { openTabTracking } from "@/hooks/useTrackActiveScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

const validPaths = Object.values(ScreenPaths);

// The tab each saved path belongs to, as app/(tabs)/_layout names it.
const TAB_NAMES: Partial<Record<ScreenPaths, string>> = {
  [ScreenPaths.FEED]: "index",
  [ScreenPaths.LIBRARY]: "library",
  [ScreenPaths.MY_APPS]: "apps",
  [ScreenPaths.CHAT]: "chat",
  [ScreenPaths.PROFILE]: "profile",
};

const isValidPath = (path: string): path is ScreenPaths => {
  return validPaths.includes(path as ScreenPaths);
};

// The app always opens on the root of the Feed tab.
const LAUNCH_PATHNAME = "/";

/**
 * Puts the user back on the tab they last had open, unless the tab bar would not show
 * it to them now: a signed-out user is not restored onto Chat.
 *
 * It only moves a user who is still where the app opened. By the time the saved tab is
 * read, the sign-in sheet for an expired session or a micro-app may be on top of the
 * tabs, and navigating to a tab then would push a second tab navigator over it rather
 * than switch tabs. A user who has already moved on is left where they are too.
 *
 * @param isTabVisible - The tab bar's own rule for whether a tab is shown.
 * @param areRulesLoaded - Whether isTabVisible is applying the loaded visibility rules
 *   rather than the defaults it falls back to while they load.
 */
export const useRestoreLastTab = (
  isTabVisible: (tabName: string) => boolean,
  areRulesLoaded = true
) => {
  const router = useRouter();
  // Read when the restore navigates, which is after the session, the rules and the saved
  // tab have all been waited for; usePathname re-renders on every route change.
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  // Which tabs a user may see depends on the session and the visibility rules, so nothing
  // is decided until both are known, and then only once.
  const isSessionKnown = useSelector(selectSessionStatus) !== "restoring";
  const hasStarted = useRef(false);
  const isTabVisibleRef = useRef(isTabVisible);
  isTabVisibleRef.current = isTabVisible;

  useEffect(() => {
    if (!isSessionKnown || !areRulesLoaded || hasStarted.current) return;
    hasStarted.current = true;

    const canRestore = (path: ScreenPaths) => {
      const tabName = TAB_NAMES[path];
      return tabName === undefined || isTabVisibleRef.current(tabName);
    };

    const goTo = (path: ScreenPaths) => {
      if (pathnameRef.current === LAUNCH_PATHNAME) router.navigate(path);
      openTabTracking();
    };

    const restoreTab = async () => {
      try {
        const lastRoute = await AsyncStorage.getItem(LAST_ACTIVE_PATH_KEY);

        if (lastRoute && isValidPath(lastRoute) && canRestore(lastRoute)) {
          setTimeout(() => goTo(lastRoute), 100);
        } else {
          // If no last tab is found, go to Discovery
          goTo(ScreenPaths.FEED);
        }
      } catch (error) {
        console.error("Failed to restore last tab:", error);
        openTabTracking();
      }
    };

    restoreTab();
  }, [isSessionKnown, areRulesLoaded, router]);
};
