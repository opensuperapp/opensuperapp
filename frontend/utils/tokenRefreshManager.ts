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
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { AppState, AppStateStatus } from "react-native";
import { ScreenPaths } from "../constants/ScreenPaths";
import { refreshAccessToken } from "../services/authService";
import {
  resetAlertState,
  showLogoutConfirmation,
  showRefreshRetryDialog,
} from "./authAlerts";
import { loadAuthDataFromSecureStore } from "./authTokenStore";
import { performLogout } from "./performLogout";

const REFRESH_THRESHOLD_PERCENT = 0.8;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 500;
const RETRY_MULTIPLIER = 2;
const FOREGROUND_COOLDOWN = 30000;
const PERIODIC_CHECK_INTERVAL = 40000;
const DEFAULT_TOKEN_LIFETIME = 60 * 60 * 1000;

let refreshPromise: Promise<boolean> | null = null;
let lastForegroundRefresh = 0;
let periodicCheckTimer: NodeJS.Timeout | null = null;
let appStateSubscription: { remove: () => void } | null = null;

function getRetryDelay(attempt: number): number {
  const baseDelay = BASE_RETRY_DELAY * Math.pow(RETRY_MULTIPLIER, attempt - 1);
  const jitter = Math.random() * 100;
  return baseDelay + jitter;
}

function getTokenLifetimeFromJWT(accessToken: string): number {
  try {
    const decoded = jwtDecode<{ iat?: number; exp?: number }>(accessToken);
    if (decoded.iat && decoded.exp) {
      return (decoded.exp - decoded.iat) * 1000;
    }
  } catch {}
  return DEFAULT_TOKEN_LIFETIME;
}

export async function shouldRefreshToken(): Promise<boolean> {
  const authData = await loadAuthDataFromSecureStore();
  if (!authData?.accessToken || !authData.expiresAt) {
    return false;
  }

  const now = Date.now();
  const timeUntilExpiry = authData.expiresAt - now;
  const tokenLifetime = getTokenLifetimeFromJWT(authData.accessToken);
  const threshold = tokenLifetime * (1 - REFRESH_THRESHOLD_PERCENT);

  const needsRefresh = timeUntilExpiry <= threshold;
  return needsRefresh;
}

async function performRefreshWithRetry(attempt: number = 1): Promise<boolean> {
  try {
    const onLogout = async () => {
      await showLogoutConfirmation(
        "Session Expired",
        "Your session has expired. Would you like to sign in again?",
        async () => {
          await performLogout();
          router.navigate(ScreenPaths.PROFILE);
        }
      );
    };

    const newAuthData = await refreshAccessToken(onLogout);

    if (newAuthData?.accessToken) {
      resetAlertState();
      return true;
    }

    if (attempt < MAX_RETRIES) {
      const delay = getRetryDelay(attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return performRefreshWithRetry(attempt + 1);
    }

    await showRefreshRetryDialog(
      "Session Refresh Failed",
      "Could not refresh your session. Would you like to try again or sign in?",
      async () => {
        resetAlertState();
        await performRefreshWithRetry(1);
      },
      async () => {
        await performLogout();
        router.navigate(ScreenPaths.PROFILE);
      }
    );
    return false;
  } catch (error) {
    if (attempt < MAX_RETRIES && isNetworkError(error)) {
      const delay = getRetryDelay(attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return performRefreshWithRetry(attempt + 1);
    }

    return false;
  }
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes("Network request failed") ||
      error.message.includes("timeout") ||
      error.message.includes("ETIMEDOUT")
    );
  }
  return false;
}

export async function checkAndRefreshTokenIfNeeded(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const shouldRefresh = await shouldRefreshToken();
    if (!shouldRefresh) {
      refreshPromise = null;
      return true;
    }

    const success = await performRefreshWithRetry();
    refreshPromise = null;
    return success;
  })();

  return refreshPromise;
}

function handleAppStateChange(nextAppState: AppStateStatus) {
  if (nextAppState === "active") {
    const now = Date.now();
    const cooldownElapsed = now - lastForegroundRefresh >= FOREGROUND_COOLDOWN;

    if (cooldownElapsed) {
      lastForegroundRefresh = now;
      checkAndRefreshTokenIfNeeded();
    }
  }
}

export function startTokenRefreshManager() {
  appStateSubscription = AppState.addEventListener(
    "change",
    handleAppStateChange
  );

  periodicCheckTimer = setInterval(() => {
    checkAndRefreshTokenIfNeeded();
  }, PERIODIC_CHECK_INTERVAL);

  checkAndRefreshTokenIfNeeded();
}

export function stopTokenRefreshManager() {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }

  if (periodicCheckTimer) {
    clearInterval(periodicCheckTimer);
    periodicCheckTimer = null;
  }

  refreshPromise = null;
  resetAlertState();
}
