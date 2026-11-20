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

  /**
   * Creates and activates a new session. Resolves to null on failure; the caller
   * reports it, so a failure is not written to the shared `error` (which would show
   * it twice, and leave a stale message behind for the next caller).
   */
  const createNewSession = useCallback(async () => {
    if (!userId) {
      return null;
    }

    let session: ChatSession;
    try {
      session = await chatDatabase.createSession();
    } catch (err) {
      console.warn("[chat] could not create a session", err);
      return null;
    }

    // The row exists from here on, so this is a success whatever the reload does:
    // reporting failure would invite a retry that leaves a second empty chat. If the
    // reload fails, refreshSessions has already set the (non-blocking) load error;
    // show the new session in the list by hand until the next reload.
    try {
      await refreshSessions();
    } catch {
      setSessions((current) => [
        session,
        ...current.filter((s) => s.id !== session.id),
      ]);
    }
    setActiveSessionId(session.id);
    return session;
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
