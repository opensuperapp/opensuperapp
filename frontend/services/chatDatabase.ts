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

interface SessionRow {
  id: string;
  title: string;
  is_pinned: number;
  created_at: number;
  updated_at: number;
  user_id: string | null;
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
 * Singleton accessor for the local chat SQLite database.
 */
export class ChatDatabase {
  private static instance: ChatDatabase | null = null;

  private db: SQLite.SQLiteDatabase | null = null;
  private activeUserId: string | null = null;

  /**
   * @returns {ChatDatabase} Shared database instance.
   */
  static getInstance(): ChatDatabase {
    if (!ChatDatabase.instance) {
      ChatDatabase.instance = new ChatDatabase();
    }

    return ChatDatabase.instance;
  }

  /**
   * Clears the singleton; used for tests.
   */
  static resetInstance(): void {
    ChatDatabase.instance = null;
  }

  /**
   * Sets the active user id used to scope chat session queries.
   *
   * @param {string | null} userId - Current authenticated user id.
   */
  setUserId(userId: string | null): void {
    this.activeUserId = userId;
  }

  private requireActiveUserId(): string {
    if (!this.activeUserId) {
      throw new Error("Chat user id is not set");
    }

    return this.activeUserId;
  }

  private async migrateSchema(database: SQLite.SQLiteDatabase): Promise<void> {
    const columns = await database.getAllAsync<{ name: string }>(
      `PRAGMA table_info(chat_sessions)`
    );
    const hasUserId = columns.some((column) => column.name === "user_id");

    if (!hasUserId) {
      await database.execAsync(`
        ALTER TABLE chat_sessions ADD COLUMN user_id TEXT;
        CREATE INDEX IF NOT EXISTS idx_sessions_user
          ON chat_sessions(user_id, updated_at);
      `);
    }
  }

  /**
   * Opens the database and applies schema migrations.
   *
   * @returns {Promise<SQLite.SQLiteDatabase>} Initialized database handle.
   */
  async initialize(): Promise<SQLite.SQLiteDatabase> {
    if (this.db) {
      return this.db;
    }

    const database = await SQLite.openDatabaseAsync(DB_NAME);

    await database.execAsync(`
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

    await this.migrateSchema(database);
    this.db = database;
    return database;
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    return this.initialize();
  }

  /**
   * Creates a new chat session.
   *
   * @param {string} [title='New Chat'] - Optional session title.
   * @returns {Promise<ChatSession>} The created session.
   */
  async createSession(title = CHAT_DEFAULT_SESSION_TITLE): Promise<ChatSession> {
    const database = await this.getDb();
    const userId = this.requireActiveUserId();
    const now = Date.now();
    const id = Crypto.randomUUID();

    await database.runAsync(
      `INSERT INTO chat_sessions (id, title, is_pinned, created_at, updated_at, user_id)
       VALUES (?, ?, 0, ?, ?, ?)`,
      [id, title, now, now, userId]
    );

    return { id, title, isPinned: false, createdAt: now, updatedAt: now };
  }

  /**
   * Lists all chat sessions for the active user.
   *
   * @returns {Promise<ChatSession[]>} Ordered session list.
   */
  async listSessions(): Promise<ChatSession[]> {
    const database = await this.getDb();
    const userId = this.requireActiveUserId();
    const rows = await database.getAllAsync<SessionRow>(
      `SELECT id, title, is_pinned, created_at, updated_at, user_id
       FROM chat_sessions
       WHERE user_id = ?
       ORDER BY is_pinned DESC, updated_at DESC`,
      [userId]
    );

    return rows.map(mapSessionRow);
  }

  /**
   * Retrieves a single session by id.
   *
   * @param {string} sessionId - Session identifier.
   * @returns {Promise<ChatSession | null>} The session or null.
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    const database = await this.getDb();
    const userId = this.requireActiveUserId();
    const row = await database.getFirstAsync<SessionRow>(
      `SELECT id, title, is_pinned, created_at, updated_at, user_id
       FROM chat_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );

    return row ? mapSessionRow(row) : null;
  }

  /**
   * Updates a session title and updated_at timestamp.
   *
   * @param {string} sessionId - Session identifier.
   * @param {string} title - New title.
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const database = await this.getDb();
    const userId = this.requireActiveUserId();
    await database.runAsync(
      `UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
      [title, Date.now(), sessionId, userId]
    );
  }

  /**
   * Toggles the pinned state of a session.
   *
   * @param {string} sessionId - Session identifier.
   * @param {boolean} isPinned - Whether the session should be pinned.
   */
  async setSessionPinned(sessionId: string, isPinned: boolean): Promise<void> {
    const database = await this.getDb();
    const userId = this.requireActiveUserId();
    await database.runAsync(
      `UPDATE chat_sessions SET is_pinned = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
      [isPinned ? 1 : 0, Date.now(), sessionId, userId]
    );
  }

  /**
   * Deletes a session and all its messages (cascade).
   *
   * @param {string} sessionId - Session identifier.
   */
  async deleteSession(sessionId: string): Promise<void> {
    const database = await this.getDb();
    const userId = this.requireActiveUserId();
    await database.runAsync(
      `DELETE FROM chat_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );
  }

