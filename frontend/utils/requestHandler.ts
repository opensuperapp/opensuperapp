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
import { checkAndRefreshTokenIfNeeded } from "@/utils/tokenRefreshManager";
import { loadAuthDataFromSecureStore } from "@/utils/authTokenStore";
import { refreshAccessToken } from "@/services/authService";
import { addToQueue } from "@/utils/offlineQueue";
import axios, { AxiosRequestConfig } from "axios";

// General API request handler
export const apiRequest = async (
  config: AxiosRequestConfig,
  onLogout: () => Promise<void>
) => {
  let accessToken = await getAccessToken();

  if (!accessToken) return;

  await checkAndRefreshTokenIfNeeded();
  accessToken = await getAccessToken();

  // Set Authorization Header
  config.headers = {
    ...config.headers,
    Authorization: `Bearer ${accessToken}`,
  };

  if (__DEV__) {
    config.headers["x-jwt-assertion"] = accessToken;
  }

  try {
    return await axios(config); // Make the API request
  } catch (error: any) {
    if (error.response?.status === 401) {
      const newAuthData = await refreshAccessToken(onLogout);
      if (newAuthData?.accessToken) {
        // Retry the request with the new token
        config.headers.Authorization = `Bearer ${newAuthData.accessToken}`;
        if (__DEV__) {
          config.headers["x-jwt-assertion"] = newAuthData.accessToken;
        }

        try {
          return await axios(config);
        } catch (retryError: any) {
          // 401 after refresh: Likely another issue, not token expiration
          throw retryError;
        }
      }
    }

    // Add to offline queue for retryable network errors
    if (isRetryableError(error) && config.method && config.url) {
      await addToQueue({
        url: config.url,
        method: config.method,
        headers: config.headers as Record<string, string>,
        body: config.data ? JSON.stringify(config.data) : undefined,
      });
    }

    throw error;
  }
};

export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message.includes("Network request failed") ||
      error.message.includes("timeout") ||
      error.message.includes("ETIMEDOUT")
    );
  }
  return false;
};

// Exponential backoff retry helper
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 100,
  multiplier = 2,
  jitterMs = 0
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const delay = baseDelay * Math.pow(multiplier, attempt - 1);
      const jitter = jitterMs > 0 ? Math.random() * jitterMs : 0;
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
  throw new Error('Max retries exceeded');
}

// Helper function to get the stored access token
const getAccessToken = async (): Promise<string> => {
  const secureStore = await loadAuthDataFromSecureStore();
  if (!secureStore) return "";
  return secureStore?.accessToken || "";
};
