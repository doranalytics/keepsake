"use client";

import { useEffect, useRef, useState } from "react";
import { Search, RefreshCw, Settings, X } from "lucide-react";
import type { AppStatus, SearchResult, Thread } from "@/lib/types";
import { formatListDate } from "@/lib/format";
import { AvatarBadge } from "@/components/avatar-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Renders `snippet()` output where matches are wrapped in [brackets].
export function Snippet({ text }: { text: string }) {
  const parts = text.split(/\[([^\]]*)\]/g);
  return (
    <span>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded-sm bg-[#0a84ff]/15 px-0.5 font-semibold text-[#0a84ff] dark:bg-[#0a84ff]/25 dark:text-[#6db2ff]"
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </span>
  );
}

export function ThreadList({
  status,
  threads,
  loading,
  activeId,
  syncing,
  onSync,
  onSelect,
  onOpenSettings,
}: {
  status: AppStatus | null;
  threads: Thread[];
  loading: boolean;
  activeId: string | null;
  syncing: boolean;
  onSync: () => void;
  onSelect: (threadId: string, messageId?: number) => void;
  onOpenSettings: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [matchedThreads, setMatchedThreads] = useState<Thread[]>([]);
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      setMatchedThreads([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const mySeq = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const [sr, tr] = await Promise.all([
          fetch(`/api/search?q=${encodeURIComponent(q)}`).then((r) => r.json()),
          fetch(`/api/threads?q=${encodeURIComponent(q)}`).then((r) => r.json()),
        ]);
        if (seq.current !== mySeq) return;
        setResults(sr.results ?? []);
        setMatchedThreads(tr.threads ?? []);
      } finally {
        if (seq.current === mySeq) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const isSearchMode = query.trim().length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-3 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Sidenote</h1>
          <div className="flex items-center gap-2">
            {status?.mode === "demo" && (
              <Badge variant="secondary" className="text-[11px]">
                Demo data
              </Badge>
            )}
            {status?.mode === "local" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onSync}
                disabled={syncing}
                title="Sync from Messages"
                className="h-8 gap-1.5 text-[13px] text-muted-foreground"
              >
                <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
                {syncing ? "Syncing…" : "Sync"}
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={onOpenSettings}
              title="Settings — AI model & more"
              aria-label="Open settings"
              className="size-8 text-muted-foreground"
            >
              <Settings className="size-4" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people and messages"
            className="h-9 rounded-lg border-none bg-black/[0.06] pl-8 shadow-none dark:bg-white/10"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {loading ? (
          <div className="space-y-1 px-2 pt-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <Skeleton className="size-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : isSearchMode ? (
          <SearchResults
            searching={searching}
            results={results}
            matchedThreads={matchedThreads}
            onSelect={onSelect}
          />
        ) : threads.length === 0 ? (
          <p className="px-4 pt-8 text-center text-sm text-muted-foreground">
            No conversations yet. Sync your Messages to get started.
          </p>
        ) : (
          threads.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors",
                activeId === t.id
                  ? "bg-[#0a84ff] text-white"
                  : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              )}
            >
              <AvatarBadge name={t.name} isGroup={t.isGroup} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[15px] font-semibold">{t.name}</span>
                  <span
                    className={cn(
                      "shrink-0 text-xs",
                      activeId === t.id ? "text-white/75" : "text-muted-foreground"
                    )}
                  >
                    {formatListDate(t.lastDate)}
                  </span>
                </div>
                <p
                  className={cn(
                    "line-clamp-2 text-[13px] leading-snug",
                    activeId === t.id ? "text-white/80" : "text-muted-foreground"
                  )}
                >
                  {t.lastText}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function SearchResults({
  searching,
  results,
  matchedThreads,
  onSelect,
}: {
  searching: boolean;
  results: SearchResult[] | null;
  matchedThreads: Thread[];
  onSelect: (threadId: string, messageId?: number) => void;
}) {
  if (searching && results === null) {
    return (
      <div className="space-y-3 px-2 pt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  const empty = (results?.length ?? 0) === 0 && matchedThreads.length === 0;
  if (empty) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-sm font-medium">No matches</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Try a different name or phrase.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4 pt-1">
      {matchedThreads.length > 0 && (
        <div>
          <p className="px-2.5 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            People & chats
          </p>
          {matchedThreads.slice(0, 6).map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              <AvatarBadge name={t.name} isGroup={t.isGroup} className="size-9 text-xs" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.messageCount.toLocaleString()} messages
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      {(results?.length ?? 0) > 0 && (
        <div>
          <p className="px-2.5 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Messages
          </p>
          {results!.map((r) => (
            <button
              key={r.message.id}
              onClick={() => onSelect(r.message.threadId, r.message.id)}
              className="w-full rounded-xl px-2.5 py-2 text-left hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold">{r.threadName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatListDate(r.message.date)}
                </span>
              </div>
              <p className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                {r.message.isFromMe ? "You: " : r.message.sender ? `${r.message.sender}: ` : ""}
                <Snippet text={r.snippet} />
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
