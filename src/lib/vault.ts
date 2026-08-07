import fs from "fs";
import os from "os";
import path from "path";
import type DatabaseType from "better-sqlite3";

// Everything the user *writes* — notes, pinned messages, AI conversations —
// lives here. Three properties matter, and each one is a bug we've already hit:
//
//   1. It is NOT index.db. Sync deletes and rebuilds that file from scratch
//      (local-sync.ts), so anything stored there dies at the next sync.
//   2. It is NOT the app bundle. Updates replace Sidenote.app wholesale and
//      stage a fresh server-<commit> directory; ~/.sidenote/ is never touched.
//   3. It is NOT WebKit localStorage, which the WKWebView shell does not
//      persist reliably — that's what lost the notes in the first place.
export const VAULT_DIR = path.join(os.homedir(), ".sidenote");
export const VAULT_DB = path.join(VAULT_DIR, "vault.db");

type Db = InstanceType<typeof DatabaseType>;
let cached: Db | null = null;

function db(): Db {
  if (cached) return cached;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database: typeof DatabaseType = require("better-sqlite3");
  fs.mkdirSync(VAULT_DIR, { recursive: true });
  const open = new Database(VAULT_DB);
  open.pragma("journal_mode = WAL");
  // The app can be force-quit at any moment (that is exactly how notes were
  // being lost before). FULL costs a fsync on writes that happen at most once
  // every few hundred milliseconds, and guarantees a committed note is on disk.
  open.pragma("synchronous = FULL");
  open.exec(`
    CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);

    CREATE TABLE IF NOT EXISTS notes(
      thread_id  TEXT PRIMARY KEY,
      body       TEXT NOT NULL DEFAULT '',
      updated_at INT  NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saved_messages(
      thread_id  TEXT NOT NULL,
      message_id INT  NOT NULL,
      text       TEXT NOT NULL DEFAULT '',
      sender     TEXT NOT NULL DEFAULT '',
      is_from_me INT  NOT NULL DEFAULT 0,
      date       INT  NOT NULL,
      saved_at   INT  NOT NULL,
      PRIMARY KEY (thread_id, message_id)
    );

    CREATE TABLE IF NOT EXISTS ai_conversations(
      id         TEXT PRIMARY KEY,
      thread_id  TEXT NOT NULL,
      title      TEXT NOT NULL DEFAULT 'New chat',
      created_at INT  NOT NULL,
      updated_at INT  NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ai_conversations_thread
      ON ai_conversations(thread_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS ai_messages(
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role            TEXT NOT NULL,
      text            TEXT NOT NULL DEFAULT '',
      created_at      INT  NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ai_messages_conversation
      ON ai_messages(conversation_id, id);
  `);
  cached = open;
  return open;
}

// ---------- notes ----------

export function getNote(threadId: string): string {
  const row = db().prepare("SELECT body FROM notes WHERE thread_id = ?").get(threadId) as
    | { body: string }
    | undefined;
  return row?.body ?? "";
}

export function setNote(threadId: string, body: string): void {
  db()
    .prepare(
      `INSERT INTO notes(thread_id, body, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(thread_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`
    )
    .run(threadId, body, Date.now());
}

// ---------- pinned messages ----------

export type SavedMessage = {
  id: number;
  text: string;
  sender: string;
  isFromMe: boolean;
  date: number;
  savedAt: number;
};

type SavedRow = {
  message_id: number;
  text: string;
  sender: string;
  is_from_me: number;
  date: number;
  saved_at: number;
};

const toSaved = (r: SavedRow): SavedMessage => ({
  id: r.message_id,
  text: r.text,
  sender: r.sender,
  isFromMe: !!r.is_from_me,
  date: r.date,
  savedAt: r.saved_at,
});

export function getSaved(threadId: string): SavedMessage[] {
  const rows = db()
    .prepare("SELECT * FROM saved_messages WHERE thread_id = ? ORDER BY date ASC")
    .all(threadId) as SavedRow[];
  return rows.map(toSaved);
}

