"use client";

import { useState } from "react";
import { FolderSearch, RefreshCw, Settings2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

// Walks the user through granting Full Disk Access to Sidenote's engine.
// macOS only lets a human flip this switch, so the best we can do is put
// every needed action one click away and spell out the drag in between.
export function FdaGuide({ engine }: { engine?: string | null }) {
  const [restarting, setRestarting] = useState<"waiting" | "manual" | null>(null);
  const engineName = engine?.split("/").pop() ?? "Sidenote Engine";

  const restart = async () => {
    // After the relaunch, the app re-syncs on its own — see SidenoteApp.
    localStorage.setItem("sidenote-fda-resync", "1");
    const res = await fetch("/api/restart", { method: "POST" })
      .then((r) => r.json())
      .catch(() => null);
    if (!res?.managed) {
      setRestarting("manual");
      return;
    }
    setRestarting("waiting");
    // The server is exiting; poll until launchd has it back, then reload.
    for (;;) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const s = await fetch("/api/status", { cache: "no-store" });
        if (s.ok) {
          location.reload();
          return;
        }
      } catch {
        // still coming back up
      }
    }
  };

  const steps: {
    icon: React.ReactNode;
    button: React.ReactNode;
    hint: React.ReactNode;
  }[] = [
    {
      icon: <Settings2 className="size-4" />,
      button: (
        <Button
          size="sm"
          variant="outline"
          onClick={() => fetch("/api/open-settings", { method: "POST" })}
          className="h-8 rounded-lg text-[12.5px]"
        >
          Open Full Disk Access settings
        </Button>
      ),
      hint: "Opens the exact System Settings pane. Keep it visible for the next step.",
    },
    {
      icon: <FolderSearch className="size-4" />,
      button: (
        <Button
          size="sm"
          variant="outline"
          onClick={() => fetch("/api/reveal-engine", { method: "POST" })}
          className="h-8 rounded-lg text-[12.5px]"
        >
          Show Sidenote&apos;s engine in Finder
        </Button>
      ),
      hint: (
        <>
          A Finder window opens with{" "}
          <span className="font-medium text-foreground">{engineName}</span>{" "}
          selected. Drag that file into the Full Disk Access list and turn its
          switch on. macOS may ask for your password.
        </>
      ),
    },
    {
      icon: <RefreshCw className="size-4" />,
      button: (
        <Button
          size="sm"
          onClick={restart}
          disabled={restarting === "waiting"}
          className="h-8 rounded-lg bg-[#0a84ff] text-[12.5px] hover:bg-[#0974df]"
        >
          {restarting === "waiting" ? (
            <>
              <RefreshCw className="mr-1.5 size-3.5 animate-spin" />
              Restarting — this page reloads itself…
            </>
          ) : (
            "Restart Sidenote"
          )}
        </Button>
      ),
      hint:
        restarting === "manual" ? (
          <span className="text-amber-700 dark:text-amber-400">
            You&apos;re running Sidenote by hand, so it can&apos;t restart
            itself: stop it in Terminal (Ctrl-C), start it again, then refresh
            this page.
          </span>
        ) : (
          "Applies the new permission: Sidenote restarts, this page reloads, and your messages sync automatically."
        ),
    },
  ];

  return (
    <div className="rounded-2xl border bg-black/[0.02] p-4 text-left dark:bg-white/[0.03]">
      <p className="text-[13.5px] font-semibold">
        One-time macOS permission needed
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
        macOS keeps your Messages locked down and only lets you grant access by
        hand. Three steps, once:
      </p>
      <ol className="mt-3 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0a84ff]/10 text-[12px] font-bold text-[#0a84ff]">
              {i + 1}
            </span>
            <div className="min-w-0 space-y-1.5">
              {s.button}
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                {s.hint}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {engine && (
        <p className="mt-3 truncate font-mono text-[11px] text-muted-foreground/70" title={engine}>
          engine: {engine}
        </p>
      )}
      <p className="mt-3 flex gap-1.5 text-[12px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#0a84ff]" />
        You&apos;re granting access to the engine on your Mac only — not to any
        AI or cloud service. Your messages never leave this computer.
      </p>
    </div>
  );
}
