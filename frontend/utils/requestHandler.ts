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
import { refreshAccessToken } from "@/services/authService";
import { loadAuthDataFromSecureStore } from "@/utils/authTokenStore";
import axios, { AxiosRequestConfig } from "axios";
import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";

// General API request handler
export const apiRequest = async (
  config: AxiosRequestConfig,
  onLogout: () => Promise<void>
) => {
  let accessToken = await getAccessToken(); // Get stored access token

  // If no access token, return early
  if (!accessToken) return;

  // Check if token is expired before making request
  if (isAccessTokenExpired(accessToken)) {
    const newAuthData = await refreshAccessToken(onLogout);

    if (!newAuthData?.accessToken) {
      return; // Logout is triggered inside refreshAccessToken
    }
    accessToken = newAuthData.accessToken;
  }

  // Set Authorization Header
  config.headers = {
    ...config.headers,
    Authorization: `Bearer ${accessToken}`,
  };

  try {
    return await axios(config); // Make the API request
  } catch (error: any) {
    if (error.response?.status === 401) {
      const newAuthData = await refreshAccessToken(onLogout);
      if (newAuthData?.accessToken) {
        // Retry the request with the new token
        config.headers.Authorization = `Bearer ${newAuthData.accessToken}`;

        try {
          return await axios(config);
        } catch (retryError: any) {
          // 401 after refresh: Likely another issue, not token expiration
          throw retryError;
        }
      }
    }

    throw error;
  }
};

// Helper function to check if the token is expired
const isAccessTokenExpired = (accessToken: string): boolean => {
  try {
    const decoded = jwtDecode<{ exp: number }>(accessToken);
    return dayjs.unix(decoded.exp).isBefore(dayjs());
  } catch {
    return true; // Assume expired if decoding fails
  }
};

// Helper function to get the stored access token
const getAccessToken = async (): Promise<string> => {
  const secureStore = await loadAuthDataFromSecureStore();
  if (!secureStore) return "";
  return secureStore?.accessToken || "";
};
