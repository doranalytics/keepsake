"use client";

import { useState } from "react";
import { AlertTriangle, FolderSearch, RefreshCw, Settings2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

// Walks the user through granting Full Disk Access. macOS only lets a human
// flip this switch, so the best we can do is put every needed action one click
// away and spell out the drag in between.
export function FdaGuide({
  engine,
  translocated,
}: {
  engine?: string | null;
  translocated?: boolean;
}) {
  const [restarting, setRestarting] = useState<"waiting" | "manual" | null>(null);
  // In the Mac app it's the bundle that macOS lists; the Terminal install
  // instead lists the bare engine binary.
  const isApp = !!engine?.endsWith(".app");
  const engineName = isApp ? "Sidenote" : (engine?.split("/").pop() ?? "Sidenote Engine");

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
      hint: (
        <>
          Find <span className="font-medium text-foreground">{engineName}</span>{" "}
          in the list and turn its switch on — macOS added it there when the
          sync was blocked. It may ask for your password.
          <span className="mt-1.5 block">
            Not in the list?{" "}
            <button
              onClick={() => fetch("/api/reveal-engine", { method: "POST" })}
              className="inline-flex items-center gap-1 font-medium text-[#0a84ff] hover:underline"
            >
              <FolderSearch className="size-3.5" />
              {isApp ? "Reveal Sidenote in Finder" : "Reveal the engine in Finder"}
            </button>{" "}
            {isApp ? "and drag it into the list." : "and drag the file in."}
          </span>
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

  // Granting Full Disk Access to a translocated copy is a dead end: macOS
  // gives that temporary copy a new random path every launch, so the switch
  // the user flips today applies to nothing tomorrow. Say so instead of
  // walking them through a grant that can't work.
  if (translocated) {
    return (
      <div className="min-w-0 overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-50 p-4 text-left dark:bg-amber-950/40">
        <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-amber-900 dark:text-amber-200">
          <AlertTriangle className="size-4 shrink-0" />
          Move Sidenote to your Applications folder first
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-amber-900/80 dark:text-amber-200/80">
          Sidenote was opened straight from the download, so macOS is running it
          from a temporary copy. Full Disk Access can&apos;t stick to a temporary
          copy — granting it here wouldn&apos;t let Sidenote read your Messages.
        </p>
        <ol className="mt-3 space-y-1.5 text-[12.5px] leading-relaxed text-amber-900/80 dark:text-amber-200/80">
          <li className="flex gap-2">
            <span className="font-semibold">1.</span>
            <span>
              <button
                onClick={() => fetch("/api/reveal-engine", { method: "POST" })}
                className="inline-flex items-center gap-1 font-medium text-[#0a84ff] hover:underline"
              >
                <FolderSearch className="size-3.5" /> Reveal Sidenote in Finder
              </button>{" "}
              and drag it into Applications.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold">2.</span>
            <span>Quit Sidenote, then open it from Applications.</span>
          </li>
        </ol>
        <p className="mt-3 text-[12px] leading-relaxed text-amber-900/70 dark:text-amber-200/70">
          Sidenote offers to do this for you the moment it opens — you can also
          quit now and pick <span className="font-medium">Move to Applications</span>.
        </p>
      </div>
    );
  }

  // min-w-0: inside the grid-layout dialog this card is a grid item, and the
  // engine path (one long unbreakable token) would otherwise set its minimum
  // width and push the card past the dialog's frame.
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border bg-black/[0.02] p-4 text-left dark:bg-white/[0.03]">
      <p className="text-[13.5px] font-semibold">
        One-time macOS permission needed
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
        macOS keeps your Messages locked down and only lets you flip the switch
        yourself. Two steps, once:
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
      {engine && !isApp && (
        <p className="mt-3 truncate font-mono text-[11px] text-muted-foreground/70" title={engine}>
          engine: {engine}
        </p>
      )}
      <p className="mt-3 flex gap-1.5 text-[12px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[#0a84ff]" />
        You&apos;re granting access to the engine on your Mac only — not to any
        cloud service. Sidenote reads your Messages database here, on this
        computer, and the index it builds stays here.
      </p>
    </div>
  );
}
