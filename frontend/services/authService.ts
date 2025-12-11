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
import { AUTH_CONFIG } from "@/config/authConfig";
import {
  APPS,
  AUTH_DATA,
  AUTHENTICATOR_APP_ID,
  BASE_URL,
  CLIENT_ID,
  LOGOUT_URL,
  REDIRECT_URI,
  SUCCESS,
  TOKEN_URL,
  USER_INFO,
  USE_BACKEND_TOKEN_EXCHANGE,
} from "@/constants/Constants";
import { updateExchangedToken } from "@/context/slices/appSlice";
import { AppDispatch } from "@/context/store";
import createAuthRequestBody from "@/utils/authBody";
import SecureStorage from "@/utils/secureStorage";
import axios from "axios";
import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";
import { Alert } from "react-native";
import { logout as appLogout, AuthorizeResult } from "react-native-app-auth";
import { recordAuthLogin, recordAuthTokenRefresh } from "@/telemetry/metrics";
const GRANT_TYPE_AUTHORIZATION_CODE = "authorization_code";
const GRANT_TYPE_REFRESH_TOKEN = "refresh_token";
const GRANT_TYPE_TOKEN_EXCHANGE =
  "urn:ietf:params:oauth:grant-type:token-exchange";
const SUBJECT_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:jwt";
const REQUESTED_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:access_token";
const MILLISECONDS_IN_A_SECOND = 1000;
const SCOPE = "openid email groups";

let refreshPromise: Promise<AuthData | null> | null = null;

export interface DecodedIdToken {
  email?: string;
}

export interface AuthData {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  email?: string;
  expiresAt: number;
}

export const getAccessToken = async (
  request: any,
  result: any,
  redirectUri: string
): Promise<AuthData | null> => {
  if (result?.type === SUCCESS && result.params?.code) {
    try {
      if (!TOKEN_URL) {
        throw new Error(
          "TOKEN_URL is not defined. Check your environment variables."
        );
      }

      const requestBody = createAuthRequestBody({
        grantType: GRANT_TYPE_AUTHORIZATION_CODE,
        code: result.params.code,
        redirectUri,
        clientId: CLIENT_ID,
        codeVerifier: request?.codeVerifier,
      });

      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: requestBody,
      });

      const data = await response.json();

      if (data.access_token && data.id_token) {
        const { email } = jwtDecode<DecodedIdToken>(data.id_token);
        const exp = jwtDecode(data.access_token).exp || 0;

        const authData: AuthData = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          idToken: data.id_token,
          email,
          expiresAt: exp * MILLISECONDS_IN_A_SECOND,
        };

        await SecureStorage.setItem(AUTH_DATA, JSON.stringify(authData)); // Persist data

        // Record login metric
        recordAuthLogin("asgardeo");
        return authData;
      }
    } catch (err) {
      console.error("Login error:", err);
      return null;
    }
  }
  return null;
};

export const refreshAccessToken = async (
  onLogout: () => Promise<void>
): Promise<AuthData | null> => {
  if (refreshPromise) {
    return refreshPromise; // If a refresh is already in progress, return the same promise
  }

  refreshPromise = (async () => {
    try {
      const storedData = await SecureStorage.getItem(AUTH_DATA);
      if (!storedData) {
        refreshPromise = null;
        return null;
      }

      const authData: AuthData = JSON.parse(storedData);
      if (!authData.refreshToken) {
        refreshPromise = null;
        return null;
      }

      if (!TOKEN_URL) {
        console.error(
          "TOKEN_URL is not defined. Check your environment variables."
        );
        refreshPromise = null;
        return null;
      }

      const requestBody = createAuthRequestBody({
        grantType: GRANT_TYPE_REFRESH_TOKEN,
        clientId: CLIENT_ID,
        refreshToken: authData.refreshToken,
      });

      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: requestBody,
      });

      if (!response.ok) {
        console.error(
          `Token refresh failed: ${response.status} ${response.statusText}`
        );
        if (response.status === 400) await onLogout();

        refreshPromise = null;
        return null;
      }

      const data = await response.json();

      if (data.access_token && data.id_token) {
        const decodedIdToken = jwtDecode<DecodedIdToken>(data.id_token);
        const exp = jwtDecode<{ exp: number }>(data.access_token).exp || 0;

        const updatedAuthData: AuthData = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || authData.refreshToken,
          idToken: data.id_token,
          email: decodedIdToken.email,
          expiresAt: exp * MILLISECONDS_IN_A_SECOND,
        };

        await SecureStorage.setItem(AUTH_DATA, JSON.stringify(updatedAuthData));

        // Record token refresh metric
        recordAuthTokenRefresh(true);

        refreshPromise = null;
        return updatedAuthData;
      }

      // Record failed token refresh
      recordAuthTokenRefresh(false);

      refreshPromise = null;
      return null;
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Token refresh error:", err.message);
        if (err.message.includes("Network request failed")) {
          Alert.alert("Network Error", "Check your connection and try again.");
        } else {
          await onLogout();
        }
      } else {
        console.error("An unexpected error occurred during token refresh.");
        await onLogout();
      }

      refreshPromise = null;
      return null;
    }
  })();

  return refreshPromise;
};

