"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookmarkPlus, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  loadNote,
  loadSavedMessages,
  removeSavedMessage,
  saveNote,
  type SavedMessage,
} from "@/lib/notes";
import { formatListDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type SaveState = "saved" | "saving" | "error";

export function NotesPanel({
  threadId,
  threadName,
  demo,
  onJump,
}: {
  threadId: string;
  threadName: string;
  demo: boolean;
  onJump: (messageId: number) => void;
}) {
  const [value, setValue] = useState("");
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<SaveState>("saved");
  const [pinned, setPinned] = useState<SavedMessage[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // What the debounce still owes the disk, so unmount can flush it.
  const pending = useRef<{ threadId: string; body: string } | null>(null);

  const flush = useCallback(async () => {
    const owed = pending.current;
    if (!owed) return;
    pending.current = null;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    try {
      await saveNote(owed.threadId, owed.body, demo);
      setState("saved");
    } catch {
      pending.current = owed;
      setState("error");
    }
  }, [demo]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setState("saved");
    (async () => {
      try {
        const [body, saved] = await Promise.all([
          loadNote(threadId, demo),
          loadSavedMessages(threadId, demo),
        ]);
        if (cancelled) return;
        setValue(body);
        setPinned(saved);
      } catch {
        if (!cancelled) setState("error");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId, demo]);

  // Closing the sheet, switching threads, or quitting the app must not eat
  // the last few hundred milliseconds of typing.
  useEffect(() => {
    const onHide = () => {
      const owed = pending.current;
      if (!owed || demo) return;
      // Fire-and-forget: the page may be going away before a fetch resolves.
      navigator.sendBeacon?.(
        "/api/notes",
        new Blob([JSON.stringify(owed)], { type: "application/json" })
      );
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [flush, demo]);

  const onChange = (v: string) => {
    setValue(v);
    setState("saving");
    pending.current = { threadId, body: v };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 400);
  };

  const remove = async (id: number) => {
    const before = pinned;
    setPinned((list) => list.filter((m) => m.id !== id));
    try {
      await removeSavedMessage(threadId, id, demo);
    } catch {
      setPinned(before);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <section className="flex shrink-0 flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold">Notes on {threadName}</p>
          <span
            className={cn(
              "text-[11px]",
              state === "error" ? "text-red-500" : "text-muted-foreground"
            )}
          >
            {state === "error" ? "Not saved — retrying" : state === "saving" ? "Saving…" : "Saved"}
          </span>
        </div>
        <Textarea
          value={value}
          disabled={!ready}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => void flush()}
          placeholder={`Things to remember about ${threadName} — birthdays, favorites, plans, inside jokes…`}
          className="min-h-[130px] resize-none rounded-xl text-[14px] leading-relaxed"
        />
      </section>

      <section className="flex min-h-0 flex-col gap-2">
        <p className="text-sm font-semibold">Saved messages</p>
        {pinned.length === 0 ? (
          <p className="flex items-start gap-2 rounded-xl bg-black/[0.03] p-3 text-[13px] leading-relaxed text-muted-foreground dark:bg-white/[0.05]">
            <BookmarkPlus className="mt-0.5 size-4 shrink-0 text-[#0a84ff]" />
            Right-click any message in the chat and choose “Remember this” — it&apos;s pinned here,
            and clicking it takes you back to that exact moment.
          </p>
        ) : (
          <div className="space-y-2">
            {pinned.map((m) => (
              <div key={m.id} className="group relative">
                <button
                  onClick={() => onJump(m.id)}
                  className="block w-full text-left"
                  title="Jump to this message in the conversation"
                >
                  <div className="mb-0.5 flex items-baseline justify-between pr-6">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {m.isFromMe ? "You" : m.sender || threadName}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatListDate(m.date)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2 text-[13.5px] leading-snug whitespace-pre-wrap transition-opacity group-hover:opacity-85",
                      m.isFromMe
                        ? "bg-[#0a84ff] text-white"
                        : "bg-[#e9e9eb] text-black dark:bg-[#26262a] dark:text-white"
                    )}
                  >
                    {m.text}
                  </div>
                </button>
                <button
                  onClick={() => remove(m.id)}
                  aria-label="Remove saved message"
                  className="absolute top-0 right-0 rounded-full p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="shrink-0 text-[11px] text-muted-foreground">
        {demo
          ? "This is sample data — notes here stay in your browser."
          : "Saved on your Mac in ~/.sidenote — kept through app updates."}
      </p>
    </div>
  );
}
