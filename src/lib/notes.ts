import type { Message } from "./types";

export function notesKey(threadId: string): string {
  return `keepsake-notes:${threadId}`;
}

// Appends a message to the thread's notes (localStorage) as a quoted memory.
export function addMessageToNotes(threadId: string, m: Message, fallbackName: string) {
  const key = notesKey(threadId);
  const who = m.isFromMe ? "Me" : m.sender || fallbackName;
  const when = new Date(m.date).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const line = `• "${m.text}" — ${who}, ${when}`;
  const existing = localStorage.getItem(key) ?? "";
  localStorage.setItem(key, existing ? `${existing.trimEnd()}\n${line}\n` : `${line}\n`);
}