export const logout = async () => {
  try {
    // Retrieve stored authentication data
    const storedData = await SecureStorage.getItem(AUTH_DATA);
    if (!storedData) {
      console.error("No stored authentication data found.");
      return;
    }
    const { idToken } = JSON.parse(storedData) as { idToken?: string };

    if (!LOGOUT_URL) {
      throw new Error(
        "LOGOUT_URL is not defined. Check your environment variables."
      );
    }

    // If idToken is missing, proceed with local logout
    if (!idToken) {
      console.warn("No idToken found. Performing local logout only.");
      await SecureStorage.removeItem(AUTH_DATA);
      await SecureStorage.removeItem(APPS);
      await SecureStorage.removeItem(USER_INFO);
      return;
    }

    // Perform logout request
    await appLogout(AUTH_CONFIG, {
      idToken: idToken,
      postLogoutRedirectUrl: REDIRECT_URI,
    });

    await SecureStorage.removeItem(AUTH_DATA);
    await SecureStorage.removeItem(APPS);
    await SecureStorage.removeItem(USER_INFO);
  } catch (error) {
    console.error("Error logging out from Asgardeo:", error);
    Alert.alert(
      "Error Logging Out",
      "We could not log you out from Asgardeo at this moment. Please try again later."
    );
    throw error;
  }
};

// Restore auth data form secure storage
export const loadAuthData = async (): Promise<AuthData | null> => {
  const storedData = await SecureStorage.getItem(AUTH_DATA);
  return storedData ? JSON.parse(storedData) : null;
};

