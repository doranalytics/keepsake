"use client";

import { useState } from "react";
import { Check, Copy, Download, HardDrive, Sparkles, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const INSTALL_CMD = "curl -fsSL https://keepsake-liard-rho.vercel.app/install.sh | bash";
const PULL_CMD = "ollama pull qwen3.6";

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="group flex w-full items-center justify-between gap-3 rounded-lg bg-[#1c1c1e] px-3 py-2.5 text-left font-mono text-[12.5px] text-[#7ee787] transition-colors hover:bg-black dark:bg-black/60 dark:hover:bg-black"
    >
      <span className="min-w-0 truncate">{text}</span>
      {copied ? (
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-sans font-medium text-white">
          <Check className="size-3.5" /> Copied
        </span>
      ) : (
        <Copy className="size-3.5 shrink-0 text-white/50 group-hover:text-white" />
      )}
    </button>
  );
}

export function OnboardingDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="space-y-2 px-6 pt-6 pb-4 text-left">
          <div className="flex size-11 items-center justify-center rounded-xl bg-[#0a84ff]">
            <TerminalSquare className="size-6 text-white" />
          </div>
          <DialogTitle className="text-xl tracking-tight">
            Set up Keepsake on your Mac
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-relaxed">
            This site is a live demo with sample conversations. The real Keepsake runs entirely on
            your Mac — your messages are indexed locally and never touch the internet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 pb-2">
          <section>
            <div className="mb-1.5 flex items-center gap-2">
              <StepDot n={1} />
              <p className="text-[14px] font-semibold">Install &amp; launch — one command</p>
            </div>
            <CopyBlock text={INSTALL_CMD} />
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
              Copy, then paste into <span className="font-medium text-foreground">Terminal</span>{" "}
              (press ⌘-space, type “terminal”, hit return) and press return. It installs Keepsake
              into <code className="rounded bg-black/[0.06] px-1 dark:bg-white/10">~/Keepsake</code>{" "}
              and opens it in your browser. That&apos;s the only terminal moment.
            </p>
          </section>

          <section>
            <div className="mb-1.5 flex items-center gap-2">
              <StepDot n={2} />
              <p className="text-[14px] font-semibold">Allow access to your Messages</p>
            </div>
            <p className="flex gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
              <HardDrive className="mt-0.5 size-4 shrink-0 text-[#0a84ff]" />
              <span>
                When Keepsake opens, click{" "}
                <span className="font-medium text-foreground">
                  “Open Full Disk Access settings”
                </span>{" "}
                and switch on Terminal. macOS makes you flip this yourself — it grants read access
                to the Terminal app on your own Mac, not to any cloud or AI service. Then re-run
                the install command once so Keepsake picks up the permission.
              </span>
            </p>
          </section>

          <section>
            <div className="mb-1.5 flex items-center gap-2">
              <StepDot n={3} />
              <p className="text-[14px] font-semibold">
                On-device AI <span className="font-normal text-muted-foreground">(optional)</span>
              </p>
            </div>
            <p className="mb-2 flex gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-[#0a84ff]" />
              <span>
                Search and notes work with nothing else installed. For thread summaries and
                “ask about this chat”, add{" "}
                <a
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[#0a84ff] underline underline-offset-2"
                >
                  Ollama
                </a>{" "}
                and pull a model — AI runs on your Mac too.
              </span>
            </p>
            <CopyBlock text={PULL_CMD} />
          </section>
        </div>

        <div className="flex items-center gap-2 px-6 py-5">
          <Button
            onClick={() => onOpenChange(false)}
            className="h-10 flex-1 rounded-xl bg-[#0a84ff] text-[14px] hover:bg-[#0974df]"
          >
            Explore the demo first
          </Button>
          <Button
            variant="outline"
            className="h-10 rounded-xl text-[14px]"
            onClick={() => {
              navigator.clipboard.writeText(INSTALL_CMD);
              onOpenChange(false);
            }}
          >
            <Download className="mr-1.5 size-4" />
            Copy install command
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepDot({ n }: { n: number }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0a84ff]/10 text-[11px] font-bold text-[#0a84ff]">
      {n}
    </span>
  );
}
