export type Thread = {
  id: string;
  name: string;
  participants: string[];
  isGroup: boolean;
  lastDate: number; // unix ms
  lastText: string;
  messageCount: number;
};

export type Attachment = {
  id: number;
  mime: string;
  name: string;
};

export type Message = {
  id: number;
  threadId: string;
  sender: string; // display name of sender ("" when from me)
  isFromMe: boolean;
  date: number; // unix ms
  text: string; // "" for attachment-only messages
  dateRead?: number; // unix ms — when the recipient read it (outgoing only)
  attachments?: Attachment[];
};

export type SearchResult = {
  message: Message;
  threadName: string;
  snippet: string;
};

export type AppStatus = {
  mode: "demo" | "local";
  synced: boolean;
  lastSync: number | null;
  threadCount: number;
  messageCount: number;
  ollama: {
    running: boolean;
    model: string | null;
    models: { name: string; size: number }[];
  };
  engine?: string; // path of the node binary that needs Full Disk Access (local mode)
};

export type UpdateInfo = {
  current: string | null; // installed git sha
  currentDate: string | null; // installed commit date (YYYY-MM-DD)
  latest: string | null; // newest sha on GitHub main
  updateAvailable: boolean;
  managed: boolean; // running under the LaunchAgent (can self-update)
  news: { date: string; title: string; points: string[] }[];
};
