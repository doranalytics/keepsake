"use client";

import { useEffect, useRef, useState } from "react";
import { CircleStop, Download, RefreshCw, Send, Sparkles } from "lucide-react";
import type { AppStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Entry = { role: "user" | "ai"; text: string };
type Ollama = AppStatus["ollama"];

const DEFAULT_PULL = "qwen3.6:27b";
const MODEL_KEY = "keepsake-ollama-model";

const gb = (bytes: number) => `${(bytes / 1e9).toFixed(0)} GB`;

export function AiPanel({
  threadId,
  threadName,
  status,
}: {
  threadId: string;
  threadName: string;
  status: AppStatus | null;
}) {
  const [ollama, setOllama] = useState<Ollama | null>(status?.ollama ?? null);
  const [checking, setChecking] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [pull, setPull] = useState<{ pct: number; label: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEntries([]);
    setError(null);
    abortRef.current?.abort();
    setBusy(false);
  }, [threadId]);

  useEffect(() => {
    if (status?.ollama) setOllama(status.ollama);
  }, [status]);

  // resolve the active model: user choice if still installed, else server default
  useEffect(() => {
    if (!ollama) return;
    const saved = localStorage.getItem(MODEL_KEY);
    if (saved && ollama.models.some((m) => m.name === saved)) setModel(saved);
    else setModel(ollama.model);
  }, [ollama]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const refresh = async () => {
    setChecking(true);
    try {
      const s = (await fetch("/api/status").then((r) => r.json())) as AppStatus;
      setOllama(s.ollama);
    } finally {
      setChecking(false);
    }
  };

  const startPull = async () => {
    setError(null);
    setPull({ pct: 0, label: "Starting download…" });
    try {
      const res = await fetch("/api/ai/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: DEFAULT_PULL }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Download failed.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const j = JSON.parse(line) as {
              status?: string;
              total?: number;
              completed?: number;
              error?: string;
            };
            if (j.error) throw new Error(j.error);
            if (j.total && j.completed !== undefined) {
              setPull({
                pct: Math.round((j.completed / j.total) * 100),
                label: `Downloading — ${gb(j.completed)} of ${gb(j.total)}`,
              });
            } else if (j.status) {
              setPull((p) => ({ pct: p?.pct ?? 0, label: j.status! }));
            }
          } catch (e) {
            if ((e as Error).message !== "Unexpected end of JSON input") throw e;
          }
        }
      }
      setPull(null);
      await refresh();
    } catch (e) {
      setPull(null);
      setError((e as Error).message);
    }
  };

  const run = async (mode: "summarize" | "ask", q?: string) => {
    if (busy) return;
    setError(null);
    setBusy(true);
    setEntries((e) => [
      ...e,
      { role: "user", text: mode === "summarize" ? `Summarize my conversation with ${threadName}` : q! },
      { role: "ai", text: "" },
    ]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, mode, question: q, model: model ?? undefined }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "AI request failed.");
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setEntries((e) => {
          const copy = [...e];
          copy[copy.length - 1] = { role: "ai", text: copy[copy.length - 1].text + chunk };
          return copy;
        });
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message);
        setEntries((en) => (en[en.length - 1]?.text === "" ? en.slice(0, -2) : en));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  // ---------- demo mode ----------
  if (status?.mode === "demo") {
    return (
      <SetupShell
        title="On-device AI"
        body="Summaries and thread Q&A run privately through Ollama when Sidenote runs on your Mac. Nothing ever leaves your computer."
      />
    );
  }

  // ---------- ollama not running ----------
  if (ollama && !ollama.running) {
    return (
      <SetupShell
        title="Turn on on-device AI"
        body="Sidenote uses Ollama — a free app that runs AI models privately on your Mac. Install it, open it once, and come back."
      >
        <div className="flex flex-col items-center gap-2">
          <Button
            asChild
            className="h-10 rounded-full bg-[#0a84ff] px-5 text-[13.5px] hover:bg-[#0974df]"
          >
            <a href="https://ollama.com/download" target="_blank" rel="noreferrer">
              <Download className="mr-1.5 size-4" /> Download Ollama — free
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={checking}
            className="text-[13px] text-muted-foreground"
          >
            <RefreshCw className={cn("mr-1.5 size-3.5", checking && "animate-spin")} />
            I&apos;ve installed it — check again
          </Button>
        </div>
      </SetupShell>
    );
  }

  // ---------- running, no model yet ----------
  if (ollama && ollama.running && ollama.models.length === 0) {
    return (
      <SetupShell
        title="Download the AI model"
        body="One-time download of Qwen 3.6 (about 17 GB). It runs entirely on your Mac — after this, AI works offline."
      >
        {pull ? (
          <div className="w-full max-w-[260px] space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/10">
              <div
                className="h-full rounded-full bg-[#0a84ff] transition-all duration-300"
                style={{ width: `${pull.pct}%` }}
              />
            </div>
            <p className="text-center text-[12px] text-muted-foreground">
              {pull.label} {pull.pct > 0 && `· ${pull.pct}%`}
            </p>
          </div>
        ) : (
          <Button
            onClick={startPull}
            className="h-10 rounded-full bg-[#0a84ff] px-5 text-[13.5px] hover:bg-[#0974df]"
          >
            <Download className="mr-1.5 size-4" /> Download model
          </Button>
        )}
        {error && <p className="text-center text-[12.5px] text-red-500">{error}</p>}
      </SetupShell>
    );
  }

  // ---------- ready ----------
  return (
    <div className="flex h-full flex-col">
      {ollama && ollama.models.length > 1 && (
        <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
          <span className="text-[11px] font-medium text-muted-foreground uppercase">Model</span>
          <select
            value={model ?? ""}
            onChange={(e) => {
              setModel(e.target.value);
              localStorage.setItem(MODEL_KEY, e.target.value);
            }}
            className="h-7 flex-1 rounded-md border-none bg-black/[0.05] px-2 text-[12.5px] outline-none dark:bg-white/10"
          >
            {ollama.models.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name} ({gb(m.size)})
              </option>
            ))}
          </select>
        </div>
      )}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {entries.length === 0 ? (
          <div className="pt-6 text-center">
            <p className="text-sm font-semibold">Ask about this thread</p>
            <p className="mx-auto mt-1 max-w-[30ch] text-[13px] text-muted-foreground">
              Answers come from {model ?? "your local model"}, running on your Mac. Nothing leaves
              your computer.
            </p>
            <Button
              size="sm"
              className="mt-4 rounded-full bg-[#0a84ff] hover:bg-[#0974df]"
              onClick={() => run("summarize")}
            >
              <Sparkles className="mr-1.5 size-3.5" />
              Summarize this thread
            </Button>
            <div className="mx-auto mt-5 max-w-[32ch] space-y-1.5">
              {["What plans did we make?", "What should I remember about them?"].map((s) => (
                <button
                  key={s}
                  onClick={() => run("ask", s)}
                  className="block w-full rounded-lg border px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          entries.map((e, i) => (
            <div key={i} className={cn("flex", e.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[90%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed whitespace-pre-wrap",
                  e.role === "user" ? "bg-[#0a84ff] text-white" : "bg-black/[0.05] dark:bg-white/[0.08]"
                )}
              >
                {e.text ||
                  (busy && i === entries.length - 1 ? (
                    <span className="inline-flex gap-1 py-1">
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:120ms]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:240ms]" />
                    </span>
                  ) : (
                    ""
                  ))}
              </div>
            </div>
          ))
        )}
        {error && <p className="text-center text-[13px] text-red-500">{error}</p>}
      </div>
      <form
        className="flex shrink-0 items-center gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const q = question.trim();
          if (!q) return;
          setQuestion("");
          run("ask", q);
        }}
      >
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={`Ask about ${threadName}…`}
          disabled={busy}
          className="h-9 rounded-full border-none bg-black/[0.06] shadow-none dark:bg-white/10"
        />
        {busy ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => abortRef.current?.abort()}
            aria-label="Stop"
          >
            <CircleStop className="size-5 text-[#0a84ff]" />
          </Button>
        ) : (
          <Button
            type="submit"
            size="icon"
            disabled={!question.trim()}
            className="rounded-full bg-[#0a84ff] hover:bg-[#0974df]"
            aria-label="Send"
          >
            <Send className="size-4" />
          </Button>
        )}
      </form>
    </div>
  );
}

function SetupShell({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[#0a84ff]/10">
        <Sparkles className="size-6 text-[#0a84ff]" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-[30ch] text-[13px] leading-relaxed text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}
