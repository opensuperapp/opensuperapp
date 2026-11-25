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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useSyncExternalStore } from "react";

// Shut until useRestoreLastTab has read the saved tab. The app always opens on Feed, so
// recording before then would overwrite the tab it is about to restore.
let isTrackingOpen = false;
const listeners = new Set<() => void>();

/** Lets screens record themselves as the last tab. Called once the restore is done. */
export const openTabTracking = () => {
  if (isTrackingOpen) return;
  isTrackingOpen = true;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getIsTrackingOpen = () => isTrackingOpen;

/** Records this tab as the one to reopen on the next launch while it is focused. */
export const useTrackActiveScreen = (pathname: ScreenPaths) => {
  const isOpen = useSyncExternalStore(subscribe, getIsTrackingOpen);

  useFocusEffect(
    useCallback(() => {
      if (!pathname || !isOpen) return;
      AsyncStorage.setItem(LAST_ACTIVE_PATH_KEY, pathname).catch((error) =>
        console.error("Failed to save the last tab:", error),
      );
    }, [pathname, isOpen]),
  );
};
