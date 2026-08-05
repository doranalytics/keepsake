"use client";

import { useEffect, useState } from "react";
import { ArrowUpCircle, Check, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import type { AppStatus, UpdateInfo } from "@/lib/types";
import { resolveModel, saveModel } from "@/lib/model-pref";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const gb = (bytes: number) => `${(bytes / 1e9).toFixed(0)} GB`;

function UpdatesSection({
  update,
  updating,
  onUpdate,
  onCheckUpdate,
}: {
  update: UpdateInfo | null;
  updating: boolean;
  onUpdate?: () => void;
  onCheckUpdate?: () => Promise<UpdateInfo | null>;
}) {
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);

  const checkNow = async () => {
    if (!onCheckUpdate) return;
    setChecking(true);
    try {
      await onCheckUpdate();
      setChecked(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <section>
      <h3 className="text-[13px] font-semibold">Updates</h3>
      {update?.currentDate && (
        <p className="mt-1 text-[12px] text-muted-foreground">
          Installed version: {update.currentDate}
          {update.current && (
            <span className="font-mono"> · {update.current.slice(0, 7)}</span>
          )}
        </p>
      )}
      {update?.updateAvailable ? (
        <>
          <div className="mt-2.5 rounded-xl border border-[#0a84ff]/25 bg-[#0a84ff]/5 p-3">
            <p className="text-[13px] font-medium">
              A new version is ready
              {update.news[0] ? `: ${update.news[0].title}` : ""}
            </p>
            {update.news[0]?.points?.length ? (
              <ul className="mt-1.5 space-y-1 text-[12.5px] text-muted-foreground">
                {update.news[0].points.slice(0, 3).map((p) => (
                  <li key={p} className="flex gap-1.5">
                    <span className="text-[#0a84ff]">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            ) : null}
            <Button
              size="sm"
              onClick={onUpdate}
              disabled={updating || !update.managed}
              className="mt-2.5 h-8 rounded-lg bg-[#0a84ff] text-[12.5px] hover:bg-[#0974df]"
            >
              {updating ? (
                <>
                  <RefreshCw className="mr-1.5 size-3.5 animate-spin" />
                  Updating — reloads when done…
                </>
              ) : (
                <>
                  <ArrowUpCircle className="mr-1.5 size-3.5" /> Update now
                </>
              )}
            </Button>
            {!update.managed && (
              <p className="mt-2 text-[12px] text-muted-foreground">
                You&apos;re running Sidenote by hand — update in Terminal with{" "}
                <code className="rounded bg-black/[0.06] px-1 py-0.5 text-[11.5px] dark:bg-white/10">
                  git pull && npm run build
                </code>
                , then restart it.
              </p>
            )}
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Takes about a minute; Sidenote restarts and reloads on its own.
          </p>
        </>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[13px] text-muted-foreground">
            {checked ? "You're up to date." : "Updates install with one click from here."}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={checkNow}
            disabled={checking}
            className="h-7 shrink-0 rounded-lg px-2 text-[12.5px] text-muted-foreground"
          >
            <RefreshCw className={cn("mr-1 size-3.5", checking && "animate-spin")} />
            Check now
          </Button>
        </div>
      )}
    </section>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
  status,
  update,
  updating,
  onUpdate,
  onCheckUpdate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: AppStatus | null;
  update?: UpdateInfo | null;
  updating?: boolean;
  onUpdate?: () => void;
  onCheckUpdate?: () => Promise<UpdateInfo | null>;
}) {
  const [ollama, setOllama] = useState<AppStatus["ollama"] | null>(
    status?.ollama ?? null
  );
  const [model, setModel] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const refresh = async () => {
    setChecking(true);
    try {
      const s = (await fetch("/api/status").then((r) => r.json())) as AppStatus;
      setOllama(s.ollama);
    } finally {
      setChecking(false);
    }
  };

  // Re-check Ollama every time the dialog opens so the model list is fresh.
  useEffect(() => {
    if (open && status?.mode === "local") refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (ollama) setModel(resolveModel(ollama.models, ollama.model));
  }, [ollama]);

  const pick = (name: string) => {
    setModel(name);
    saveModel(name);
  };

  const isDemo = status?.mode === "demo";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] gap-0 overflow-y-auto p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-[15px]">Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Choose the AI model and see app info.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5">
          {/* ---------- AI model ---------- */}
          <section>
            <h3 className="text-[13px] font-semibold">AI model</h3>
            {isDemo ? (
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                This is the demo. When Sidenote runs on your Mac, AI answers come
                from a local model through Ollama, and you pick the model here.
              </p>
            ) : !ollama || !ollama.running ? (
              <>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  Ollama isn&apos;t running, so on-device AI is off. Open the
                  Ollama app (or install it — free) and check again.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-[12.5px]"
                  >
                    <a
                      href="https://ollama.com/download"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Get Ollama <ExternalLink className="ml-1 size-3" />
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={refresh}
                    disabled={checking}
                    className="h-8 rounded-lg text-[12.5px] text-muted-foreground"
                  >
                    <RefreshCw
                      className={cn("mr-1 size-3.5", checking && "animate-spin")}
                    />
                    Check again
                  </Button>
                </div>
              </>
            ) : ollama.models.length === 0 ? (
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                Ollama is running but has no models yet. Open{" "}
                <span className="font-medium text-foreground">Ask AI</span> on any
                conversation to download one, or run{" "}
                <code className="rounded bg-black/[0.06] px-1 py-0.5 text-[12px] dark:bg-white/10">
                  ollama pull qwen3.6:27b
                </code>{" "}
                in Terminal.
              </p>
            ) : (
              <>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  Summaries and “Ask AI” answers use this model. Everything runs
                  on your Mac.
                </p>
                <div className="mt-3 overflow-hidden rounded-xl border">
                  {ollama.models.map((m, i) => (
                    <button
                      key={m.name}
                      onClick={() => pick(m.name)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.05]",
                        i > 0 && "border-t"
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-medium">
                          {m.name}
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          {gb(m.size)}
                        </span>
                      </span>
                      {model === m.name && (
                        <Check className="size-4 shrink-0 text-[#0a84ff]" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    Want another model? Run{" "}
                    <code className="rounded bg-black/[0.06] px-1 py-0.5 text-[11.5px] dark:bg-white/10">
                      ollama pull &lt;name&gt;
                    </code>{" "}
                    in Terminal, then refresh.
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={refresh}
                    disabled={checking}
                    aria-label="Refresh model list"
                    className="h-7 shrink-0 rounded-lg px-2 text-muted-foreground"
                  >
                    <RefreshCw
                      className={cn("size-3.5", checking && "animate-spin")}
                    />
                  </Button>
                </div>
              </>
            )}
          </section>

          <Separator />

          {/* ---------- Getting back in ---------- */}
          <section>
            <h3 className="text-[13px] font-semibold">Opening Sidenote</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {isDemo ? (
                <>
                  Once installed, Sidenote lives at{" "}
                  <span className="font-medium text-foreground">
                    localhost:4747
                  </span>{" "}
                  — bookmark it, or come back to sidenote.lol and click{" "}
                  <span className="font-medium text-foreground">
                    Open Sidenote
                  </span>
                  .
                </>
              ) : (
                <>
                  Closed the window? Sidenote keeps running in the background —
                  just open{" "}
                  <span className="font-medium text-foreground">
                    localhost:4747
                  </span>{" "}
                  in your browser (bookmark it). After a restart, visit{" "}
                  <span className="font-medium text-foreground">
                    sidenote.lol
                  </span>{" "}
                  and click{" "}
                  <span className="font-medium text-foreground">
                    Open Sidenote
                  </span>{" "}
                  — it&apos;ll get you back in.
                </>
              )}
            </p>
          </section>

          {/* ---------- Updates ---------- */}
          {!isDemo && (
            <>
              <Separator />
              <UpdatesSection
                update={update ?? null}
                updating={!!updating}
                onUpdate={onUpdate}
                onCheckUpdate={onCheckUpdate}
              />
            </>
          )}

          {/* ---------- Your data ---------- */}
          {!isDemo && status && (
            <>
              <Separator />
              <section>
                <h3 className="text-[13px] font-semibold">Your data</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  {status.synced ? (
                    <>
                      {status.messageCount.toLocaleString()} messages across{" "}
                      {status.threadCount.toLocaleString()} conversations,
                      indexed privately on this Mac.
                      {status.lastSync && (
                        <>
                          {" "}
                          Last synced{" "}
                          {new Date(status.lastSync).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          .
                        </>
                      )}
                    </>
                  ) : (
                    <>Not synced yet — use the Sync button to index your Messages.</>
                  )}{" "}
                  Nothing is uploaded, ever.
                </p>
              </section>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 border-t bg-black/[0.02] px-5 py-3 dark:bg-white/[0.03]">
          <Sparkles className="size-3.5 text-[#0a84ff]" />
          <p className="text-[12px] text-muted-foreground">
            Sidenote — 100% local, private by design.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
