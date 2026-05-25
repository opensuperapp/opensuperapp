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
  createSession,
  deleteSession,
  initChatDatabase,
  listSessions,
  setSessionPinned,
  updateSessionTitle,
} from "@/services/chatDatabase";
import { ChatSession } from "@/types/chat.types";
import { useCallback, useEffect, useState } from "react";

/**
 * Manages chat session list: load, create, delete, pin, and active selection.
 *
 * @returns Session state and mutation handlers.
 */
export const useChatSessions = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSessions = useCallback(async () => {
    const loaded = await listSessions();
    setSessions(loaded);
    return loaded;
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initChatDatabase();
        const loaded = await refreshSessions();

        if (loaded.length === 0) {
          const session = await createSession();
          setSessions([session]);
          setActiveSessionId(session.id);
        } else {
          setActiveSessionId(loaded[0].id);
        }
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [refreshSessions]);

  const selectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  const createNewSession = useCallback(async () => {
    const session = await createSession();
    await refreshSessions();
    setActiveSessionId(session.id);
    return session;
  }, [refreshSessions]);

  const removeSession = useCallback(
    async (sessionId: string) => {
      await deleteSession(sessionId);
      const remaining = await refreshSessions();

      if (activeSessionId === sessionId) {
        if (remaining.length === 0) {
          const session = await createSession();
          setSessions([session]);
          setActiveSessionId(session.id);
        } else {
          setActiveSessionId(remaining[0].id);
        }
      }
    },
    [activeSessionId, refreshSessions]
  );

  const togglePinSession = useCallback(
    async (sessionId: string) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) {
        return;
      }
      await setSessionPinned(sessionId, !session.isPinned);
      await refreshSessions();
    },
    [sessions, refreshSessions]
  );

  const renameSession = useCallback(
    async (sessionId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) {
        return;
      }
      await updateSessionTitle(sessionId, trimmed);
      await refreshSessions();
    },
    [refreshSessions]
  );

  return {
    sessions,
    activeSessionId,
    isLoading,
    selectSession,
    createNewSession,
    removeSession,
    togglePinSession,
    renameSession,
    refreshSessions,
  };
};
