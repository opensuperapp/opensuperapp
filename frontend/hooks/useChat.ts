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
  deriveSessionTitle,
  insertMessage,
  listMessages,
  truncateMessagesFrom,
  updateMessage,
  updateSessionTitle,
} from "@/services/chatDatabase";
import { ChatRole, MessageStatus } from "@/constants/enums/Chat";
import { buildHistoryPayload, sendChatMessage } from "@/services/chatService";
import { ChatMessage } from "@/types/chat.types";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Manages messages and agent interactions for a single chat session.
 *
 * @param {string | null} sessionId - Active session id.
 * @returns Message state and send/stop/retry/edit handlers.
 */
export const useChat = (sessionId: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadMessages = useCallback(async () => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    const loaded = await listMessages(sessionId);
    setMessages(loaded);
  }, [sessionId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
  }, []);

  const runAgentTurn = useCallback(
    async (userContent: string, priorMessages: ChatMessage[]) => {
      if (!sessionId) {
        return;
      }

      setError(null);
      setIsGenerating(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const userMessage = await insertMessage({
        sessionId,
        role: ChatRole.User,
        content: userContent,
        status: MessageStatus.Sent,
      });

      const isFirstUserMessage =
        priorMessages.filter((m) => m.role === ChatRole.User).length === 0;
      if (isFirstUserMessage) {
        await updateSessionTitle(sessionId, deriveSessionTitle(userContent));
      }

      const assistantMessage = await insertMessage({
        sessionId,
        role: ChatRole.Assistant,
        content: "",
        status: MessageStatus.Streaming,
      });

      const withUser = [...priorMessages, userMessage];
      setMessages([...withUser, assistantMessage]);

      try {
        const history = buildHistoryPayload(priorMessages);
        const reply = await sendChatMessage({
          message: userContent,
          history,
          signal: controller.signal,
        });

        await updateMessage(assistantMessage.id, {
          content: reply,
          status: MessageStatus.Sent,
        });

        setMessages(await listMessages(sessionId));
      } catch (err) {
        if (axios.isCancel(err)) {
          await updateMessage(assistantMessage.id, {
            content: "Generation stopped.",
            status: MessageStatus.Stopped,
          });
        } else {
          const detail =
            err instanceof Error ? err.message : "Failed to get a response.";
          setError(detail);
          await updateMessage(assistantMessage.id, {
            content: detail,
            status: MessageStatus.Error,
          });
        }
        setMessages(await listMessages(sessionId));
      } finally {
        abortRef.current = null;
        setIsGenerating(false);
      }
    },
    [sessionId]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isGenerating || !sessionId) {
        return;
      }
      await runAgentTurn(trimmed, messages);
    },
    [isGenerating, sessionId, messages, runAgentTurn]
  );

  const retryMessage = useCallback(
    async (messageId: string) => {
      if (isGenerating || !sessionId) {
        return;
      }

      const target = messages.find((m) => m.id === messageId);
      if (!target || target.role !== ChatRole.User) {
        return;
      }

      await truncateMessagesFrom(sessionId, messageId);
      const prior = messages.filter(
        (m) =>
          m.createdAt < target.createdAt && m.status === MessageStatus.Sent
      );
      setMessages(prior);
      await runAgentTurn(target.content, prior);
    },
    [isGenerating, sessionId, messages, runAgentTurn]
  );

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      const trimmed = newContent.trim();
      if (!trimmed || isGenerating || !sessionId) {
        return;
      }

      const target = messages.find((m) => m.id === messageId);
      if (!target || target.role !== ChatRole.User) {
        return;
      }

      await truncateMessagesFrom(sessionId, messageId);
      const prior = messages.filter((m) => m.createdAt < target.createdAt);
      setMessages(prior);
      await runAgentTurn(trimmed, prior);
    },
    [isGenerating, sessionId, messages, runAgentTurn]
  );

  return {
    messages,
    isGenerating,
    error,
    sendMessage,
    stopGeneration,
    retryMessage,
    editMessage,
    refreshMessages: loadMessages,
  };
};
