import type { Message } from "./types";

// Client-side data layer for notes and pinned messages.
//
// On a real install these live in ~/.sidenote/vault.db, served over /api/notes.
// They used to live in localStorage, which the WKWebView shell does not persist
// — that is how notes were being lost. The hosted demo has no filesystem to
// write to, so it still uses localStorage; nothing there is meant to survive.

export type SavedMessage = {
  id: number;
  text: string;
  sender: string;
  isFromMe: boolean;
  date: number;
  savedAt: number;
};

const NOTE_PREFIX = "keepsake-notes:";
const SAVED_PREFIX = "keepsake-saved:";

const noteKey = (threadId: string) => `${NOTE_PREFIX}${threadId}`;
const savedKey = (threadId: string) => `${SAVED_PREFIX}${threadId}`;

// ---------- notes ----------

export async function loadNote(threadId: string, demo: boolean): Promise<string> {
  if (demo) return localStorage.getItem(noteKey(threadId)) ?? "";
  const res = await fetch(`/api/notes?threadId=${encodeURIComponent(threadId)}`);
  if (!res.ok) throw new Error("Couldn't load this note.");
  return ((await res.json()) as { body: string }).body ?? "";
}

export async function saveNote(threadId: string, body: string, demo: boolean): Promise<void> {
  if (demo) {
    localStorage.setItem(noteKey(threadId), body);
    return;
  }
  const res = await fetch("/api/notes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId, body }),
  });
  if (!res.ok) throw new Error("Couldn't save this note.");
}

// ---------- pinned messages ----------

function readLocalSaved(threadId: string): SavedMessage[] {
  try {
    const raw = localStorage.getItem(savedKey(threadId));
    return raw ? (JSON.parse(raw) as SavedMessage[]) : [];
  } catch {
    return [];
  }
}

export async function loadSavedMessages(
  threadId: string,
  demo: boolean
): Promise<SavedMessage[]> {
  if (demo) return readLocalSaved(threadId);
  const res = await fetch(`/api/notes/saved?threadId=${encodeURIComponent(threadId)}`);
  if (!res.ok) throw new Error("Couldn't load saved messages.");
  return ((await res.json()) as { messages: SavedMessage[] }).messages ?? [];
}

// Resolves false when the message was already pinned.
export async function saveMessage(
  threadId: string,
  m: Message,
  demo: boolean
): Promise<boolean> {
  if (demo) {
    const list = readLocalSaved(threadId);
    if (list.some((s) => s.id === m.id)) return false;
    list.push({
      id: m.id,
      text: m.text,
      sender: m.sender,
      isFromMe: m.isFromMe,
      date: m.date,
      savedAt: Date.now(),
    });
    list.sort((a, b) => a.date - b.date);
    localStorage.setItem(savedKey(threadId), JSON.stringify(list));
    return true;
  }
  const res = await fetch("/api/notes/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      threadId,
      message: {
        id: m.id,
        text: m.text,
        sender: m.sender,
        isFromMe: m.isFromMe,
        date: m.date,
      },
    }),
  });
  if (!res.ok) throw new Error("Couldn't save that message.");
  return ((await res.json()) as { fresh: boolean }).fresh;
}

export async function removeSavedMessage(
  threadId: string,
  id: number,
  demo: boolean
): Promise<void> {
  if (demo) {
    const list = readLocalSaved(threadId).filter((s) => s.id !== id);
    localStorage.setItem(savedKey(threadId), JSON.stringify(list));
    return;
  }
  const res = await fetch(
    `/api/notes/saved?threadId=${encodeURIComponent(threadId)}&messageId=${id}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error("Couldn't remove that saved message.");
}

// ---------- legacy rescue ----------

// Sweeps anything the old localStorage build left behind into the vault. Runs
// once per install; the server refuses a second import, and the keys are only
// dropped after the server confirms it took them.
export async function importLegacyNotes(): Promise<void> {
  const status = await fetch("/api/notes/import")
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  if (!status || status.imported) return;

  const notes: { threadId: string; body: string }[] = [];
  const saved: { threadId: string; messages: SavedMessage[] }[] = [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith(NOTE_PREFIX)) {
      const body = localStorage.getItem(key) ?? "";
      if (body.trim()) notes.push({ threadId: key.slice(NOTE_PREFIX.length), body });
      keys.push(key);
    } else if (key.startsWith(SAVED_PREFIX)) {
      const threadId = key.slice(SAVED_PREFIX.length);
      const messages = readLocalSaved(threadId);
      if (messages.length) saved.push({ threadId, messages });
      keys.push(key);
    }
  }

  const res = await fetch("/api/notes/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes, saved }),
  });
  if (!res.ok) return; // leave localStorage alone and try again next launch
  for (const key of keys) localStorage.removeItem(key);
}
