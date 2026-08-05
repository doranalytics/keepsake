"use client";

import { useEffect, useRef, useState } from "react";
import { BookmarkPlus, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  getSavedMessages,
  notesKey,
  removeSavedMessage,
  type SavedMessage,
} from "@/lib/notes";
import { formatListDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NotesPanel({
  threadId,
  threadName,
  onJump,
}: {
  threadId: string;
  threadName: string;
  onJump: (messageId: number) => void;
}) {
  const key = notesKey(threadId);
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(true);
  const [pinned, setPinned] = useState<SavedMessage[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(localStorage.getItem(key) ?? "");
    setSaved(true);
    setPinned(getSavedMessages(threadId));
  }, [key, threadId]);

  const onChange = (v: string) => {
    setValue(v);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      localStorage.setItem(key, v);
      setSaved(true);
    }, 400);
  };

  const remove = (id: number) => {
    removeSavedMessage(threadId, id);
    setPinned(getSavedMessages(threadId));
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <section className="flex shrink-0 flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold">Notes on {threadName}</p>
          <span className="text-[11px] text-muted-foreground">{saved ? "Saved" : "Saving…"}</span>
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
        Notes and saved messages are stored privately in this browser.
      </p>
    </div>
  );
}
