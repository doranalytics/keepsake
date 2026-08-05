"use client";

import { useEffect, useRef, useState } from "react";
import { CircleStop, Send, Sparkles } from "lucide-react";
import type { AppStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Entry = { role: "user" | "ai"; text: string };

export function AiPanel({
  threadId,
  threadName,
  status,
}: {
  threadId: string;
  threadName: string;
  status: AppStatus | null;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEntries([]);
    setError(null);
    abortRef.current?.abort();
    setBusy(false);
  }, [threadId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

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
        body: JSON.stringify({ threadId, mode, question: q }),
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
          copy[copy.length - 1] = {
            role: "ai",
            text: copy[copy.length - 1].text + chunk,
          };
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

  if (status?.mode === "demo") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#0a84ff]/10">
          <Sparkles className="size-6 text-[#0a84ff]" />
        </div>
        <p className="text-sm font-semibold">On-device AI</p>
        <p className="max-w-[26ch] text-[13px] leading-relaxed text-muted-foreground">
          Summaries and thread Q&A run privately through Ollama when Keepsake runs on your Mac.
          Nothing ever leaves your computer.
        </p>
      </div>
    );
  }

  if (status && !status.ollama.available) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[#0a84ff]/10">
          <Sparkles className="size-6 text-[#0a84ff]" />
        </div>
        <p className="text-sm font-semibold">Ollama isn&apos;t running</p>
        <p className="max-w-[28ch] text-[13px] leading-relaxed text-muted-foreground">
          Start Ollama (<code className="rounded bg-black/[0.06] px-1 dark:bg-white/10">ollama serve</code>)
          to summarize and ask questions about this thread — all on-device.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {entries.length === 0 ? (
          <div className="pt-6 text-center">
            <p className="text-sm font-semibold">Ask about this thread</p>
            <p className="mx-auto mt-1 max-w-[30ch] text-[13px] text-muted-foreground">
              Answers come from your local {status?.ollama.model ?? "Ollama"} model. Nothing leaves
              your Mac.
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
                  e.role === "user"
                    ? "bg-[#0a84ff] text-white"
                    : "bg-black/[0.05] dark:bg-white/[0.08]"
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
