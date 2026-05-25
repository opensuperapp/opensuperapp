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

import { CHAT_DEFAULT_SESSION_TITLE } from "@/constants/Constants";
import { MessageStatus } from "@/constants/enums/Chat";
import {
  ChatMessage,
  ChatRole,
  ChatSession,
} from "@/types/chat.types";
import * as Crypto from "expo-crypto";
import * as SQLite from "expo-sqlite";

const DB_NAME = "chat.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

interface SessionRow {
  id: string;
  title: string;
  is_pinned: number;
  created_at: number;
  updated_at: number;
}

interface MessageRow {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  status: MessageStatus;
  created_at: number;
  updated_at: number;
}

/**
 * Opens the chat SQLite database and runs schema migrations.
 *
 * @returns {Promise<SQLite.SQLiteDatabase>} The initialized database handle.
 */
export const initChatDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (dbInstance) {
    return dbInstance;
  }

  const db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL DEFAULT 'New Chat',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sent'
        CHECK(status IN ('pending', 'streaming', 'sent', 'error', 'stopped')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session
      ON chat_messages(session_id, created_at);
  `);

  dbInstance = db;
  return db;
};

/**
 * Resets the cached database instance; used for tests.
 */
export const resetChatDatabase = (): void => {
  dbInstance = null;
};

const mapSessionRow = (row: SessionRow): ChatSession => ({
  id: row.id,
  title: row.title,
  isPinned: row.is_pinned === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapMessageRow = (row: MessageRow): ChatMessage => ({
  id: row.id,
  sessionId: row.session_id,
  role: row.role,
  content: row.content,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Creates a new chat session.
 *
 * @param {string} [title='New Chat'] - Optional session title.
 * @returns {Promise<ChatSession>} The created session.
 */
export const createSession = async (
  title = CHAT_DEFAULT_SESSION_TITLE
): Promise<ChatSession> => {
  const db = await initChatDatabase();
  const now = Date.now();
  const id = Crypto.randomUUID();

  await db.runAsync(
    `INSERT INTO chat_sessions (id, title, is_pinned, created_at, updated_at)
     VALUES (?, ?, 0, ?, ?)`,
    [id, title, now, now]
  );

  return { id, title, isPinned: false, createdAt: now, updatedAt: now };
};

/**
 * Lists all chat sessions, pinned first then by most recently updated.
 *
 * @returns {Promise<ChatSession[]>} Ordered session list.
 */
export const listSessions = async (): Promise<ChatSession[]> => {
  const db = await initChatDatabase();
  const rows = await db.getAllAsync<SessionRow>(
    `SELECT id, title, is_pinned, created_at, updated_at
     FROM chat_sessions
     ORDER BY is_pinned DESC, updated_at DESC`
  );

  return rows.map(mapSessionRow);
};

/**
 * Retrieves a single session by id.
 *
 * @param {string} sessionId - Session identifier.
 * @returns {Promise<ChatSession | null>} The session or null.
 */
export const getSession = async (
  sessionId: string
): Promise<ChatSession | null> => {
  const db = await initChatDatabase();
  const row = await db.getFirstAsync<SessionRow>(
    `SELECT id, title, is_pinned, created_at, updated_at
     FROM chat_sessions WHERE id = ?`,
    [sessionId]
  );

  return row ? mapSessionRow(row) : null;
};

/**
 * Updates a session title and updated_at timestamp.
 *
 * @param {string} sessionId - Session identifier.
 * @param {string} title - New title.
 */
export const updateSessionTitle = async (
  sessionId: string,
  title: string
): Promise<void> => {
  const db = await initChatDatabase();
  await db.runAsync(
    `UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?`,
    [title, Date.now(), sessionId]
  );
};

/**
 * Toggles the pinned state of a session.
 *
 * @param {string} sessionId - Session identifier.
 * @param {boolean} isPinned - Whether the session should be pinned.
 */
export const setSessionPinned = async (
  sessionId: string,
  isPinned: boolean
): Promise<void> => {
  const db = await initChatDatabase();
  await db.runAsync(
    `UPDATE chat_sessions SET is_pinned = ?, updated_at = ? WHERE id = ?`,
    [isPinned ? 1 : 0, Date.now(), sessionId]
  );
};

/**
 * Deletes a session and all its messages (cascade).
 *
 * @param {string} sessionId - Session identifier.
 */
export const deleteSession = async (sessionId: string): Promise<void> => {
  const db = await initChatDatabase();
  await db.runAsync(`DELETE FROM chat_sessions WHERE id = ?`, [sessionId]);
};

/**
 * Touches a session updated_at timestamp.
 *
 * @param {string} sessionId - Session identifier.
 */
export const touchSession = async (sessionId: string): Promise<void> => {
  const db = await initChatDatabase();
  await db.runAsync(`UPDATE chat_sessions SET updated_at = ? WHERE id = ?`, [
    Date.now(),
    sessionId,
  ]);
};

/**
 * Inserts a message into a session.
 *
 * @param {object} params - Message fields.
 * @returns {Promise<ChatMessage>} The inserted message.
 */
export const insertMessage = async (params: {
  sessionId: string;
  role: ChatRole;
  content: string;
  status?: MessageStatus;
}): Promise<ChatMessage> => {
  const db = await initChatDatabase();
  const now = Date.now();
  const id = Crypto.randomUUID();
  const status = params.status ?? MessageStatus.Sent;

  await db.runAsync(
    `INSERT INTO chat_messages
       (id, session_id, role, content, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, params.sessionId, params.role, params.content, status, now, now]
  );

  await touchSession(params.sessionId);

  return {
    id,
    sessionId: params.sessionId,
    role: params.role,
    content: params.content,
    status,
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Lists messages for a session ordered by creation time.
 *
 * @param {string} sessionId - Session identifier.
 * @returns {Promise<ChatMessage[]>} Messages in chronological order.
 */
export const listMessages = async (
  sessionId: string
): Promise<ChatMessage[]> => {
  const db = await initChatDatabase();
  const rows = await db.getAllAsync<MessageRow>(
    `SELECT id, session_id, role, content, status, created_at, updated_at
     FROM chat_messages
     WHERE session_id = ?
     ORDER BY created_at ASC`,
    [sessionId]
  );

  return rows.map(mapMessageRow);
};

/**
 * Updates a message's content and status.
 *
 * @param {string} messageId - Message identifier.
 * @param {object} updates - Fields to update.
 */
export const updateMessage = async (
  messageId: string,
  updates: { content?: string; status?: MessageStatus }
): Promise<void> => {
  const db = await initChatDatabase();
  const sets: string[] = ["updated_at = ?"];
  const values: (string | number)[] = [Date.now()];

  if (updates.content !== undefined) {
    sets.push("content = ?");
    values.push(updates.content);
  }
  if (updates.status !== undefined) {
    sets.push("status = ?");
    values.push(updates.status);
  }

  values.push(messageId);
  await db.runAsync(
    `UPDATE chat_messages SET ${sets.join(", ")} WHERE id = ?`,
    values
  );
};

/**
 * Deletes a message and all subsequent messages in the same session.
 *
 * @param {string} sessionId - Session identifier.
 * @param {string} messageId - Message from which to truncate (inclusive).
 */
export const truncateMessagesFrom = async (
  sessionId: string,
  messageId: string
): Promise<void> => {
  const db = await initChatDatabase();
  const target = await db.getFirstAsync<{ created_at: number }>(
    `SELECT created_at FROM chat_messages WHERE id = ? AND session_id = ?`,
    [messageId, sessionId]
  );

  if (!target) {
    return;
  }

  await db.runAsync(
    `DELETE FROM chat_messages
     WHERE session_id = ? AND created_at >= ?`,
    [sessionId, target.created_at]
  );

  await touchSession(sessionId);
};

/**
 * Derives a session title from the first user message (truncated).
 *
 * @param {string} content - User message content.
 * @returns {string} A short title string.
 */
export const deriveSessionTitle = (content: string): string => {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (trimmed.length <= 40) {
    return trimmed || CHAT_DEFAULT_SESSION_TITLE;
  }
  return `${trimmed.slice(0, 40)}…`;
};
