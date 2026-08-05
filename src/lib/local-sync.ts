import fs from "fs";
import os from "os";
import path from "path";
import type DatabaseType from "better-sqlite3";

// Everything in this file runs only on a Mac in local mode. better-sqlite3 is
// loaded lazily so the module can be imported safely in the demo deployment.
function sqlite(): typeof DatabaseType {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("better-sqlite3");
}

export const KEEPSAKE_DIR = path.join(os.homedir(), ".sidenote");
const RAW_DIR = path.join(KEEPSAKE_DIR, "raw");
export const INDEX_DB = path.join(KEEPSAKE_DIR, "index.db");

const CHAT_DB = path.join(os.homedir(), "Library", "Messages", "chat.db");
const ADDRESSBOOK_DIR = path.join(
  os.homedir(),
  "Library",
  "Application Support",
  "AddressBook"
);

const APPLE_EPOCH_MS = 978307200000; // 2001-01-01 in unix ms

function appleToUnixMs(d: number): number {
  if (!d) return 0;
  // Modern macOS stores nanoseconds since 2001; very old exports used seconds.
  if (d > 1e12) return Math.round(d / 1e6) + APPLE_EPOCH_MS;
  return d * 1000 + APPLE_EPOCH_MS;
}

// Extract the visible text from an NSKeyedArchiver/typedstream attributedBody
// blob (used when message.text is NULL on newer macOS versions).
export function extractText(
  text: string | null,
  attributedBody: Buffer | null
): string | null {
  if (text && text.trim()) return text;
  if (!attributedBody) return null;
  const marker = Buffer.from("NSString");
  let i = attributedBody.indexOf(marker);
  if (i === -1) return null;
  i += marker.length + 5; // skip typedstream class bytes
  if (i >= attributedBody.length) return null;
  let len = attributedBody[i];
  let start = i + 1;
  if (len === 0x81) {
    len = attributedBody.readUInt16LE(i + 1);
    start = i + 3;
  } else if (len === 0x82) {
    len = attributedBody.readUInt32LE(i + 1);
    start = i + 5;
  }
  const out = attributedBody
    .toString("utf8", start, Math.min(start + len, attributedBody.length))
    .replace(/￼/g, "")
    .trim();
  return out || null;
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function formatIdentifier(id: string): string {
  if (id.includes("@")) return id;
  const digits = normalizePhone(id);
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return id;
}

export class PermissionError extends Error {
  constructor() {
    super("Sidenote needs Full Disk Access to read your Messages.");
    this.name = "PermissionError";
  }
}

function copyIntoRaw(src: string, destName: string): string {
  const dest = path.join(RAW_DIR, destName);
  fs.copyFileSync(src, dest);
  for (const suffix of ["-wal", "-shm"]) {
    if (fs.existsSync(src + suffix)) {
      fs.copyFileSync(src + suffix, dest + suffix);
    } else {
      fs.rmSync(dest + suffix, { force: true });
    }
  }
  return dest;
}

// phone-digits / email → display name
function loadContacts(): Map<string, string> {
  const map = new Map<string, string>();
  let dbFiles: string[] = [];
  try {
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (entry.name === "AddressBook-v22.abcddb") dbFiles.push(p);
      }
    };
    walk(ADDRESSBOOK_DIR);
  } catch {
    dbFiles = [];
  }
  const Database = sqlite();
  dbFiles.forEach((file, n) => {
    try {
      const copy = copyIntoRaw(file, `contacts-${n}.abcddb`);
      const db = new Database(copy, { readonly: true });
      const name = (r: {
        ZFIRSTNAME: string | null;
        ZLASTNAME: string | null;
        ZORGANIZATION: string | null;
      }) =>
        [r.ZFIRSTNAME, r.ZLASTNAME].filter(Boolean).join(" ").trim() ||
        (r.ZORGANIZATION ?? "").trim();
      try {
        for (const row of db
          .prepare(
            `SELECT r.ZFIRSTNAME, r.ZLASTNAME, r.ZORGANIZATION, p.ZFULLNUMBER as val
             FROM ZABCDPHONENUMBER p JOIN ZABCDRECORD r ON p.ZOWNER = r.Z_PK`
          )
          .iterate() as IterableIterator<never>) {
          const r = row as {
            ZFIRSTNAME: string | null;
            ZLASTNAME: string | null;
            ZORGANIZATION: string | null;
            val: string | null;
          };
          const n2 = name(r);
          if (!n2 || !r.val) continue;
          const digits = normalizePhone(r.val);
          if (digits.length >= 7) {
            map.set(digits, n2);
            map.set(digits.slice(-10), n2);
          }
        }
        for (const row of db
          .prepare(
            `SELECT r.ZFIRSTNAME, r.ZLASTNAME, r.ZORGANIZATION, e.ZADDRESS as val
             FROM ZABCDEMAILADDRESS e JOIN ZABCDRECORD r ON e.ZOWNER = r.Z_PK`
          )
          .iterate() as IterableIterator<never>) {
          const r = row as {
            ZFIRSTNAME: string | null;
            ZLASTNAME: string | null;
            ZORGANIZATION: string | null;
            val: string | null;
          };
          const n2 = name(r);
          if (n2 && r.val) map.set(r.val.toLowerCase(), n2);
        }
      } finally {
        db.close();
      }
    } catch {
      // one unreadable source shouldn't kill the sync
    }
  });
  return map;
}

