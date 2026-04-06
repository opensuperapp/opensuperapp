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

import { useCallback, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { checkAndRefreshTokenIfNeeded } from "@/utils/tokenRefreshManager";
import useNetworkQuality from "./useNetworkQuality";

const DEBOUNCE_DELAY = 500;

export default function useDebouncedTokenRefresh() {
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);

  const networkQuality = useNetworkQuality();

  const debouncedRefresh = useCallback(() => {
    if (networkQuality === "offline") {
      return;
    }

    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;

    if (timeSinceLastRefresh < DEBOUNCE_DELAY) {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        lastRefreshTimeRef.current = Date.now();
        checkAndRefreshTokenIfNeeded();
        refreshTimeoutRef.current = null;
      }, DEBOUNCE_DELAY - timeSinceLastRefresh);
    } else {
      lastRefreshTimeRef.current = now;
      checkAndRefreshTokenIfNeeded();
    }
  }, [networkQuality]);

  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (nextAppState === "active") {
      debouncedRefresh();
    }
  }, [debouncedRefresh]);

  const startDebouncedRefresh = useCallback(() => {
    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      subscription.remove();
    };
  }, [handleAppStateChange]);

  return {
    startDebouncedRefresh,
    debouncedRefresh,
  };
}
