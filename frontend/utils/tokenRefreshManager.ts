import { CLIENT_ID, TOKEN_URL } from "@/constants/Constants";
import createAuthRequestBody from "@/utils/authBody";
import { router } from "expo-router";
import { jwtDecode } from "jwt-decode";
import { AppState, AppStateStatus } from "react-native";
import { ScreenPaths } from "../constants/ScreenPaths";
import {
  resetAlertState,
  showLogoutConfirmation,
  showNetworkError,
  showRefreshRetryDialog,
} from "./authAlerts";
import {
  loadAuthDataFromSecureStore,
  saveAuthDataToSecureStore,
  SecureAuthData,
} from "./authTokenStore";
import { performLogout } from "./performLogout";
import { retryWithBackoff } from "./requestHandler";

const REFRESH_THRESHOLD_PERCENT = 0.8;

// Calculates check intervals as 6.25% (1/16th) of the refresh window
const CHECK_INTERVAL_PERCENT = 0.0625;

const DEFAULT_TOKEN_LIFETIME = 60 * 60 * 1000;

let refreshPromise: Promise<boolean> | null = null;
let lastForegroundRefresh = 0;
let periodicCheckTimer: NodeJS.Timeout | null = null;
let appStateSubscription: { remove: () => void } | null = null;

function getTokenLifetimeFromJWT(accessToken: string): number {
  try {
    const decoded = jwtDecode<{ iat?: number; exp?: number }>(accessToken);
    if (decoded.iat && decoded.exp) {
      return (decoded.exp - decoded.iat) * 1000;
    }
  } catch {}
  return DEFAULT_TOKEN_LIFETIME;
}

async function getCheckIntervals(): Promise<{
  foregroundCooldown: number;
  periodicCheckInterval: number;
}> {
  const authData = await loadAuthDataFromSecureStore();
  let tokenLifetime = DEFAULT_TOKEN_LIFETIME;

  if (authData?.accessToken) {
    tokenLifetime = getTokenLifetimeFromJWT(authData.accessToken);
  }

  const refreshWindow = tokenLifetime * (1 - REFRESH_THRESHOLD_PERCENT);
  const checkInterval = Math.floor(refreshWindow * CHECK_INTERVAL_PERCENT);

  return {
    foregroundCooldown: checkInterval,
    periodicCheckInterval: checkInterval,
  };
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

export interface AuthData {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  email?: string;
  userId?: string;
  expiresAt: number;
}

export interface DecodedIdToken {
  email?: string;
  userid?: string;
}

const MILLISECONDS_IN_A_SECOND = 1000;
const GRANT_TYPE_REFRESH_TOKEN = "refresh_token";

export async function performTokenRefresh(
  onLogout: () => Promise<void>
): Promise<AuthData | null> {
  try {
    const storedData = await loadAuthDataFromSecureStore();
    if (!storedData) {
      return null;
    }

    const authData: AuthData = storedData;
    if (!authData.refreshToken) {
      return null;
    }

    if (!TOKEN_URL) {
      console.error(
        "TOKEN_URL is not defined. Check your environment variables."
      );
      return null;
    }

    const requestBody = createAuthRequestBody({
      grantType: GRANT_TYPE_REFRESH_TOKEN,
      clientId: CLIENT_ID,
      refreshToken: authData.refreshToken,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: requestBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `Token refresh failed: ${response.status} ${response.statusText}`
      );
      if (response.status === 400) {
        await showLogoutConfirmation(
          "Session Expired",
          "Your session has expired. Would you like to sign in again?",
          async () => {
            await performLogout();
            router.navigate(ScreenPaths.PROFILE);
          }
        );
      }

      return null;
    }

    const data = await response.json();

    if (data.access_token && data.id_token) {
      const decodedIdToken = jwtDecode<DecodedIdToken>(data.id_token);
      const exp = jwtDecode<{ exp: number }>(data.access_token).exp || 0;
      const { email, userid: userId } = decodedIdToken;

      const updatedAuthData: AuthData = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || authData.refreshToken,
        idToken: data.id_token,
        email,
        userId,
        expiresAt: exp * MILLISECONDS_IN_A_SECOND,
      };

      await saveAuthDataToSecureStore(updatedAuthData as SecureAuthData);
      return updatedAuthData;
    }

    return null;
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        console.error("Token refresh timed out after 15 seconds");
        await showNetworkError(
          "Request timed out. Check your connection and try again."
        );
      } else if (
        err.message.includes("Network request failed") ||
        err.message.includes("timeout")
      ) {
        console.error("Token refresh error:", err.message);
        await showNetworkError("Check your connection and try again.");
      } else {
        console.error("Token refresh error:", err.message);
        await showRefreshRetryDialog(
          "Error",
          "An error occurred while refreshing your session. Would you like to try again or sign in?",
          async () => {
            await performTokenRefresh(onLogout);
          },
          async () => {
            await performLogout();
            router.navigate(ScreenPaths.PROFILE);
          }
        );
      }
    } else {
      console.error("An unexpected error occurred during token refresh.");
      await showRefreshRetryDialog(
        "Error",
        "An unexpected error occurred. Would you like to try again or sign in?",
        async () => {
          await performTokenRefresh(onLogout);
        },
        async () => {
          await performLogout();
          router.navigate(ScreenPaths.PROFILE);
        }
      );
    }

    return null;
  }
}

async function performRefreshWithRetry(): Promise<boolean> {
  const onLogout = async () => {
    await performLogout();
    router.navigate(ScreenPaths.PROFILE);
  };

  const newAuthData = await retryWithBackoff(
    async () => {
      const result = await performTokenRefresh(onLogout);
      if (!result?.accessToken) {
        throw new Error("Token refresh failed");
      }
      return result;
    },
    3,
    500,
    2,
    100
  );

  if (newAuthData?.accessToken) {
    resetAlertState();
    return true;
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

async function handleAppStateChange(nextAppState: AppStateStatus) {
  if (nextAppState === "active") {
    const now = Date.now();
    const { foregroundCooldown } = await getCheckIntervals();
    const cooldownElapsed = now - lastForegroundRefresh >= foregroundCooldown;

    if (cooldownElapsed) {
      lastForegroundRefresh = now;
      checkAndRefreshTokenIfNeeded();
    }
  }
}

export async function startTokenRefreshManager() {
  const { periodicCheckInterval } = await getCheckIntervals();

  appStateSubscription = AppState.addEventListener(
    "change",
    handleAppStateChange
  );

  periodicCheckTimer = setInterval(() => {
    checkAndRefreshTokenIfNeeded();
  }, periodicCheckInterval);

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