export function resolveName(
  identifier: string,
  contacts: Map<string, string>
): string {
  if (identifier.includes("@")) {
    return contacts.get(identifier.toLowerCase()) ?? identifier;
  }
  const digits = normalizePhone(identifier);
  return (
    contacts.get(digits) ??
    contacts.get(digits.slice(-10)) ??
    formatIdentifier(identifier)
  );
}

export function runSync(): { threads: number; messages: number } {
  fs.mkdirSync(RAW_DIR, { recursive: true });

  let chatCopy: string;
  try {
    chatCopy = copyIntoRaw(CHAT_DB, "chat.db");
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "EPERM" || err.code === "EACCES" || err.code === "ENOENT") {
      throw new PermissionError();
    }
    throw e;
  }

  const contacts = loadContacts();
  const Database = sqlite();
  const src = new Database(chatCopy);
  // Recover any WAL content from the copied files, then read.
  try {
    src.pragma("wal_checkpoint(TRUNCATE)");
  } catch {
    /* readonly fallback is fine */
  }

  type ChatRow = {
    rowid: number;
    guid: string;
    chat_identifier: string | null;
    display_name: string | null;
    style: number;
  };
  const chats = src
    .prepare(
      "SELECT ROWID as rowid, guid, chat_identifier, display_name, style FROM chat"
    )
    .all() as ChatRow[];

  const participantsByChat = new Map<number, string[]>();
  for (const row of src
    .prepare(
      `SELECT chj.chat_id as chat_id, h.id as handle
       FROM chat_handle_join chj JOIN handle h ON h.ROWID = chj.handle_id`
    )
    .all() as { chat_id: number; handle: string }[]) {
    const list = participantsByChat.get(row.chat_id) ?? [];
    if (!list.includes(row.handle)) list.push(row.handle);
    participantsByChat.set(row.chat_id, list);
  }

  // Direct chats are merged by identifier so SMS + iMessage with the same
  // person become one thread. Groups keyed by guid.
  type ThreadAgg = {
    id: string;
    name: string;
    participants: string[];
    isGroup: boolean;
  };
  const threadByChatRowid = new Map<number, string>();
  const threads = new Map<string, ThreadAgg>();
  for (const c of chats) {
    const isGroup = c.style === 43;
    const identifier = c.chat_identifier ?? c.guid;
    const id = isGroup ? `group:${c.guid}` : `direct:${identifier}`;
    threadByChatRowid.set(c.rowid, id);
    if (!threads.has(id)) {
      const handles = participantsByChat.get(c.rowid) ?? [identifier];
      const names = handles.map((h) => resolveName(h, contacts));
      threads.set(id, {
        id,
        name: isGroup
          ? c.display_name?.trim() || names.slice(0, 4).join(", ")
          : names[0] ?? formatIdentifier(identifier),
        participants: names,
        isGroup,
      });
    }
  }

  fs.rmSync(INDEX_DB, { force: true });
  fs.rmSync(INDEX_DB + "-wal", { force: true });
  fs.rmSync(INDEX_DB + "-shm", { force: true });
  const out = new Database(INDEX_DB);
  out.pragma("journal_mode = WAL");
  out.exec(`
    CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE threads(
      id TEXT PRIMARY KEY, name TEXT, participants TEXT, is_group INT,
      last_date INT DEFAULT 0, last_text TEXT DEFAULT '', message_count INT DEFAULT 0
    );
    CREATE TABLE messages(
      id INTEGER PRIMARY KEY, thread_id TEXT, sender TEXT,
      is_from_me INT, date INT, text TEXT
    );
    CREATE INDEX idx_msg_thread ON messages(thread_id, date);
    CREATE VIRTUAL TABLE messages_fts USING fts5(text, content='messages', content_rowid='id');
  `);

  const insertThread = out.prepare(
    "INSERT INTO threads(id, name, participants, is_group) VALUES (?, ?, ?, ?)"
  );
  const insertMsg = out.prepare(
    "INSERT OR IGNORE INTO messages(id, thread_id, sender, is_from_me, date, text) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertFts = out.prepare(
    "INSERT INTO messages_fts(rowid, text) VALUES (?, ?)"
  );

  let messageCount = 0;
  const insertAll = out.transaction(() => {
    for (const t of threads.values()) {
      insertThread.run(t.id, t.name, JSON.stringify(t.participants), t.isGroup ? 1 : 0);
    }
    type MsgRow = {
      id: number;
      text: string | null;
      attributedBody: Buffer | null;
      is_from_me: number;
      date: number;
      handle: string | null;
      chat_id: number;
    };
    const stmt = src.prepare(
      `SELECT m.ROWID as id, m.text, m.attributedBody, m.is_from_me, m.date,
              h.id as handle, cmj.chat_id as chat_id
       FROM message m
       JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
       LEFT JOIN handle h ON h.ROWID = m.handle_id
       WHERE COALESCE(m.associated_message_type, 0) = 0
         AND COALESCE(m.item_type, 0) = 0`
    );
    for (const row of stmt.iterate() as IterableIterator<MsgRow>) {
      const threadId = threadByChatRowid.get(row.chat_id);
      if (!threadId) continue;
      const text = extractText(row.text, row.attributedBody);
      if (!text) continue; // attachments-only, reactions, etc.
      const sender =
        row.is_from_me || !row.handle ? "" : resolveName(row.handle, contacts);
      insertMsg.run(
        row.id,
        threadId,
        sender,
        row.is_from_me ? 1 : 0,
        appleToUnixMs(row.date),
        text
      );
      insertFts.run(row.id, text);
      messageCount++;
    }
    out.exec(`
      UPDATE threads SET
        message_count = (SELECT COUNT(*) FROM messages m WHERE m.thread_id = threads.id),
        last_date = COALESCE((SELECT MAX(date) FROM messages m WHERE m.thread_id = threads.id), 0),
        last_text = COALESCE((SELECT text FROM messages m WHERE m.thread_id = threads.id ORDER BY date DESC LIMIT 1), '');
      DELETE FROM threads WHERE message_count = 0;
    `);
  });
  insertAll();

  out
    .prepare("INSERT OR REPLACE INTO meta(key, value) VALUES ('lastSync', ?)")
    .run(String(Date.now()));

  const threadCount = (
    out.prepare("SELECT COUNT(*) as c FROM threads").get() as { c: number }
  ).c;
  src.close();
  out.close();
  return { threads: threadCount, messages: messageCount };
}
