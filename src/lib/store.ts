import fs from "fs";
import type DatabaseType from "better-sqlite3";
import type { AppStatus, Message, SearchResult, Thread } from "./types";
import { demoMessages, demoThreads } from "./demo-data";

export const isDemo =
  !!process.env.VERCEL || process.env.KEEPSAKE_DEMO === "1";

const PAGE = 100;
const AROUND = 50;

// ---------- local (synced index.db) ----------

type Db = InstanceType<typeof DatabaseType>;
let cached: { db: Db; mtimeMs: number } | null = null;

function openIndex(): Db | null {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database: typeof DatabaseType = require("better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { INDEX_DB } = require("./local-sync") as typeof import("./local-sync");
  let stat: fs.Stats;
  try {
    stat = fs.statSync(INDEX_DB);
  } catch {
    return null;
  }
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.db;
  cached?.db.close();
  cached = { db: new Database(INDEX_DB, { readonly: true }), mtimeMs: stat.mtimeMs };
  return cached.db;
}

// Called by the sync route so reads pick up the fresh database.
export function invalidateStore() {
  cached?.db.close();
  cached = null;
}

type ThreadRow = {
  id: string;
  name: string;
  participants: string;
  is_group: number;
  last_date: number;
  last_text: string;
  message_count: number;
};
type MsgRow = {
  id: number;
  thread_id: string;
  sender: string;
  is_from_me: number;
  date: number;
  text: string;
};

const toThread = (r: ThreadRow): Thread => ({
  id: r.id,
  name: r.name,
  participants: JSON.parse(r.participants),
  isGroup: !!r.is_group,
  lastDate: r.last_date,
  lastText: r.last_text,
  messageCount: r.message_count,
});
const toMessage = (r: MsgRow): Message => ({
  id: r.id,
  threadId: r.thread_id,
  sender: r.sender,
  isFromMe: !!r.is_from_me,
  date: r.date,
  text: r.text,
});

// ---------- public API ----------

export function getStatus(): AppStatus {
  if (isDemo) {
    return {
      mode: "demo",
      synced: true,
      lastSync: Date.now(),
      threadCount: demoThreads.length,
      messageCount: [...demoMessages.values()].reduce((n, m) => n + m.length, 0),
      ollama: { available: false, model: null },
    };
  }
  const db = openIndex();
  if (!db) {
    return {
      mode: "local",
      synced: false,
      lastSync: null,
      threadCount: 0,
      messageCount: 0,
      ollama: { available: false, model: null },
    };
  }
  const lastSync = db
    .prepare("SELECT value FROM meta WHERE key = 'lastSync'")
    .get() as { value: string } | undefined;
  return {
    mode: "local",
    synced: true,
    lastSync: lastSync ? Number(lastSync.value) : null,
    threadCount: (db.prepare("SELECT COUNT(*) c FROM threads").get() as { c: number }).c,
    messageCount: (db.prepare("SELECT COUNT(*) c FROM messages").get() as { c: number }).c,
    ollama: { available: false, model: null }, // filled in by the status route
  };
}

export function getThreads(query?: string): Thread[] {
  if (isDemo) {
    const q = query?.trim().toLowerCase();
    if (!q) return demoThreads;
    return demoThreads.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.participants.some((p) => p.toLowerCase().includes(q))
    );
  }
  const db = openIndex();
  if (!db) return [];
  const q = query?.trim();
  const rows = (
    q
      ? db
          .prepare(
            `SELECT * FROM threads
             WHERE name LIKE ? OR participants LIKE ?
             ORDER BY last_date DESC LIMIT 500`
          )
          .all(`%${q}%`, `%${q}%`)
      : db.prepare("SELECT * FROM threads ORDER BY last_date DESC LIMIT 500").all()
  ) as ThreadRow[];
  return rows.map(toThread);
}

export function getThread(id: string): Thread | null {
  if (isDemo) return demoThreads.find((t) => t.id === id) ?? null;
  const db = openIndex();
  if (!db) return null;
  const row = db.prepare("SELECT * FROM threads WHERE id = ?").get(id) as
    | ThreadRow
    | undefined;
  return row ? toThread(row) : null;
}

export type MessagePage = {
  messages: Message[];
  hasEarlier: boolean;
  hasLater: boolean;
};

