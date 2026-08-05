"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Check, ChevronDown, Copy, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INSTALL_CMD = "curl -fsSL https://sidenote.lol/install.sh | bash";

export function LandingPage({ onEnterDemo }: { onEnterDemo: () => void }) {
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(INSTALL_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-dvh overflow-y-auto bg-[#fbfbfd] text-[#1d1d1f] dark:bg-black dark:text-[#f5f5f7]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-[17px] font-semibold tracking-tight">Sidenote</span>
        <button
          onClick={onEnterDemo}
          className="text-[13px] font-medium text-[#0a84ff] hover:underline"
        >
          Live demo
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-6 pt-10 text-center md:pt-20">
        <img
          src="/icon-192.png"
          alt=""
          className="mx-auto size-16 rounded-[22.5%] shadow-lg md:size-20"
        />
        <h1 className="mt-8 text-[44px] leading-[1.05] font-semibold tracking-tight md:text-[64px]">
          Every text.
          <br />
          Remembered.
        </h1>
        <p className="mx-auto mt-5 max-w-[34ch] text-[17px] leading-relaxed text-[#6e6e73] md:text-[19px] dark:text-[#a1a1a6]">
          Search your entire iMessage history, pin the moments that matter, and ask AI about any
          conversation.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            onClick={() => setShowSetup((s) => !s)}
            className="h-12 rounded-full bg-[#0a84ff] px-7 text-[15px] font-medium hover:bg-[#0974df]"
          >
            Get Sidenote for Mac
            <ChevronDown
              className={cn("ml-1 size-4 transition-transform", showSetup && "rotate-180")}
            />
          </Button>
          <Button
            onClick={onEnterDemo}
            variant="ghost"
            className="h-12 rounded-full px-6 text-[15px] font-medium text-[#0a84ff] hover:bg-[#0a84ff]/5"
          >
            Browse the demo →
          </Button>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-[13px] text-[#6e6e73] dark:text-[#a1a1a6]">
          <Lock className="size-3.5" />
          100% local — your messages never leave your Mac.
        </p>

        {showSetup && (
          <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-black/[0.08] bg-white p-7 text-left shadow-lg md:p-9 dark:border-white/10 dark:bg-[#141416]">
            <p className="text-[19px] font-semibold tracking-tight md:text-[21px]">
              One command installs everything
            </p>
            <p className="mt-1 text-[13.5px] text-[#6e6e73] dark:text-[#a1a1a6]">
              Click to copy, then paste into Terminal (⌘-space, type “terminal”) and press return.
            </p>
            <button
              onClick={copy}
              className="group mt-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-[#1d1d1f] px-5 py-4 text-left font-mono text-[13px] text-[#7ee787] shadow-inner transition-colors hover:bg-black md:text-[14px] dark:bg-black dark:ring-1 dark:ring-white/10"
            >
              <span className="min-w-0 truncate">{INSTALL_CMD}</span>
              {copied ? (
                <span className="flex shrink-0 items-center gap-1 font-sans text-[12px] font-medium text-white">
                  <Check className="size-4" /> Copied
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1.5 font-sans text-[12px] font-medium text-white/50 group-hover:text-white">
                  <Copy className="size-4" /> Copy
                </span>
              )}
            </button>
            <ol className="mt-5 space-y-3">
              {[
                <>Sidenote installs itself into <code className="rounded bg-black/[0.06] px-1 dark:bg-white/10">~/Sidenote</code> and opens in your browser — running entirely on your Mac.</>,
                <>Flip one macOS switch (Full Disk Access) so it can read your Messages. Sidenote shows you exactly where.</>,
                <>Optional AI: summaries and “ask this thread” run on a <span className="font-medium text-[#1d1d1f] dark:text-white">local model via Ollama</span> — Sidenote sets it up in-app. No cloud, no API keys, nothing uploaded.</>,
              ].map((step, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-[14px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]"
                >
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0a84ff]/10 text-[12px] font-bold text-[#0a84ff]">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-14 md:mt-20">
          <img
            src="/screenshot.png"
            alt="Sidenote showing a conversation with search results"
            className="w-full rounded-xl border border-black/[0.08] shadow-2xl md:rounded-2xl dark:border-white/10"
          />
        </div>

        <div className="mt-6 grid gap-6 pb-16 md:mt-8 md:grid-cols-2 md:gap-8">
          <figure>
            <img
              src="/shot-search.png"
              alt="Searching every conversation at once"
              className="w-full rounded-xl border border-black/[0.08] shadow-xl dark:border-white/10"
            />
            <figcaption className="mt-3 text-[13.5px] font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
              Find anything, from any conversation, instantly.
            </figcaption>
          </figure>
          <figure>
            <img
              src="/shot-notes.png"
              alt="Pinned messages and notes on a person"
              className="w-full rounded-xl border border-black/[0.08] shadow-xl dark:border-white/10"
            />
            <figcaption className="mt-3 text-[13.5px] font-medium text-[#6e6e73] dark:text-[#a1a1a6]">
              Right-click any message to remember it — pinned beside your notes on that person.
            </figcaption>
          </figure>
        </div>
      </main>

      <footer className="pb-10 text-center text-[12px] text-[#6e6e73] dark:text-[#a1a1a6]">
        Made for macOS · Runs 100% locally · Nothing is uploaded, ever
      </footer>
    </div>
  );
}
