"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircleHeart, RefreshCw, ShieldCheck } from "lucide-react";
import type { AppStatus, Thread } from "@/lib/types";
import { ThreadList } from "@/components/thread-list";
import { ThreadView } from "@/components/thread-view";
import { NotesPanel } from "@/components/notes-panel";
import { AiPanel } from "@/components/ai-panel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function KeepsakeApp() {
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [active, setActive] = useState<{ threadId: string; messageId: number | null } | null>(null);
  const [panel, setPanel] = useState<"notes" | "ai">("notes");
  const [sheetOpen, setSheetOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        fetch("/api/status").then((r) => r.json()),
        fetch("/api/threads").then((r) => r.json()),
      ]);
      setStatus(s);
      setThreads(t.threads ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed.");
      await refresh();
    } catch (e) {
      setSyncError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const select = (threadId: string, messageId?: number) => {
    setActive({ threadId, messageId: messageId ?? null });
  };

  const activeThread = threads.find((t) => t.id === active?.threadId) ?? null;
  const needsSetup = !loading && status?.mode === "local" && !status.synced;

  if (needsSetup) {
    return (
      <SetupScreen syncing={syncing} error={syncError} onSync={sync} />
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* sidebar */}
      <aside
        className={cn(
          "w-full shrink-0 border-r bg-[#f5f5f7] md:w-80 lg:w-[340px] dark:bg-[#1c1c1e]",
          active && "hidden md:block"
        )}
      >
        <div className="flex h-full flex-col">
          {status?.mode === "demo" && (
            <div className="shrink-0 bg-[#0a84ff] px-4 py-1.5 text-center text-[12px] font-medium text-white">
              Browsing sample conversations — run Keepsake on your Mac to search your own
            </div>
          )}
          {syncError && (
            <div className="shrink-0 bg-amber-100 px-4 py-2 text-[12px] leading-snug text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {syncError}
            </div>
          )}
          <div className="min-h-0 flex-1">
            <ThreadList
              status={status}
              threads={threads}
              loading={loading}
              activeId={active?.threadId ?? null}
              syncing={syncing}
              onSync={sync}
              onSelect={select}
            />
          </div>
        </div>
      </aside>

      {/* thread */}
      <main className={cn("min-w-0 flex-1", !active && "hidden md:block")}>
        {active ? (
          <ThreadView
            key={`${active.threadId}:${active.messageId ?? "latest"}`}
            threadId={active.threadId}
            initialAnchor={active.messageId}
            onBack={() => setActive(null)}
            onOpenPanel={(tab) => {
              setPanel(tab);
              setSheetOpen(true);
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-16 items-center justify-center rounded-3xl bg-[#0a84ff]/10">
              <MessageCircleHeart className="size-8 text-[#0a84ff]" />
            </div>
            <p className="text-[15px] font-semibold">Pick a conversation</p>
            <p className="max-w-[32ch] text-sm text-muted-foreground">
              Search everything you&apos;ve ever texted, keep notes on the people you care about,
              and ask AI about any thread.
            </p>
          </div>
        )}
      </main>

      {/* notes / AI side sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-[15px]">{activeThread?.name ?? "Conversation"}</SheetTitle>
          </SheetHeader>
          {active && (
            <Tabs value={panel} onValueChange={(v) => setPanel(v as "notes" | "ai")} className="min-h-0 flex-1 gap-0">
              <TabsList className="mx-4 mt-3 grid w-auto grid-cols-2 self-stretch">
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="ai">Ask AI</TabsTrigger>
              </TabsList>
              <TabsContent value="notes" className="min-h-0 flex-1">
                <NotesPanel threadId={active.threadId} threadName={activeThread?.name ?? ""} />
              </TabsContent>
              <TabsContent value="ai" className="min-h-0 flex-1">
                <AiPanel
                  threadId={active.threadId}
                  threadName={activeThread?.name ?? "this chat"}
                  status={status}
                />
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SetupScreen({
  syncing,
  error,
  onSync,
}: {
  syncing: boolean;
  error: string | null;
  onSync: () => void;
}) {
  return (
    <div className="flex h-dvh items-center justify-center bg-[#f5f5f7] p-6 dark:bg-[#1c1c1e]">
      <div className="w-full max-w-md rounded-3xl border bg-background p-8 shadow-sm">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-[#0a84ff]">
          <MessageCircleHeart className="size-7 text-white" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Welcome to Keepsake</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
          Your iMessage companion. Keepsake copies your Messages history into a private local
          index so you can actually find things — then layers on notes and on-device AI.
        </p>
        <ul className="mt-4 space-y-2 text-[13.5px] text-muted-foreground">
          <li className="flex gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#0a84ff]" />
            Everything stays on your Mac — nothing is uploaded, ever.
          </li>
          <li className="flex gap-2">
            <RefreshCw className="mt-0.5 size-4 shrink-0 text-[#0a84ff]" />
            Re-sync any time to pull in new messages.
          </li>
        </ul>
        <Button
          onClick={onSync}
          disabled={syncing}
          className="mt-6 h-11 w-full rounded-xl bg-[#0a84ff] text-[15px] hover:bg-[#0974df]"
        >
          {syncing ? (
            <>
              <RefreshCw className="mr-2 size-4 animate-spin" /> Syncing your Messages…
            </>
          ) : (
            "Sync your Messages"
          )}
        </Button>
        {error && (
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-[13px] leading-relaxed text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {error}
          </div>
        )}
        <Button
          variant="outline"
          onClick={() => fetch("/api/open-settings", { method: "POST" })}
          className="mt-3 h-10 w-full rounded-xl text-[13.5px]"
        >
          Open Full Disk Access settings
        </Button>
        <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
          First sync needs <span className="font-medium text-foreground">Full Disk Access</span>,
          which macOS only lets you grant by hand: in the settings pane, enable the toggle for the
          terminal app you launched Keepsake from (e.g. Terminal or iTerm), then relaunch it and
          sync again. You&apos;re granting access to that app on your Mac — not to Keepsake&apos;s
          code, and not to any AI or cloud service. Your messages never leave this computer.
        </p>
      </div>
    </div>
  );
}
