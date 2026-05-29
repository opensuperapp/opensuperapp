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
import { ChatRole, MessageStatus } from "@/constants/enums/Chat";
import {
  chatDatabase,
  deriveSessionTitle,
} from "@/services/chatDatabase";
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

    try {
      const loaded = await chatDatabase.listMessages(sessionId);
      setMessages(loaded);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load messages"
      );
      setMessages([]);
    }
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

      let userMessage: ChatMessage;
      let assistantMessage: ChatMessage;

      try {
        userMessage = await chatDatabase.insertMessage({
          sessionId,
          role: ChatRole.User,
          content: userContent,
          status: MessageStatus.Sent,
        });

        const isFirstUserMessage =
          priorMessages.filter((m) => m.role === ChatRole.User).length === 0;
        if (isFirstUserMessage) {
          await chatDatabase.updateSessionTitle(
            sessionId,
            deriveSessionTitle(userContent)
          );
        }

        assistantMessage = await chatDatabase.insertMessage({
          sessionId,
          role: ChatRole.Assistant,
          content: "",
          status: MessageStatus.Streaming,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save message";
        setError(message);
        setIsGenerating(false);
        abortRef.current = null;
        return;
      }

      const withUser = [...priorMessages, userMessage];
      setMessages([...withUser, assistantMessage]);

      try {
        const history = buildHistoryPayload(priorMessages);
        const reply = await sendChatMessage({
          message: userContent,
          history,
          signal: controller.signal,
        });

        await chatDatabase.updateMessage(assistantMessage.id, {
          content: reply,
          status: MessageStatus.Sent,
        });

        setMessages(await chatDatabase.listMessages(sessionId));
      } catch (err) {
        if (axios.isCancel(err)) {
          await chatDatabase.updateMessage(assistantMessage.id, {
            content: "Generation stopped.",
            status: MessageStatus.Stopped,
          });
        } else {
          const detail =
            err instanceof Error ? err.message : "Failed to get a response.";
          setError(detail);
          await chatDatabase.updateMessage(assistantMessage.id, {
            content: detail,
            status: MessageStatus.Error,
          });
        }

        try {
          setMessages(await chatDatabase.listMessages(sessionId));
        } catch (reloadErr) {
          setError(
            reloadErr instanceof Error
              ? reloadErr.message
              : "Failed to load messages"
          );
        }
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

      try {
        await chatDatabase.truncateMessagesFrom(sessionId, messageId);
        const prior = messages.filter(
          (m) =>
            m.createdAt < target.createdAt && m.status === MessageStatus.Sent
        );
        setMessages(prior);
        await runAgentTurn(target.content, prior);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to retry message"
        );
      }
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

      try {
        await chatDatabase.truncateMessagesFrom(sessionId, messageId);
        const prior = messages.filter((m) => m.createdAt < target.createdAt);
        setMessages(prior);
        await runAgentTurn(trimmed, prior);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to edit message"
        );
      }
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
