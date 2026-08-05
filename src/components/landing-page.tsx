"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, Copy, Lock } from "lucide-react";
import { CHANGELOG } from "@/lib/changelog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INSTALL_CMD = "curl -fsSL https://sidenote.lol/install.sh | bash";
const APP_URL = "http://localhost:4747";

// Probes the local install. A no-cors fetch resolves (opaque) if anything is
// listening on the port; browsers allow https → http://localhost requests.
function useLocalApp() {
  const [running, setRunning] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`${APP_URL}/api/status`, {
      mode: "no-cors",
      signal: AbortSignal.timeout(2500),
    })
      .then(() => alive && setRunning(true))
      .catch(() => alive && setRunning(false));
    return () => {
      alive = false;
    };
  }, []);
  return running;
}

function AlreadyInstalled({ running }: { running: boolean | null }) {
  const [showHelp, setShowHelp] = useState(false);

  if (running) {
    return (
      <div className="mt-8 flex justify-center">
        <a
          href={APP_URL}
          className="group flex items-center gap-2.5 rounded-full border border-[#30d158]/30 bg-[#30d158]/10 py-2 pr-4 pl-3.5 text-[13.5px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#30d158]/20 dark:text-[#f5f5f7]"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#30d158] opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-[#30d158]" />
          </span>
          Sidenote is running on this Mac — open it
          <ArrowUpRight className="size-4 text-[#6e6e73] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-[#a1a1a6]" />
        </a>
      </div>
    );
  }

  return (
    <div className="mt-8 text-[13.5px] text-[#6e6e73] dark:text-[#a1a1a6]">
      Already installed?{" "}
      <a
        href={APP_URL}
        className="font-medium text-[#0a84ff] hover:underline"
        onClick={() => setShowHelp(true)}
      >
        Open Sidenote →
      </a>
      {running === false && (
        <>
          {" · "}
          <button
            onClick={() => setShowHelp((s) => !s)}
            className="font-medium text-[#0a84ff] hover:underline"
          >
            not starting?
          </button>
        </>
      )}
      {showHelp && (
        <div className="mx-auto mt-4 max-w-md rounded-2xl border border-black/[0.08] bg-white p-5 text-left dark:border-white/10 dark:bg-[#141416]">
          <p className="text-[13.5px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
            Sidenote runs at{" "}
            <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
              {APP_URL.replace("http://", "")}
            </span>
            . If that page won&apos;t load (e.g. after a restart), paste the
            install command into Terminal again — on an existing install it just
            relaunches, in seconds:
          </p>
          <SmallCopy text={INSTALL_CMD} />
        </div>
      )}
    </div>
  );
}

function SmallCopy({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="group mt-3 flex w-full items-center justify-between gap-3 rounded-xl bg-[#1d1d1f] px-4 py-3 text-left font-mono text-[13px] text-[#7ee787] transition-colors hover:bg-black dark:bg-black dark:ring-1 dark:ring-white/10"
    >
      <span className="min-w-0 truncate">{text}</span>
      {copied ? (
        <span className="flex shrink-0 items-center gap-1 font-sans text-[11px] font-medium text-white">
          <Check className="size-3.5" /> Copied
        </span>
      ) : (
        <Copy className="size-4 shrink-0 text-white/40 group-hover:text-white" />
      )}
    </button>
  );
}