  /**
   * Touches a session updated_at timestamp.
   *
   * @param {string} sessionId - Session identifier.
   */
  async touchSession(sessionId: string): Promise<void> {
    const database = await this.getDb();
    const userId = this.requireActiveUserId();
    await database.runAsync(
      `UPDATE chat_sessions SET updated_at = ? WHERE id = ? AND user_id = ?`,
      [Date.now(), sessionId, userId]
    );
  }

  /**
   * Inserts a message into a session.
   *
   * @param {object} params - Message fields.
   * @returns {Promise<ChatMessage>} The inserted message.
   */
  async insertMessage(params: {
    sessionId: string;
    role: ChatRole;
    content: string;
    status?: MessageStatus;
  }): Promise<ChatMessage> {
    const database = await this.getDb();
    const now = Date.now();
    const id = Crypto.randomUUID();
    const status = params.status ?? MessageStatus.Sent;

    await database.runAsync(
      `INSERT INTO chat_messages
         (id, session_id, role, content, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, params.sessionId, params.role, params.content, status, now, now]
    );

    await this.touchSession(params.sessionId);

    return {
      id,
      sessionId: params.sessionId,
      role: params.role,
      content: params.content,
      status,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Lists messages for a session ordered by creation time.
   *
   * @param {string} sessionId - Session identifier.
   * @returns {Promise<ChatMessage[]>} Messages in chronological order.
   */
  async listMessages(sessionId: string): Promise<ChatMessage[]> {
    const database = await this.getDb();
    const rows = await database.getAllAsync<MessageRow>(
      `SELECT id, session_id, role, content, status, created_at, updated_at
       FROM chat_messages
       WHERE session_id = ?
       ORDER BY created_at ASC, rowid ASC`,
      [sessionId]
    );

    return rows.map(mapMessageRow);
  }

  /**
   * Updates a message's content and status.
   *
   * @param {string} messageId - Message identifier.
   * @param {object} updates - Fields to update.
   */
  async updateMessage(
    messageId: string,
    updates: { content?: string; status?: MessageStatus }
  ): Promise<void> {
    const database = await this.getDb();
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
    await database.runAsync(
      `UPDATE chat_messages SET ${sets.join(", ")} WHERE id = ?`,
      values
    );
  }

  /**
   * Deletes a message and all subsequent messages in the same session.
   *
   * @param {string} sessionId - Session identifier.
   * @param {string} messageId - Message from which to truncate (inclusive).
   */
  async truncateMessagesFrom(
    sessionId: string,
    messageId: string
  ): Promise<void> {
    const database = await this.getDb();
    const target = await database.getFirstAsync<{ created_at: number }>(
      `SELECT created_at FROM chat_messages WHERE id = ? AND session_id = ?`,
      [messageId, sessionId]
    );

    if (!target) {
      return;
    }

    await database.runAsync(
      `DELETE FROM chat_messages
       WHERE session_id = ? AND created_at >= ?`,
      [sessionId, target.created_at]
    );

    await this.touchSession(sessionId);
  }
}

/** Shared chat database singleton. */
export const chatDatabase = ChatDatabase.getInstance();

export const setChatUserId = (userId: string | null): void => {
  chatDatabase.setUserId(userId);
};

export const initChatDatabase = (): Promise<SQLite.SQLiteDatabase> =>
  chatDatabase.initialize();

export const resetChatDatabase = (): void => {
  ChatDatabase.resetInstance();
};

export const createSession = (title?: string): Promise<ChatSession> =>
  chatDatabase.createSession(title);

export const listSessions = (): Promise<ChatSession[]> =>
  chatDatabase.listSessions();

export const getSession = (sessionId: string): Promise<ChatSession | null> =>
  chatDatabase.getSession(sessionId);

export const updateSessionTitle = (
  sessionId: string,
  title: string
): Promise<void> => chatDatabase.updateSessionTitle(sessionId, title);

export const setSessionPinned = (
  sessionId: string,
  isPinned: boolean
): Promise<void> => chatDatabase.setSessionPinned(sessionId, isPinned);

export const deleteSession = (sessionId: string): Promise<void> =>
  chatDatabase.deleteSession(sessionId);

export const touchSession = (sessionId: string): Promise<void> =>
  chatDatabase.touchSession(sessionId);

export const insertMessage = (params: {
  sessionId: string;
  role: ChatRole;
  content: string;
  status?: MessageStatus;
}): Promise<ChatMessage> => chatDatabase.insertMessage(params);

export const listMessages = (sessionId: string): Promise<ChatMessage[]> =>
  chatDatabase.listMessages(sessionId);

export const updateMessage = (
  messageId: string,
  updates: { content?: string; status?: MessageStatus }
): Promise<void> => chatDatabase.updateMessage(messageId, updates);

export const truncateMessagesFrom = (
  sessionId: string,
  messageId: string
): Promise<void> => chatDatabase.truncateMessagesFrom(sessionId, messageId);

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
