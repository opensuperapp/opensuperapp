import { router } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { ScreenPaths } from '../constants/ScreenPaths';
import { refreshAccessToken } from '../services/authService';
import { loadAuthDataFromSecureStore } from './authTokenStore';
import { performLogout } from './performLogout';

const REFRESH_THRESHOLD_PERCENT = 0.8;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 500;
const RETRY_MULTIPLIER = 2;
const FOREGROUND_COOLDOWN = 30000;
const PERIODIC_CHECK_INTERVAL = 300000;

let refreshPromise: Promise<boolean> | null = null;
let lastForegroundRefresh = 0;
let periodicCheckTimer: NodeJS.Timeout | null = null;
let appStateSubscription: { remove: () => void } | null = null;

function getRetryDelay(attempt: number): number {
  const baseDelay = BASE_RETRY_DELAY * Math.pow(RETRY_MULTIPLIER, attempt - 1);
  const jitter = Math.random() * 100;
  return baseDelay + jitter;
}

export async function shouldRefreshToken(): Promise<boolean> {
  const authData = await loadAuthDataFromSecureStore();
  if (!authData?.accessToken || !authData.expiresAt) {
    return false;
  }

  const now = Date.now();
  const timeUntilExpiry = authData.expiresAt - now;
  const tokenLifetime = 60 * 60 * 1000;
  const threshold = tokenLifetime * (1 - REFRESH_THRESHOLD_PERCENT);

  return timeUntilExpiry <= threshold;
}

export async function isRefreshTokenNearExpiry(): Promise<boolean> {
  const authData = await loadAuthDataFromSecureStore();
  if (!authData?.refreshToken) {
    return false;
  }

  try {
    const decoded = jwtDecode<{ exp: number }>(authData.refreshToken);
    const expiresAt = decoded.exp * 1000;
    const timeUntilExpiry = expiresAt - Date.now();
    const warningThreshold = 7 * 24 * 60 * 60 * 1000;

    return timeUntilExpiry <= warningThreshold;
  } catch {
    return false;
  }
}

async function performRefreshWithRetry(attempt: number = 1): Promise<boolean> {
  try {
    const isNearExpiry = await isRefreshTokenNearExpiry();
    if (isNearExpiry) {
      await Alert.alert(
        'Session Expiring Soon',
        'Your session will expire in less than 7 days. Please sign in again to continue.',
        [{ text: 'OK' }]
      );
    }

    const newAuthData = await refreshAccessToken(async () => {
      await Alert.alert(
        'Session Expired',
        'Your session has expired. Would you like to sign in again?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: async () => {
              await performLogout();
              router.navigate(ScreenPaths.FEED);
            }
          }
        ]
      );
    });

    if (newAuthData?.accessToken) {
      return true;
    }

    if (attempt < MAX_RETRIES) {
      const delay = getRetryDelay(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      return performRefreshWithRetry(attempt + 1);
    }

    return false;
  } catch (error) {
    if (attempt < MAX_RETRIES && isNetworkError(error)) {
      const delay = getRetryDelay(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      return performRefreshWithRetry(attempt + 1);
    }

    return false;
  }
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Network request failed') ||
           error.message.includes('timeout') ||
           error.message.includes('ETIMEDOUT');
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
  if (nextAppState === 'active') {
    const now = Date.now();
    const cooldownElapsed = (now - lastForegroundRefresh) >= FOREGROUND_COOLDOWN;

    if (cooldownElapsed) {
      lastForegroundRefresh = now;
      checkAndRefreshTokenIfNeeded();
    }
  }
}

export function startTokenRefreshManager() {
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

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
}
