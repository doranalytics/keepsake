// Client-side data layer for AI conversations. Each iMessage thread can hold
// any number of them, and they live in ~/.sidenote/vault.db — the panel used to
// keep them in React state alone, so switching threads erased them.

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

export async function listConversations(threadId: string): Promise<AiConversation[]> {
  const res = await fetch(`/api/conversations?threadId=${encodeURIComponent(threadId)}`);
  if (!res.ok) throw new Error("Couldn't load your AI chats.");
  return ((await res.json()) as { conversations: AiConversation[] }).conversations ?? [];
}

export async function createConversation(threadId: string): Promise<AiConversation> {
  const res = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId }),
  });
  if (!res.ok) throw new Error("Couldn't start a new chat.");
  return ((await res.json()) as { conversation: AiConversation }).conversation;
}

export async function loadConversation(
  id: string
): Promise<{ conversation: AiConversation; messages: AiMessage[] }> {
  const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Couldn't open that chat.");
  return (await res.json()) as { conversation: AiConversation; messages: AiMessage[] };
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Couldn't rename that chat.");
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Couldn't delete that chat.");
}