export const getBackendToken = async (
  microAppId: string,
  onLogout: () => Promise<void>
): Promise<string | null> => {
  try {
    const storedData = await SecureStorage.getItem(AUTH_DATA);
    if (!storedData) {
      console.error("No stored authentication data found.");
      return null;
    }

    let { accessToken } = JSON.parse(storedData) as { accessToken?: string };
    if (!accessToken) {
      console.error("No access token found in stored authentication data.");
      return null;
    }

    if (isAccessTokenExpired(accessToken)) {
      const newAuthData = await refreshAccessToken(onLogout);
      if (!newAuthData?.accessToken) {
        return null;
      }
      accessToken = newAuthData.accessToken;
    }

    const response = await axios.post(
      `${BASE_URL}/token/exchange`,
      {
        microapp_id: microAppId,
        scope: "backend_access",
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          // "x-jwt-assertion": accessToken, // for local development purposes
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 200 && response.data) {
      return response.data.access_token;
    } else {
      console.error(
        `Backend token request failed: ${response.status} - ${response.data}`
      );
      return null;
    }
  } catch (error: any) {
    console.error("Error fetching backend token:", error);
    if (error.response?.status === 401) {
      await onLogout();
    }
    return null;
  }
};

// token exchange
export const tokenExchange = async (
  dispatch: AppDispatch,
  clientId: string,
  exchangedToken: string,
  appId: string,
  onLogout: () => Promise<void>
) => {
  try {
    if (USE_BACKEND_TOKEN_EXCHANGE) {
      const backendToken = await getBackendToken(appId, onLogout);
      if (backendToken) {
        dispatch(updateExchangedToken({ appId, exchangedToken: backendToken }));
      }
      return backendToken;
    }

    if (!clientId || clientId === "CLIENT_ID") return null;

    // Use existing exchanged token if it's still valid
    if (exchangedToken && !isAccessTokenExpired(exchangedToken)) {
      return exchangedToken;
    }

    // Retrieve stored authentication data
    const storedData = await SecureStorage.getItem(AUTH_DATA);
    if (!storedData) {
      console.error("No stored authentication data found.");
      return null;
    }

    let { accessToken } = JSON.parse(storedData) as { accessToken?: string };
    if (!accessToken) {
      console.error("No access token found in stored authentication data.");
      return null;
    }

    if (!TOKEN_URL) {
      throw new Error(
        "TOKEN_URL is not defined. Check your environment variables."
      );
    }

    // Refresh access token if expired
    if (isAccessTokenExpired(accessToken)) {
      const newAuthData = await refreshAccessToken(onLogout);
      if (!newAuthData?.accessToken) {
        return; // Logout is triggered inside refreshAccessToken
      }
      accessToken = newAuthData.accessToken;
    }

    // Add internal_login scope for Authenticator micro app
    const selectedScopes =
      appId === AUTHENTICATOR_APP_ID ? `${SCOPE} internal_login` : SCOPE;

    // Function to attempt token exchange, with retry on 401 error
    const attemptTokenExchange = async (token: string) => {
      try {
        const response = await axios.post(
          TOKEN_URL,
          createAuthRequestBody({
            clientId,
            grantType: GRANT_TYPE_TOKEN_EXCHANGE,
            subjectToken: token,
            subjectTokenType: SUBJECT_TOKEN_TYPE,
            requestedTokenType: REQUESTED_TOKEN_TYPE,
            scope: selectedScopes,
          }),
          {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          }
        );

        if (response.status === 200) return response.data;

        if (response.status === 401) {
          console.warn(
            "Token exchange failed with 401. Attempting token refresh..."
          );
          const newAuthData = await refreshAccessToken(onLogout);

          if (!newAuthData?.accessToken) {
            return null; // Logout is triggered inside refreshAccessToken
          }

          return attemptTokenExchange(newAuthData.accessToken);
        } else {
          console.error(
            `Token exchange failed: ${response.status} - ${response.data}`
          );
          return null;
        }
      } catch (error: any) {
        console.error("Fetch error:", error);

        if (
          error.message === "Network Error" ||
          (error.isAxiosError && !error.response)
        ) {
          Alert.alert(
            "Network Error",
            "Please check your internet connection and try again."
          );
        } else {
          Alert.alert(
            "Error",
            "Authorization failed. Please restart the app and try again. If the issue persists, log in again and try once more."
          );
        }
      }
    };

    // Attempt token exchange
    const data = await attemptTokenExchange(accessToken);

    if (!data?.access_token) {
      console.error("Token exchange response does not contain access_token.");
      return null;
    }

    dispatch(
      updateExchangedToken({ appId, exchangedToken: data.access_token })
    );
    return data.access_token;
  } catch (error) {
    console.error("Error during token exchange:", error);
    return null;
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

/**
 * Check if token is expired or expiring soon (within 30 seconds)
 */
export const isTokenExpiringSoon = (token: string): boolean => {
  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    const now = Math.floor(Date.now() / 1000);
    const bufferTime = 60; // 60 seconds buffer
    return now >= decoded.exp - bufferTime;
  } catch {
    return true; // Assume expired if decoding fails
  }
};

/**
 * Process authentication data from react-native-app-auth
 */
export const processNativeAuthResult = async (
  authResult: AuthorizeResult
): Promise<AuthData | null> => {
  try {
    if (authResult.accessToken && authResult.idToken) {
      const decodedIdToken = jwtDecode<DecodedIdToken>(authResult.idToken);
      const exp = jwtDecode<{ exp: number }>(authResult.accessToken).exp || 0;
      const { email } = decodedIdToken;

      const authData: AuthData = {
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        idToken: authResult.idToken,
        email: email,
        expiresAt: exp * MILLISECONDS_IN_A_SECOND,
      };

      await SecureStorage.setItem(AUTH_DATA, JSON.stringify(authData));
      return authData;
    } else {
      console.error("Missing required tokens in auth result");
      return null;
    }
  } catch (err) {
    console.error("Error processing native auth result:", err);
    return null;
  }
};