export function LandingPage({ onEnterDemo }: { onEnterDemo: () => void }) {
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);
  const running = useLocalApp();

  const copy = () => {
    navigator.clipboard.writeText(INSTALL_CMD);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="min-h-dvh overflow-y-auto bg-[#fbfbfd] text-[#1d1d1f] dark:bg-black dark:text-[#f5f5f7]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-[17px] font-semibold tracking-tight">Sidenote</span>
        <div className="flex items-center gap-5">
          {running && (
            <a
              href={APP_URL}
              className="text-[13px] font-medium text-[#0a84ff] hover:underline"
            >
              Open Sidenote
            </a>
          )}
          <button
            onClick={onEnterDemo}
            className="text-[13px] font-medium text-[#0a84ff] hover:underline"
          >
            Live demo
          </button>
        </div>
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
            Download Sidenote for Mac
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

        <AlreadyInstalled running={running} />

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
                <>This installs the real Sidenote app on your Mac — it lives in <code className="rounded bg-black/[0.06] px-1 dark:bg-white/10">~/Sidenote</code>, starts automatically when you log in, and opens in your browser at localhost:4747.</>,
                <>Flip one macOS switch (Full Disk Access) so it can read your Messages. Sidenote walks you through it, buttons and all.</>,
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
            <div className="mt-6 border-t border-black/[0.06] pt-5 dark:border-white/10">
              <p className="text-[15px] font-semibold">
                Optional: on-device AI{" "}
                <span className="font-normal text-[#6e6e73] dark:text-[#a1a1a6]">
                  — summaries &amp; “ask this thread”
                </span>
              </p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
                AI runs on a local model through{" "}
                <a
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[#0a84ff] underline underline-offset-2"
                >
                  Ollama
                </a>{" "}
                — free, no API keys, nothing uploaded. Install the Ollama app, then pull a model in
                Terminal (or let Sidenote do it for you in-app):
              </p>
              <SmallCopy text="ollama pull qwen3.6:27b" />
            </div>
          </div>
        )}

        <div className="mt-14 md:mt-20">
          <img
            src="/screenshot.png"
            alt="Sidenote showing a conversation"
            className="w-full rounded-xl border border-black/[0.08] shadow-2xl md:rounded-2xl dark:border-white/10"
          />
        </div>

        <div className="mt-16 grid gap-x-8 gap-y-12 pb-16 text-left md:mt-24 md:grid-cols-2">
          {[
            {
              img: "/shot-search.png",
              title: "Search everything",
              sub: "Instant full-text search across every conversation you've ever had. Click a result to jump to that exact moment.",
            },
            {
              img: "/shot-remember.png",
              title: "Remember any message",
              sub: "Right-click a message and hit “Remember this.” No retyping, no screenshots.",
            },
            {
              img: "/shot-notes.png",
              title: "Notes on every person",
              sub: "Saved messages and your own notes live side by side — a private memory for each relationship.",
            },
            {
              img: "/shot-export.png",
              title: "Export any conversation",
              sub: "Copy a clean transcript of any time range, ready to paste into ChatGPT or Claude.",
            },
          ].map((f) => (
            <figure key={f.title}>
              <figcaption className="mb-3">
                <p className="text-[19px] font-semibold tracking-tight">{f.title}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]">
                  {f.sub}
                </p>
              </figcaption>
              <img
                src={f.img}
                alt={f.title}
                className="aspect-[8/5] w-full rounded-xl border border-black/[0.08] object-cover shadow-xl dark:border-white/10"
              />
            </figure>
          ))}
        </div>

        {/* What's new */}
        <div className="mx-auto mb-20 max-w-2xl border-t border-black/[0.06] pt-14 dark:border-white/10">
          <p className="text-[13px] font-semibold tracking-wide text-[#0a84ff] uppercase">
            What&apos;s new
          </p>
          <h2 className="mt-2 text-[28px] leading-tight font-semibold tracking-tight md:text-[34px]">
            Sidenote keeps getting better
          </h2>
          <div className="mt-9 space-y-9 text-left">
            {CHANGELOG.map((entry) => (
              <div key={entry.title} className="flex flex-col gap-1.5 sm:flex-row sm:gap-6">
                <span className="w-24 shrink-0 pt-0.5 text-[12.5px] text-[#6e6e73] sm:text-right dark:text-[#a1a1a6]">
                  {entry.date}
                </span>
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold tracking-tight">{entry.title}</p>
                  <ul className="mt-1.5 space-y-1">
                    {entry.points.map((point) => (
                      <li
                        key={point}
                        className="flex gap-2 text-[13.5px] leading-relaxed text-[#6e6e73] dark:text-[#a1a1a6]"
                      >
                        <span className="mt-[7px] size-1 shrink-0 rounded-full bg-[#0a84ff]" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-[13px] text-[#6e6e73] dark:text-[#a1a1a6]">
            Already installed? Sidenote offers new versions right in the app — one click, no
            Terminal.
          </p>
        </div>
      </main>

      <footer className="pb-10 text-center text-[12px] text-[#6e6e73] dark:text-[#a1a1a6]">
        Made for macOS · Runs 100% locally · Nothing is uploaded, ever
      </footer>
    </div>
  );
}
