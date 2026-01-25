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
  ACCESS_TOKEN,
  AUTH_EMAIL_KEY,
  EXPIRES_AT_KEY,
  ID_TOKEN,
  REFRESH_TOKEN,
  USER_ID_KEY,
} from "@/constants/Constants";
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";

export type SecureAuthData = {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  email?: string;
  userId?: string;
  expiresAt: number;
};

export async function saveAuthDataToSecureStore(authData: SecureAuthData) {
  await Promise.all([
    setItemAsync(ACCESS_TOKEN, authData.accessToken),
    setItemAsync(REFRESH_TOKEN, authData.refreshToken),
    setItemAsync(ID_TOKEN, authData.idToken),
    setItemAsync(EXPIRES_AT_KEY, String(authData.expiresAt)),
    authData.userId
      ? setItemAsync(USER_ID_KEY, authData.userId)
      : deleteItemAsync(USER_ID_KEY),
  ]);
}

export async function loadAuthDataFromSecureStore(): Promise<SecureAuthData | null> {
  const [accessToken, refreshToken, idToken, expiresAtStr, email, userId] =
    await Promise.all([
      getItemAsync(ACCESS_TOKEN),
      getItemAsync(REFRESH_TOKEN),
      getItemAsync(ID_TOKEN),
      getItemAsync(EXPIRES_AT_KEY),
      getItemAsync(AUTH_EMAIL_KEY),
      getItemAsync(USER_ID_KEY),
    ]);

  if (!accessToken || !refreshToken || !idToken || !expiresAtStr || !userId)
    return null;

  return {
    accessToken,
    refreshToken,
    idToken,
    email: email || undefined,
    userId,
    expiresAt: Number(expiresAtStr),
  };
}

export async function clearAuthDataFromSecureStore() {
  await Promise.all([
    deleteItemAsync(ACCESS_TOKEN),
    deleteItemAsync(REFRESH_TOKEN),
    deleteItemAsync(ID_TOKEN),
    deleteItemAsync(EXPIRES_AT_KEY),
    deleteItemAsync(AUTH_EMAIL_KEY),
    deleteItemAsync(USER_ID_KEY),
  ]);
}
