// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
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
import { MessageStatus } from "@/constants/enums/Chat";
import {
  isTokenExpired,
  loadAuthData,
  logout,
  refreshAccessToken,
} from "@/services/authService";
import {
  ChatMessage,
  HistoryMessage,
  MAX_HISTORY_ITEM_LENGTH,
  MAX_HISTORY_LENGTH,
  MAX_MESSAGE_LENGTH,
  SendMessageParams,
} from "@/types/chat.types";

/**
 * Returns a valid (non-expired) access token, refreshing if necessary.
 *
 * @returns {Promise<string | null>} Access token or null when unauthenticated.
 */
const getValidAccessToken = async (): Promise<string | null> => {
  const authData = await loadAuthData();

  if (!authData?.accessToken) {
    return null;
  }

  if (isTokenExpired(authData.accessToken)) {
    const refreshed = await Promise.race([
      refreshAccessToken(logout),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 10_000);
      }),
    ]);
    return refreshed?.accessToken ?? null;
  }

  return authData.accessToken;
};

/**
 * Builds the history payload for the chat-agent API from stored messages.
 *
 * @param {ChatMessage[]} messages - All messages in the current session.
 * @returns {HistoryMessage[]} Truncated history for the API request.
 */
export const buildHistoryPayload = (
  messages: ChatMessage[]
): HistoryMessage[] => {
  const completed = messages.filter(
    (m) => m.status === MessageStatus.Sent && m.content.trim().length > 0
  );

  const recent = completed.slice(-MAX_HISTORY_LENGTH);

  return recent.map((m) => ({
    role: m.role,
    content: m.content.slice(0, MAX_HISTORY_ITEM_LENGTH),
  }));
};

/**
 * Sends a chat message to the chat-agent service.
 *
 * @param {SendMessageParams} params - Message, history, and abort signal.
 * @returns {Promise<string>} The assistant reply text.
 */
export const sendChatMessage = async ({
  message,
  history,
  signal,
}: SendMessageParams): Promise<string> => {
  if (!CHAT_AGENT_URL) {
    throw new Error("Chat agent URL is not configured");
  }

  const token = await getValidAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error("Message cannot be empty.");
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message exceeds ${MAX_MESSAGE_LENGTH} characters.`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort);

  try {
    const response = await fetch(`${CHAT_AGENT_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-user-assertion": token,
      },
      body: JSON.stringify({ message: trimmed, history }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.status}`);
    }

    const data = await response.json();

    if (typeof data?.reply !== "string") {
      throw new Error("Invalid response from chat agent");
    }

    return data.reply;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onExternalAbort);
  }
};
