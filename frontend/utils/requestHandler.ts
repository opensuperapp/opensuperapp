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
import { AUTH_DATA } from "@/constants/Constants";
import { refreshAccessToken } from "@/services/authService";
import axios, { AxiosRequestConfig } from "axios";
import { jwtDecode } from "jwt-decode";
import dayjs from "dayjs";
import * as secureStorage from "@/utils/secureStorage";
import {
  recordApiRequest,
  recordApiRequestDuration,
  recordApiRequestError,
} from "@/telemetry/metrics";

// Helper to record all API metrics in one place
const recordApiMetrics = (
  method: string,
  endpoint: string,
  duration: number,
  statusCode?: number,
  isError: boolean = false
) => {
  if (isError && statusCode) {
    recordApiRequestError(method, endpoint, statusCode);
  } else if (statusCode) {
    recordApiRequest(method, endpoint, statusCode);
  }
  recordApiRequestDuration(duration, method, endpoint);
};

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
    // "x-jwt-assertion": `${accessToken}`,
  };

  const method = config.method?.toUpperCase() || "GET";
  const url = config.url || "";
  const endpoint = url.replace(config.baseURL || "", "") || url;
  const startTime = Date.now();

  try {
    const response = await axios(config); // Make the API request
    recordApiMetrics(method, endpoint, Date.now() - startTime, response.status);
    return response;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const statusCode = error.response?.status;

    if (error.response?.status === 401) {
      const newAuthData = await refreshAccessToken(onLogout);
      if (newAuthData?.accessToken) {
        // Retry the request with the new token
        config.headers.Authorization = `Bearer ${newAuthData.accessToken}`;
        const retryStartTime = Date.now();

        try {
          const retryResponse = await axios(config);
          recordApiMetrics(
            method,
            endpoint,
            Date.now() - retryStartTime,
            retryResponse.status
          );
          return retryResponse;
        } catch (retryError: any) {
          recordApiMetrics(
            method,
            endpoint,
            Date.now() - retryStartTime,
            retryError.response?.status,
            true
          );
          // 401 after refresh: Likely another issue, not token expiration
          throw retryError;
        }
      }
    }

    recordApiMetrics(method, endpoint, duration, statusCode, true);
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
export const getAccessToken = async (): Promise<string> => {
  const storedData = await secureStorage.getItem(AUTH_DATA);
  if (!storedData) return "";
  return JSON.parse(storedData)?.accessToken || "";
};
