import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";
import { getAttachment, isDemo } from "@/lib/store";

export const dynamic = "force-dynamic";

const run = promisify(execFile);
const CACHE_DIR = path.join(os.homedir(), ".sidenote", "att-cache");
const NEEDS_CONVERT = new Set(["image/heic", "image/heif", "image/tiff"]);

// Streams an attachment from Apple's Messages store. HEIC and friends are
// converted to JPEG once via sips (built into macOS) and cached.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (isDemo) {
    return NextResponse.json({ error: "Only available when running locally." }, { status: 400 });
  }
  const { id } = await params;
  const att = getAttachment(Number(id));
  if (!att) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // only ever serve files that live inside the Messages store
  const resolved = path.resolve(att.path);
  const allowed = path.join(os.homedir(), "Library", "Messages") + path.sep;
  if (!resolved.startsWith(allowed)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let filePath = resolved;
  let mime = att.mime;
  if (NEEDS_CONVERT.has(att.mime)) {
    const converted = path.join(CACHE_DIR, `${id}.jpg`);
    if (!fs.existsSync(converted)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      try {
        await run("sips", ["-s", "format", "jpeg", resolved, "--out", converted]);
      } catch {
        return NextResponse.json({ error: "Couldn't convert image" }, { status: 500 });
      }
    }
    filePath = converted;
    mime = "image/jpeg";
  }

  try {
    const data = fs.readFileSync(filePath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="${att.name.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }
}
