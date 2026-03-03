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

import { CHAT_AGENT_URL } from "@/constants/Constants";
import {
  loadAuthData,
  refreshAccessToken,
  logout,
  isTokenExpired,
} from "@/services/authService";

/**
 * Returns a valid (non-expired) access token, refreshing if necessary.
 */
const getValidAccessToken = async (): Promise<string | null> => {
  const authData = await loadAuthData();

  if (!authData?.accessToken) return null;

  // Refresh if the token is expired (or about to expire)
  if (isTokenExpired(authData.accessToken)) {
    const refreshed = await refreshAccessToken(logout);
    return refreshed?.accessToken ?? null;
  }

  return authData.accessToken;
};

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/**
 * Send a chat message to the AI agent backend.
 * Automatically refreshes the access token if expired.
 */
export const sendChatMessage = async (message: string): Promise<string> => {
  const token = await getValidAccessToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${CHAT_AGENT_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.reply;
};