export function getMessages(
  threadId: string,
  opts: { before?: number; around?: number } = {}
): MessagePage {
  if (isDemo) {
    const all = demoMessages.get(threadId) ?? [];
    return { messages: all, hasEarlier: false, hasLater: false };
  }
  const db = openIndex();
  if (!db) return { messages: [], hasEarlier: false, hasLater: false };

  if (opts.around) {
    const anchor = db
      .prepare("SELECT * FROM messages WHERE id = ? AND thread_id = ?")
      .get(opts.around, threadId) as MsgRow | undefined;
    if (anchor) {
      const before = db
        .prepare(
          `SELECT * FROM messages WHERE thread_id = ? AND (date < ? OR (date = ? AND id < ?))
           ORDER BY date DESC, id DESC LIMIT ?`
        )
        .all(threadId, anchor.date, anchor.date, anchor.id, AROUND) as MsgRow[];
      const after = db
        .prepare(
          `SELECT * FROM messages WHERE thread_id = ? AND (date > ? OR (date = ? AND id > ?))
           ORDER BY date ASC, id ASC LIMIT ?`
        )
        .all(threadId, anchor.date, anchor.date, anchor.id, AROUND) as MsgRow[];
      return {
        messages: [...before.reverse(), anchor, ...after].map(toMessage),
        hasEarlier: before.length === AROUND,
        hasLater: after.length === AROUND,
      };
    }
  }

  const rows = (
    opts.before
      ? db
          .prepare(
            `SELECT * FROM messages WHERE thread_id = ? AND date < ?
             ORDER BY date DESC, id DESC LIMIT ?`
          )
          .all(threadId, opts.before, PAGE)
      : db
          .prepare(
            `SELECT * FROM messages WHERE thread_id = ?
             ORDER BY date DESC, id DESC LIMIT ?`
          )
          .all(threadId, PAGE)
  ) as MsgRow[];
  return {
    messages: rows.reverse().map(toMessage),
    hasEarlier: rows.length === PAGE,
    hasLater: false,
  };
}

// Recent context for AI summarize / ask.
export function getRecentText(threadId: string, maxChars = 12000): string {
  const { messages } = isDemo
    ? { messages: demoMessages.get(threadId) ?? [] }
    : getMessages(threadId, {});
  const lines: string[] = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    const line = `[${new Date(m.date).toLocaleDateString()}] ${
      m.isFromMe ? "Me" : m.sender || "Them"
    }: ${m.text}`;
    total += line.length;
    if (total > maxChars) break;
    lines.push(line);
  }
  return lines.reverse().join("\n");
}

const EXPORT_CAP = 50000;

export function exportThread(
  threadId: string,
  since?: number
): { name: string; text: string; count: number } | null {
  const thread = getThread(threadId);
  if (!thread) return null;
  let msgs: Message[];
  if (isDemo) {
    msgs = (demoMessages.get(threadId) ?? []).filter((m) => !since || m.date >= since);
  } else {
    const db = openIndex();
    if (!db) return null;
    msgs = (
      db
        .prepare(
          `SELECT * FROM messages WHERE thread_id = ? AND date >= ?
           ORDER BY date ASC, id ASC LIMIT ?`
        )
        .all(threadId, since ?? 0, EXPORT_CAP) as MsgRow[]
    ).map(toMessage);
  }
  const lines = msgs.map((m) => {
    const when = new Date(m.date).toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return `[${when}] ${m.isFromMe ? "Me" : m.sender || thread.name}: ${m.text}`;
  });
  const header = `Conversation with ${thread.name}${
    thread.isGroup ? ` (${thread.participants.join(", ")})` : ""
  }\n${msgs.length} messages · exported from Keepsake on ${new Date().toLocaleDateString()}\n\n`;
  return { name: thread.name, text: header + lines.join("\n"), count: msgs.length };
}

export function search(q: string, threadId?: string): SearchResult[] {
  const query = q.trim();
  if (!query) return [];
  if (isDemo) {
    const needle = query.toLowerCase();
    const results: SearchResult[] = [];
    for (const t of demoThreads) {
      if (threadId && t.id !== threadId) continue;
      for (const m of demoMessages.get(t.id) ?? []) {
        const idx = m.text.toLowerCase().indexOf(needle);
        if (idx === -1) continue;
        const from = Math.max(0, idx - 40);
        results.push({
          message: m,
          threadName: t.name,
          snippet:
            (from > 0 ? "…" : "") +
            m.text.slice(from, idx) +
            "[" + m.text.slice(idx, idx + query.length) + "]" +
            m.text.slice(idx + query.length, idx + query.length + 60),
        });
      }
    }
    return results.sort((a, b) => b.message.date - a.message.date).slice(0, 60);
  }
  const db = openIndex();
  if (!db) return [];
  const ftsQuery = query
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, "")}"*`)
    .join(" ");
  try {
    const rows = db
      .prepare(
        `SELECT m.*, t.name as thread_name,
                snippet(messages_fts, 0, '[', ']', '…', 14) as snip
         FROM messages_fts f
         JOIN messages m ON m.id = f.rowid
         JOIN threads t ON t.id = m.thread_id
         WHERE messages_fts MATCH ? ${threadId ? "AND m.thread_id = ?" : ""}
         ORDER BY m.date DESC LIMIT 60`
      )
      .all(...(threadId ? [ftsQuery, threadId] : [ftsQuery])) as (MsgRow & {
      thread_name: string;
      snip: string;
    })[];
    return rows.map((r) => ({
      message: toMessage(r),
      threadName: r.thread_name,
      snippet: r.snip,
    }));
  } catch {
    return []; // malformed FTS query
  }
}
