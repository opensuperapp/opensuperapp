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
import {
  GOOGLE_ACCESS_TOKEN_KEY,
  GOOGLE_USER_INFO_KEY,
  GOOGLE_USER_INFO_URL,
  GOOGLE_DRIVE_UPLOAD_URL,
  GOOGLE_DRIVE_LIST_FILES_URL,
  GOOGLE_DRIVE_FILE_DOWNLOAD_URL,
  GOOGLE_TOKEN_INFO_URL,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_TOKEN_URL,
  GOOGLE_REFRESH_TOKEN_KEY,
} from "@/constants/Constants";

import SecureStorage from "@/utils/secureStorage";
import { Platform } from "react-native";

/**
 * User info returned from Google API (loosely typed).
 */
interface GoogleUserInfo {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
  [key: string]: any;
}

/**
 * Refresh access token using stored refresh token.
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = await SecureStorage.getItem(GOOGLE_REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error("No refresh token found");

  const clientId = Platform.select({
    ios: GOOGLE_IOS_CLIENT_ID,
    android: GOOGLE_ANDROID_CLIENT_ID,
    default: GOOGLE_WEB_CLIENT_ID,
  });

  if (!clientId) throw new Error("Client ID not configured for this platform");

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  }).toString();

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to refresh token: ${errorText}`);
  }

  const data = await res.json();

  if (!data.access_token) {
    throw new Error("No access token returned from refresh");
  }

  await SecureStorage.setItem(GOOGLE_ACCESS_TOKEN_KEY, data.access_token);
  
  if (data.refresh_token) {
    await SecureStorage.setItem(GOOGLE_REFRESH_TOKEN_KEY, data.refresh_token);
  }

  return data.access_token;
}

/**
 * Helper to get a valid access token, refreshing if needed.
 */
async function getValidAccessToken(): Promise<string> {
  let accessToken = await SecureStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
  if (!accessToken) throw new Error("No access token found");

  // Validate token
  const tokenInfoRes = await fetch(GOOGLE_TOKEN_INFO_URL(accessToken));
  if (tokenInfoRes.ok) {
    const tokenInfo = await tokenInfoRes.json();
    if (tokenInfo.expires_in > 60) {
      // If token is valid for more than 60 seconds
      return accessToken;
    }
  }

  // Token expired or invalid, try refresh
  accessToken = await refreshAccessToken();
  return accessToken;
}

/**
 * Handles Google authentication and stores user info + token in SecureStorage.
 */
export default async function googleAuthenticationService(
  response: any
): Promise<{
  status: boolean;
  error: string;
  userInfo?: GoogleUserInfo;
}> {
  try {
    if (response?.type === "success" && response.authentication) {
      const { authentication } = response;

      // Save access token
      await SecureStorage.setItem(
        GOOGLE_ACCESS_TOKEN_KEY,
        authentication.accessToken
      );

      // Save refresh token if exists
      if (authentication.refreshToken) {
        await SecureStorage.setItem(
          GOOGLE_REFRESH_TOKEN_KEY,
          authentication.refreshToken
        );
      }

      // Fetch user info
      const userInfoResponse = await fetch(GOOGLE_USER_INFO_URL, {
        headers: { Authorization: `Bearer ${authentication.accessToken}` },
      });
      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        throw new Error(`Failed to fetch user info: ${errorText}`);
      }
      const userInfo: GoogleUserInfo = await userInfoResponse.json();

      // Save user info
      await SecureStorage.setItem(
        GOOGLE_USER_INFO_KEY,
        JSON.stringify(userInfo)
      );

      return { status: true, error: "", userInfo };
    }

    return { status: false, error: "Authentication failed" };
  } catch (error: unknown) {
    console.error("Google Authentication Error:", error);
    return {
      status: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
    };
  }
}

/**
 * Uploads backup JSON data to Google Drive's appDataFolder.
 * Refreshes access token if expired.
 */
