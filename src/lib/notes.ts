import type { Message } from "./types";

export function notesKey(threadId: string): string {
  return `keepsake-notes:${threadId}`;
}

// Pinned messages live alongside free-form notes, keyed per thread.
export type SavedMessage = {
  id: number;
  text: string;
  sender: string;
  isFromMe: boolean;
  date: number;
  savedAt: number;
};

function savedKey(threadId: string): string {
  return `keepsake-saved:${threadId}`;
}

export function getSavedMessages(threadId: string): SavedMessage[] {
  try {
    const raw = localStorage.getItem(savedKey(threadId));
    return raw ? (JSON.parse(raw) as SavedMessage[]) : [];
  } catch {
    return [];
  }
}

// Returns false if the message was already saved.
export function saveMessage(threadId: string, m: Message): boolean {
  const list = getSavedMessages(threadId);
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

export function removeSavedMessage(threadId: string, id: number) {
  const list = getSavedMessages(threadId).filter((s) => s.id !== id);
  localStorage.setItem(savedKey(threadId), JSON.stringify(list));
}
