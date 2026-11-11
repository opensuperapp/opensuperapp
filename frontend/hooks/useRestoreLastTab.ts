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
import { useRouter } from "expo-router";
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

/**
 * Puts the user back on the tab they last had open, unless the tab bar would not show
 * it to them now: a signed-out user is not restored onto Chat.
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

    const restoreTab = async () => {
      try {
        const lastRoute = await AsyncStorage.getItem(LAST_ACTIVE_PATH_KEY);

        if (lastRoute && isValidPath(lastRoute) && canRestore(lastRoute)) {
          setTimeout(() => {
            router.navigate(lastRoute as ScreenPaths);
            openTabTracking();
          }, 100);
        } else {
          // If no last tab is found, go to Discovery
          router.navigate(ScreenPaths.FEED);
          openTabTracking();
        }
      } catch (error) {
        console.error("Failed to restore last tab:", error);
        openTabTracking();
      }
    };

    restoreTab();
  }, [isSessionKnown, areRulesLoaded, router]);
};