export async function uploadToGoogleDrive(data: Record<string, unknown> = {}) {
  const accessToken = await getValidAccessToken();

  const boundary = "foo_bar_baz";
  const metadata = {
    name: "totp_backup.json",
    parents: ["appDataFolder"],
    mimeType: "application/json",
  };

  const fileData = {
    timestamp: new Date().toISOString(),
    data,
  };

  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    JSON.stringify(fileData),
    `--${boundary}--`,
  ].join("\r\n");

  const res = await fetch(GOOGLE_DRIVE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  const responseText = await res.text();

  if (!res.ok) {
    try {
      const jsonError = JSON.parse(responseText);
      throw new Error(jsonError.error?.message || "Upload failed");
    } catch {
      throw new Error(responseText);
    }
  }

  return JSON.parse(responseText);
}

/**
 * Restores the most recent backup file from Google Drive's appDataFolder.
 * Refreshes access token if expired.
 */
export async function restoreGoogleDriveBackup(): Promise<any> {
  const accessToken = await getValidAccessToken();

  const listRes = await fetch(GOOGLE_DRIVE_LIST_FILES_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!listRes.ok) {
    const errorText = await listRes.text();
    throw new Error(`Failed to fetch backup files: ${errorText}`);
  }

  const { files }: { files: { id: string; createdTime: string }[] } =
    await listRes.json();

  if (!files || files.length === 0) {
    throw new Error("No backup files found in Google Drive");
  }

  const latestFile = files.reduce((a, b) =>
    new Date(a.createdTime) > new Date(b.createdTime) ? a : b
  );

  const fileRes = await fetch(GOOGLE_DRIVE_FILE_DOWNLOAD_URL(latestFile.id), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!fileRes.ok) {
    const errorText = await fileRes.text();
    throw new Error(`Failed to download backup file: ${errorText}`);
  }

  try {
    const fileContent = await fileRes.json();
    return fileContent;
  } catch {
    throw new Error("Failed to parse backup content as JSON");
  }
}

/**
 * Lists all files in Google Drive's appDataFolder.
 * Refreshes access token if expired.
 */
export async function listAppDataFiles(): Promise<
  { id: string; name: string; createdTime: string }[]
> {
  const accessToken = await getValidAccessToken();

  const res = await fetch(GOOGLE_DRIVE_LIST_FILES_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to list files: ${errorText}`);
  }

  const { files } = await res.json();
  return files;
}

/**
 * Verifies if the stored access token is still valid.
 */
export async function isAuthenticatedWithGoogle(): Promise<boolean> {
  try {
    const accessToken = await SecureStorage.getItem(GOOGLE_ACCESS_TOKEN_KEY);
    if (!accessToken) return false;

    const response = await fetch(GOOGLE_TOKEN_INFO_URL(accessToken));

    if (response.ok) {
      const tokenInfo = await response.json();
      return tokenInfo.expires_in > 0;
    } else {
      // Try refresh token if invalid
      await refreshAccessToken();
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Clears Google-related session info from SecureStorage.
 */
export async function removeGoogleAuthState(): Promise<void> {
  try {
    await SecureStorage.removeItem(GOOGLE_ACCESS_TOKEN_KEY);
    await SecureStorage.removeItem(GOOGLE_USER_INFO_KEY);
    await SecureStorage.removeItem(GOOGLE_REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error("Failed to remove Google auth state:", error);
  }
}

/**
 * Retrieves stored Google user info from SecureStorage.
 */
export async function getGoogleUserInfo(): Promise<GoogleUserInfo> {
  try {
    const userInfo = await SecureStorage.getItem(GOOGLE_USER_INFO_KEY);
    if (userInfo) {
      return JSON.parse(userInfo);
    }
    throw new Error("No user info found");
  } catch (error) {
    console.error("Failed to get Google user info:", error);
    throw error;
  }
}
