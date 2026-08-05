export type Thread = {
  id: string;
  name: string;
  participants: string[];
  isGroup: boolean;
  lastDate: number; // unix ms
  lastText: string;
  messageCount: number;
};

export type Message = {
  id: number;
  threadId: string;
  sender: string; // display name of sender ("" when from me)
  isFromMe: boolean;
  date: number; // unix ms
  text: string;
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
