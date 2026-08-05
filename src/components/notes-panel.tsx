"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

import { notesKey } from "@/lib/notes";

export function NotesPanel({ threadId, threadName }: { threadId: string; threadName: string }) {
  const key = notesKey(threadId);
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(localStorage.getItem(key) ?? "");
    setSaved(true);
  }, [key]);

  const onChange = (v: string) => {
    setValue(v);
    setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      localStorage.setItem(key, v);
      setSaved(true);
    }, 400);
  };

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">Notes on {threadName}</p>
        <span className="text-[11px] text-muted-foreground">{saved ? "Saved" : "Saving…"}</span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Things to remember about ${threadName} — birthdays, favorites, plans, inside jokes…`}
        className="min-h-0 flex-1 resize-none rounded-xl text-[14px] leading-relaxed"
      />
      <p className="text-[11px] text-muted-foreground">
        Notes are saved privately in this browser.
      </p>
    </div>
  );
}
