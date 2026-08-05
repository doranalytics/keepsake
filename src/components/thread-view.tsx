"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ChevronLeft,
  NotebookPen,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type { Message, SearchResult, Thread } from "@/lib/types";
import { formatListDate, formatSeparator } from "@/lib/format";
import { AvatarBadge } from "@/components/avatar-badge";
import { Snippet } from "@/components/thread-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const GAP_FOR_SEPARATOR = 3600_000; // 1h

export function ThreadView({
  threadId,
  initialAnchor,
  onBack,
  onOpenPanel,
}: {
  threadId: string;
  initialAnchor: number | null;
  onBack: () => void;
  onOpenPanel: (tab: "notes" | "ai") => void;
}) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasEarlier, setHasEarlier] = useState(false);
  const [hasLater, setHasLater] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<number | null>(initialAnchor);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<"bottom" | number | null>("bottom");

  useEffect(() => {
    setAnchor(initialAnchor);
    setSearchOpen(false);
    setSearchQ("");
    setSearchResults(null);
  }, [threadId, initialAnchor]);

  const load = useCallback(
    async (around: number | null) => {
      setLoading(true);
      setError(null);
      try {
        const url = `/api/threads/${encodeURIComponent(threadId)}/messages${
          around ? `?around=${around}` : ""
        }`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Couldn't load this conversation.");
        const data = await res.json();
        setThread(data.thread);
        setMessages(data.messages);
        setHasEarlier(data.hasEarlier);
        setHasLater(data.hasLater);
        pendingScroll.current = around ?? "bottom";
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [threadId]
  );

  useEffect(() => {
    load(anchor);
  }, [load, anchor]);

  // scroll into place after messages render
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || pendingScroll.current === null || loading) return;
    if (pendingScroll.current === "bottom") {
      el.scrollTop = el.scrollHeight;
    } else {
      const target = el.querySelector(`[data-mid="${pendingScroll.current}"]`);
      target?.scrollIntoView({ block: "center" });
    }
    pendingScroll.current = null;
  }, [messages, loading]);

  const loadEarlier = async () => {
    if (messages.length === 0 || loadingEarlier) return;
    setLoadingEarlier(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const res = await fetch(
        `/api/threads/${encodeURIComponent(threadId)}/messages?before=${messages[0].date}`
      );
      const data = await res.json();
      setMessages((m) => [...data.messages, ...m]);
      setHasEarlier(data.hasEarlier);
      requestAnimationFrame(() => {
        if (el) el.scrollTop += el.scrollHeight - prevHeight;
      });
    } finally {
      setLoadingEarlier(false);
    }
  };

  // in-thread search
  useEffect(() => {
    const q = searchQ.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&threadId=${encodeURIComponent(threadId)}`
      );
      const data = await res.json();
      setSearchResults(data.results ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [searchQ, threadId]);

  const jumpTo = (id: number) => {
    setSearchOpen(false);
    setSearchQ("");
    setSearchResults(null);
    if (messages.some((m) => m.id === id)) {
      pendingScroll.current = id;
      setMessages((m) => [...m]); // trigger the scroll effect
      setAnchor(id);
    } else {
      setAnchor(id);
    }
  };

  return (
    <div className="relative flex h-full min-w-0 flex-1 flex-col bg-background">
      {/* header */}
      <div className="z-10 flex shrink-0 items-center gap-2 border-b bg-background/90 px-3 py-2 backdrop-blur">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Back">
          <ChevronLeft className="size-5" />
        </Button>
        {thread ? (
          <>
            <AvatarBadge name={thread.name} isGroup={thread.isGroup} className="size-9 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] leading-tight font-semibold">{thread.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {thread.isGroup
                  ? thread.participants.join(", ")
                  : `${thread.messageCount.toLocaleString()} messages`}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center gap-2">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSearchOpen((s) => !s)}
          aria-label="Search this conversation"
          className={cn(searchOpen && "bg-black/[0.06] dark:bg-white/10")}
        >
          <Search className="size-4.5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onOpenPanel("notes")} aria-label="Notes">
          <NotebookPen className="size-4.5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onOpenPanel("ai")} aria-label="Ask AI">
          <Sparkles className="size-4.5" />
        </Button>
      </div>

      {/* in-thread search */}
      {searchOpen && (
        <div className="z-10 shrink-0 border-b bg-background px-3 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder={`Search with ${thread?.name ?? "this chat"}`}
              className="h-9 rounded-lg border-none bg-black/[0.06] pl-8 shadow-none dark:bg-white/10"
            />
            <button
              onClick={() => {
                setSearchOpen(false);
                setSearchQ("");
              }}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Close search"
            >
              <X className="size-4" />
            </button>
          </div>
          {searchResults && (
            <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border bg-background shadow-sm">
              {searchResults.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No matches in this conversation.
                </p>
              ) : (
                searchResults.map((r) => (
                  <button
                    key={r.message.id}
                    onClick={() => jumpTo(r.message.id)}
                    className="block w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-medium">
                        {r.message.isFromMe ? "You" : r.message.sender || thread?.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatListDate(r.message.date)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[13px] text-muted-foreground">
                      <Snippet text={r.snippet} />
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="space-y-3 pt-6">
            {[64, 40, 56, 32, 72, 48].map((w, i) => (
              <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
                <Skeleton className="h-9 rounded-2xl" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="pt-16 text-center">
            <p className="text-sm font-medium">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => load(anchor)}>
              Try again
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <p className="pt-16 text-center text-sm text-muted-foreground">
            No text messages in this conversation.
          </p>
        ) : (
          <>
            {hasEarlier && (
              <div className="pb-3 text-center">
                <Button variant="ghost" size="sm" onClick={loadEarlier} disabled={loadingEarlier} className="text-[13px] text-[#0a84ff]">
                  {loadingEarlier ? "Loading…" : "Load earlier messages"}
                </Button>
              </div>
            )}
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const showSep = !prev || m.date - prev.date > GAP_FOR_SEPARATOR;
              const showSender =
                thread?.isGroup && !m.isFromMe && (showSep || !prev || prev.sender !== m.sender);
              return (
                <div key={m.id} data-mid={m.id}>
                  {showSep && (
                    <p className="py-3 text-center text-[11px] font-medium text-muted-foreground">
                      {formatSeparator(m.date)}
                    </p>
                  )}
                  {showSender && (
                    <p className="mb-0.5 ml-3 text-[11px] text-muted-foreground">{m.sender}</p>
                  )}
                  <div className={cn("flex pb-0.5", m.isFromMe ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-3.5 py-1.5 text-[15px] leading-snug whitespace-pre-wrap md:max-w-[65%]",
                        m.isFromMe
                          ? "bg-[#0a84ff] text-white"
                          : "bg-[#e9e9eb] text-black dark:bg-[#26262a] dark:text-white",
                        anchor === m.id && "ring-2 ring-[#ffcc00] ring-offset-2 ring-offset-background"
                      )}
                    >
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            })}
            {hasLater && (
              <div className="sticky bottom-0 pt-2 text-center">
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full shadow-md"
                  onClick={() => setAnchor(null)}
                >
                  <ArrowDown className="mr-1 size-3.5" /> Jump to latest
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
