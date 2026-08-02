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
import { setAuth } from "@/context/slices/authSlice";
import { AppDispatch } from "@/context/store";
import {
  getAuthSessionGeneration,
  refreshAccessToken,
} from "@/services/authService";
import { loadAuthDataFromSecureStore } from "@/utils/authTokenStore";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useDispatch } from "react-redux";
import { jwtDecode } from "jwt-decode";
import dayjs from "dayjs";

/**
 * Proactively refreshes the access token when the app transitions from the
 * background/inactive state back to the foreground. This prevents requests
 * from failing with an expired token (or triggering a force logout) when the
 * token expires while the app is backgrounded.
 *
 * @param enabled - When false, the listener is not registered (e.g. until app
 * initialization has completed).
 * @param onLogout - The logout function to pass to the refresh for handling auth errors.
 */
export const useRefreshTokenOnForeground = ({
  enabled,
  onLogout,
}: {
  enabled: boolean;
  onLogout: () => Promise<void>;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const appState = useRef(AppState.currentState);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  useEffect(() => {
    if (!enabled) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        const refreshIfExpired = async () => {
          try {
            const storedData = await loadAuthDataFromSecureStore();
            if (!storedData?.accessToken) return;

            if (!isAccessTokenExpired(storedData.accessToken)) return;

            const generation = getAuthSessionGeneration();
            const newAuthData = await refreshAccessToken(onLogoutRef.current);
            if (
              newAuthData &&
              getAuthSessionGeneration() === generation
            ) {
              dispatch(setAuth(newAuthData));
            }
          } catch (error) {
            console.error(
              "Error refreshing token on app foreground:",
              error instanceof Error ? error.message : error
            );
          }
        };

        refreshIfExpired();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [dispatch, enabled]);
};

// Helper function to check if the token is expired
const isAccessTokenExpired = (accessToken: string): boolean => {
  try {
    const decoded = jwtDecode<{ exp?: unknown }>(accessToken);
    const exp = decoded.exp;
    if (typeof exp !== "number" || !Number.isFinite(exp)) return true;
    return dayjs.unix(exp).isBefore(dayjs());
  } catch {
    return true; // Assume expired if decoding fails
  }
};
