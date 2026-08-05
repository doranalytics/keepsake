import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { getThread, isDemo } from "@/lib/store";

export const dynamic = "force-dynamic";

const run = promisify(execFile);

// Sends through the real Messages app via AppleScript, so texts come from the
// user's own number. First use triggers macOS's Automation permission prompt.
const SCRIPT = `
on run argv
  set theText to item 1 of argv
  set theKind to item 2 of argv
  set theTarget to item 3 of argv
  tell application "Messages"
    if theKind is "group" then
      send theText to chat id theTarget
    else
      try
        send theText to participant theTarget of (1st account whose service type = iMessage and enabled is true)
      on error
        send theText to participant theTarget of (1st account whose enabled is true)
      end try
    end if
  end tell
end run`;

export async function POST(req: NextRequest) {
  if (isDemo) {
    return NextResponse.json(
      { error: "Sending works when Sidenote runs on your Mac." },
      { status: 400 }
    );
  }
  const body = (await req.json()) as { threadId?: string; text?: string };
  const text = body.text?.trim();
  if (!body.threadId || !text) {
    return NextResponse.json({ error: "Nothing to send." }, { status: 400 });
  }
  if (!getThread(body.threadId)) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  const [kind, target] = body.threadId.startsWith("group:")
    ? ["group", body.threadId.slice("group:".length)]
    : ["direct", body.threadId.slice("direct:".length)];

  try {
    await run("osascript", ["-e", SCRIPT, text, kind, target], { timeout: 20000 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message ?? "";
    const friendly = msg.includes("1743")
      ? "macOS blocked Sidenote from controlling Messages. Allow it in System Settings → Privacy & Security → Automation, then try again."
      : "Couldn't send — make sure the Messages app is signed in.";
    return NextResponse.json({ error: friendly }, { status: 502 });
  }
}
