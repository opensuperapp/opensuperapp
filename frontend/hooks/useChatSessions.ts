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

import { chatDatabase } from "@/services/chatDatabase";
import { ChatSession } from "@/types/chat.types";
import { useCallback, useEffect, useState } from "react";

/**
 * Manages chat session list scoped to the authenticated user.
 *
 * @param {string | null} userId - Current user id from auth; sessions reload when it changes.
 * @returns Session state and mutation handlers.
 */
export const useChatSessions = (userId: string | null) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSessions = useCallback(async () => {
    if (!userId) {
      setSessions([]);
      return [];
    }

    try {
      const loaded = await chatDatabase.listSessions();
      setSessions(loaded);
      setError(null);
      return loaded;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load chat sessions";
      setError(message);
      throw err;
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setIsLoading(true);
      setSessions([]);
      setActiveSessionId(null);
      setError(null);
      chatDatabase.setUserId(userId);

      if (!userId) {
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      try {
        await chatDatabase.initialize();
        const loaded = await chatDatabase.listSessions();

        if (cancelled) {
          return;
        }

        if (loaded.length === 0) {
          const session = await chatDatabase.createSession();
          setSessions([session]);
          setActiveSessionId(session.id);
        } else {
          setSessions(loaded);
          setActiveSessionId(loaded[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load chats"
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const selectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  const createNewSession = useCallback(async () => {
    if (!userId) {
      return null;
    }

    try {
      const session = await chatDatabase.createSession();
      await refreshSessions();
      setActiveSessionId(session.id);
      return session;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create chat");
      return null;
    }
  }, [refreshSessions, userId]);

  const removeSession = useCallback(
    async (sessionId: string) => {
      if (!userId) {
        return;
      }

      try {
        await chatDatabase.deleteSession(sessionId);
        const remaining = await refreshSessions();

        if (activeSessionId === sessionId) {
          if (remaining.length === 0) {
            const session = await chatDatabase.createSession();
            setSessions([session]);
            setActiveSessionId(session.id);
          } else {
            setActiveSessionId(remaining[0].id);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete chat");
      }
    },
    [activeSessionId, refreshSessions, userId]
  );

  const togglePinSession = useCallback(
    async (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) {
        return;
      }

      try {
        await chatDatabase.setSessionPinned(sessionId, !session.isPinned);
        await refreshSessions();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update chat");
      }
    },
    [sessions, refreshSessions]
  );

  const renameSession = useCallback(
    async (sessionId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) {
        return;
      }

      try {
        await chatDatabase.updateSessionTitle(sessionId, trimmed);
        await refreshSessions();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to rename chat");
      }
    },
    [refreshSessions]
  );

  return {
    sessions,
    activeSessionId,
    isLoading,
    error,
    selectSession,
    createNewSession,
    removeSession,
    togglePinSession,
    renameSession,
    refreshSessions,
  };
};