// Returns false when the message was already pinned, so the UI can say so.
export function pinMessage(threadId: string, m: Omit<SavedMessage, "savedAt">): boolean {
  const res = db()
    .prepare(
      `INSERT OR IGNORE INTO saved_messages
         (thread_id, message_id, text, sender, is_from_me, date, saved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(threadId, m.id, m.text, m.sender, m.isFromMe ? 1 : 0, m.date, Date.now());
  return res.changes > 0;
}

export function unpinMessage(threadId: string, messageId: number): void {
  db()
    .prepare("DELETE FROM saved_messages WHERE thread_id = ? AND message_id = ?")
    .run(threadId, messageId);
}

// ---------- AI conversations ----------

export type AiConversation = {
  id: string;
  threadId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export type AiMessage = {
  id: number;
  role: "user" | "ai";
  text: string;
  createdAt: number;
};

type ConvRow = {
  id: string;
  thread_id: string;
  title: string;
  created_at: number;
  updated_at: number;
};

const toConversation = (r: ConvRow): AiConversation => ({
  id: r.id,
  threadId: r.thread_id,
  title: r.title,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export function listConversations(threadId: string): AiConversation[] {
  const rows = db()
    .prepare("SELECT * FROM ai_conversations WHERE thread_id = ? ORDER BY updated_at DESC")
    .all(threadId) as ConvRow[];
  return rows.map(toConversation);
}

export function getConversation(id: string): AiConversation | null {
  const row = db().prepare("SELECT * FROM ai_conversations WHERE id = ?").get(id) as
    | ConvRow
    | undefined;
  return row ? toConversation(row) : null;
}

export function createConversation(threadId: string, title = "New chat"): AiConversation {
  const now = Date.now();
  // Random enough for a local single-user file, and readable in the DB.
  const id = `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  db()
    .prepare(
      "INSERT INTO ai_conversations(id, thread_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(id, threadId, title, now, now);
  return { id, threadId, title, createdAt: now, updatedAt: now };
}

export function renameConversation(id: string, title: string): void {
  db()
    .prepare("UPDATE ai_conversations SET title = ?, updated_at = ? WHERE id = ?")
    .run(title, Date.now(), id);
}

export function deleteConversation(id: string): void {
  const conn = db();
  conn.transaction(() => {
    conn.prepare("DELETE FROM ai_messages WHERE conversation_id = ?").run(id);
    conn.prepare("DELETE FROM ai_conversations WHERE id = ?").run(id);
  })();
}

export function getConversationMessages(id: string): AiMessage[] {
  const rows = db()
    .prepare("SELECT id, role, text, created_at FROM ai_messages WHERE conversation_id = ? ORDER BY id ASC")
    .all(id) as { id: number; role: string; text: string; created_at: number }[];
  return rows.map((r) => ({
    id: r.id,
    role: r.role === "user" ? "user" : "ai",
    text: r.text,
    createdAt: r.created_at,
  }));
}

// One exchange, written after the answer finishes streaming. The first
// exchange also names the conversation so the switcher isn't a wall of
// "New chat".
export function appendExchange(
  conversationId: string,
  question: string,
  answer: string
): void {
  const conn = db();
  const now = Date.now();
  conn.transaction(() => {
    const insert = conn.prepare(
      "INSERT INTO ai_messages(conversation_id, role, text, created_at) VALUES (?, ?, ?, ?)"
    );
    insert.run(conversationId, "user", question, now);
    insert.run(conversationId, "ai", answer, now + 1);
    const existing = conn
      .prepare("SELECT title FROM ai_conversations WHERE id = ?")
      .get(conversationId) as { title: string } | undefined;
    if (existing && existing.title === "New chat") {
      conn
        .prepare("UPDATE ai_conversations SET title = ?, updated_at = ? WHERE id = ?")
        .run(titleFrom(question), now, conversationId);
    } else {
      conn
        .prepare("UPDATE ai_conversations SET updated_at = ? WHERE id = ?")
        .run(now, conversationId);
    }
  })();
}

function titleFrom(question: string): string {
  const clean = question.trim().replace(/\s+/g, " ");
  if (!clean) return "New chat";
  return clean.length > 48 ? `${clean.slice(0, 47)}…` : clean;
}

// ---------- one-time import from the old localStorage world ----------

// Notes used to live in the browser. Anything still sitting in a WebView's
// localStorage gets folded in once, then never again.
export function importLegacy(payload: {
  notes: { threadId: string; body: string }[];
  saved: { threadId: string; messages: SavedMessage[] }[];
}): { notes: number; saved: number } {
  const conn = db();
  let notes = 0;
  let saved = 0;
  conn.transaction(() => {
    for (const n of payload.notes) {
      if (!n.threadId || !n.body.trim()) continue;
      // Never clobber a note the user has already written in the vault.
      const existing = conn
        .prepare("SELECT body FROM notes WHERE thread_id = ?")
        .get(n.threadId) as { body: string } | undefined;
      if (existing?.body.trim()) continue;
      conn
        .prepare(
          `INSERT INTO notes(thread_id, body, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(thread_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`
        )
        .run(n.threadId, n.body, Date.now());
      notes++;
    }
    for (const group of payload.saved) {
      for (const m of group.messages) {
        const res = conn
          .prepare(
            `INSERT OR IGNORE INTO saved_messages
               (thread_id, message_id, text, sender, is_from_me, date, saved_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            group.threadId,
            m.id,
            m.text ?? "",
            m.sender ?? "",
            m.isFromMe ? 1 : 0,
            m.date ?? Date.now(),
            m.savedAt ?? Date.now()
          );
        if (res.changes > 0) saved++;
      }
    }
  })();
  return { notes, saved };
}

export function hasImported(): boolean {
  const row = db().prepare("SELECT value FROM meta WHERE key = 'legacyImport'").get() as
    | { value: string }
    | undefined;
  return row?.value === "1";
}

export function markImported(): void {
  db()
    .prepare("INSERT OR REPLACE INTO meta(key, value) VALUES ('legacyImport', '1')")
    .run();
}
