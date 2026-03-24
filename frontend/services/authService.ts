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
  CLIENT_ID,
  LOGOUT_URL,
  REDIRECT_URI,
  SUCCESS,
  TOKEN_URL,
  USER_INFO,
} from "@/constants/Constants";
import {
  updateExchangedIdToken,
  updateExchangedToken,
} from "@/context/slices/appSlice";
import { AppDispatch } from "@/context/store";
import { AppScope } from "@/types/appConfig.types";
import createAuthRequestBody from "@/utils/authBody";
import {
  clearAuthDataFromSecureStore,
  loadAuthDataFromSecureStore,
  saveAuthDataToSecureStore,
  SecureAuthData,
} from "@/utils/authTokenStore";
import { clearAllExchangedTokens } from "@/utils/exchangedTokenStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";
import { Alert } from "react-native";
import { logout as appLogout, AuthorizeResult } from "react-native-app-auth";

const GRANT_TYPE_AUTHORIZATION_CODE = "authorization_code";
const GRANT_TYPE_REFRESH_TOKEN = "refresh_token";
const GRANT_TYPE_TOKEN_EXCHANGE =
  "urn:ietf:params:oauth:grant-type:token-exchange";
const SUBJECT_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:jwt";
const REQUESTED_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:access_token";
const MILLISECONDS_IN_A_SECOND = 1000;
const SCOPE = "openid email groups profile";
let refreshPromise: Promise<AuthData | null> | null = null;

export interface DecodedIdToken {
  email?: string;
  userid?: string;
}

export interface AuthData {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  email?: string;
  userId?: string;
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
        const decodedIdToken = jwtDecode<DecodedIdToken>(data.id_token);
        const { email, userid: userId } = decodedIdToken;
        const exp = jwtDecode(data.access_token).exp || 0;

        const authData: AuthData = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          idToken: data.id_token,
          email,
          userId,
          expiresAt: exp * MILLISECONDS_IN_A_SECOND,
        };

        await saveAuthDataToSecureStore(authData as SecureAuthData); // Persist data
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
      const storedData = await loadAuthDataFromSecureStore();
      if (!storedData) {
        refreshPromise = null;
        return null;
      }

      const authData: AuthData = storedData;
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

        refreshPromise = null;
        return updatedAuthData;
      }

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
    const secureData = await loadAuthDataFromSecureStore();
    if (!secureData) {
      console.error("No stored authentication data found.");
      return;
    }
    const idToken = secureData?.idToken;
    const appsJson = await AsyncStorage.getItem(APPS); // capture appIds BEFORE clearing APPS
    const appIds = appsJson
      ? (JSON.parse(appsJson) as { appId: string }[]).map((a) => a.appId)
      : [];

    if (!LOGOUT_URL) {
      throw new Error(
        "LOGOUT_URL is not defined. Check your environment variables."
      );
    }

    // If idToken is missing, proceed with local logout
    if (!idToken) {
      console.warn("No idToken found. Performing local logout only.");
      await clearSessionData(appIds);
      return;
    }

    // Perform logout request
    await appLogout(AUTH_CONFIG, {
      idToken,
      postLogoutRedirectUrl: REDIRECT_URI,
    });
    await clearSessionData(appIds);
  } catch (error) {
    console.error("Error logging out from Asgardeo:", error);
    Alert.alert(
      "Error Logging Out",
      "We could not log you out from Asgardeo at this moment. Please try again later."
    );
    throw error;
  }
};

const clearSessionData = async (appIds: string[]) => {
  await clearAllExchangedTokens(appIds);
  await clearAuthDataFromSecureStore();
  await AsyncStorage.removeItem(APPS);
  await AsyncStorage.removeItem(USER_INFO);
};

// Restore auth data form secure storage
export const loadAuthData = async (): Promise<AuthData | null> => {
  const secureData = await loadAuthDataFromSecureStore();
  return secureData ? (secureData as AuthData) : null;
};

export type TokenExchangeResult = {
  accessToken?: string;
  idToken?: string;
};

// token exchange
export const tokenExchange = async (
  dispatch: AppDispatch,
  clientId: string,
  exchangedToken: string,
  exchangedIdToken: string,
  appId: string,
  onLogout: () => Promise<void>,
  appScopes?: AppScope[]
): Promise<TokenExchangeResult | null> => {
  try {
    // Find and append app specific scopes if available
    const appScope = appScopes?.find((scope) => scope.appId === appId);
    const selectedScopes = appScope ? `${SCOPE} ${appScope.scopes}` : SCOPE;

    if (!clientId || clientId === "CLIENT_ID") return null;

    // Use existing exchanged tokens if they're still valid
    if (
      exchangedToken &&
      !isTokenExpired(exchangedToken) &&
      exchangedIdToken &&
      !isTokenExpired(exchangedIdToken)
    ) {
      return { accessToken: exchangedToken, idToken: exchangedIdToken };
    }

    // Retrieve stored authentication data
    const secureData = await loadAuthDataFromSecureStore();
    if (!secureData?.accessToken) {
      console.error("No stored authentication data found.");
      return null;
    }

    let accessToken = secureData.accessToken;
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
    if (isTokenExpired(accessToken)) {
      const newAuthData = await refreshAccessToken(onLogout);
      if (!newAuthData?.accessToken) {
        return null; // Logout is triggered inside refreshAccessToken
      }
      accessToken = newAuthData.accessToken;
    }

    // Function to attempt token exchange, with retry on 401 error
    const attemptTokenExchange = async (token: string) => {
      try {
        console.log(
          "[AUTH_SERV][attemptTokenExchange] Creating auth request body",
          JSON.stringify({
            clientId,
            grantType: GRANT_TYPE_TOKEN_EXCHANGE,
            subjectToken: token,
            subjectTokenType: SUBJECT_TOKEN_TYPE,
            requestedTokenType: REQUESTED_TOKEN_TYPE,
            scope: selectedScopes,
          })
        );
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

        console.log("[AUTH_SERV][attemptTokenExchange] Response", response);

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
    console.log("[AUTH_SERV][tokenExchange] Data", data);

    if (!data?.access_token) {
      console.error("Token exchange response does not contain access_token.");
      return null;
    }

    dispatch(
      updateExchangedToken({ appId, exchangedToken: data.access_token })
    );

    if (data.id_token) {
      dispatch(
        updateExchangedIdToken({ appId, exchangedIdToken: data.id_token })
      );
    }

    return { accessToken: data.access_token, idToken: data.id_token };
  } catch (error) {
    console.error("Error during token exchange:", error);
    return null;
  }
};

// Helper function to check if the token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    return dayjs.unix(decoded.exp).isBefore(dayjs());
  } catch {
    return true;
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
      const { email, userid: userId } = decodedIdToken;

      const authData: AuthData = {
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        idToken: authResult.idToken,
        email: email,
        userId,
        expiresAt: exp * MILLISECONDS_IN_A_SECOND,
      };

      await saveAuthDataToSecureStore(authData as SecureAuthData);
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
