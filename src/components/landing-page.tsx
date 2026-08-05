"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Check, Copy, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

const INSTALL_CMD = "curl -fsSL https://keepsake-liard-rho.vercel.app/install.sh | bash";

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
        <span className="text-[17px] font-semibold tracking-tight">Keepsake</span>
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
            Get Keepsake for Mac
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
          Private by design — your messages never leave your Mac.
        </p>

        {showSetup && (
          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-black/[0.08] bg-white p-6 text-left shadow-sm dark:border-white/10 dark:bg-[#141416]">
            <p className="text-[15px] font-semibold">One command installs everything</p>
            <button
              onClick={copy}
              className="group mt-3 flex w-full items-center justify-between gap-3 rounded-xl bg-[#1d1d1f] px-4 py-3 text-left font-mono text-[12.5px] text-[#7ee787] transition-colors hover:bg-black dark:bg-black dark:ring-1 dark:ring-white/10"
            >
              <span className="min-w-0 truncate">{INSTALL_CMD}</span>
              {copied ? (
                <span className="flex shrink-0 items-center gap-1 font-sans text-[11px] font-medium text-white">
                  <Check className="size-3.5" /> Copied
                </span>
              ) : (
                <Copy className="size-4 shrink-0 text-white/40 group-hover:text-white" />
              )}
            </button>
            <ol className="mt-4 space-y-2.5">
              {[
                "Paste into Terminal (⌘-space, type “terminal”) — Keepsake installs and opens itself.",
                "Flip one macOS switch so it can read your Messages. Keepsake shows you exactly where.",
                "Want AI summaries? Keepsake sets that up in-app — also free, also on-device.",
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-[13.5px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0a84ff]/10 text-[11px] font-bold text-[#0a84ff]">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-14 pb-16 md:mt-20">
          <img
            src="/screenshot.png"
            alt="Keepsake showing a conversation with search results and pinned messages"
            className="w-full rounded-xl border border-black/[0.08] shadow-2xl md:rounded-2xl dark:border-white/10"
          />
        </div>
      </main>

      <footer className="pb-10 text-center text-[12px] text-[#6e6e73] dark:text-[#a1a1a6]">
        Made for macOS · Open source · Nothing is uploaded, ever
      </footer>
    </div>
  );
}
