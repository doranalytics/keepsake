import { NextRequest, NextResponse } from "next/server";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { isDemo } from "@/lib/store";
import type { UpdateInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

const run = promisify(exec);
const REPO_API =
  "https://api.github.com/repos/doranalytics/sidenote/commits/main";

let cached: { at: number; body: UpdateInfo } | null = null;

async function check(fresh: boolean): Promise<UpdateInfo> {
  if (!fresh && cached && Date.now() - cached.at < 10 * 60_000) {
    return cached.body;
  }
  // Inside Sidenote.app there is no git checkout; the shell passes the
  // commit the bundle was built from through the environment.
  let current: string | null = process.env.SIDENOTE_COMMIT ?? null;
  let currentDate: string | null = process.env.SIDENOTE_COMMIT_DATE ?? null;
  if (!current) {
    try {
      const cwd = process.cwd();
      current = (await run("git rev-parse HEAD", { cwd })).stdout.trim();
      currentDate = (await run("git log -1 --format=%cs", { cwd })).stdout.trim();
    } catch {
      // not a git checkout — updates unavailable
    }
  }
  const isApp = process.env.SIDENOTE_APP === "1";
  let latest: string | null = null;

  // A .app install updates by downloading a new build, so the only version
  // that matters is the one behind the download button — published as
  // build.json when the app is built. Repo HEAD is the wrong comparison: it
  // moves on every docs or script commit, which made a freshly-downloaded app
  // announce an update to itself the moment it opened.
  if (isApp) {
    try {
      const r = await fetch("https://sidenote.lol/build.json", {
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      });
      if (r.ok) latest = ((await r.json()) as { commit?: string }).commit ?? null;
    } catch {
      // offline — no check, and no false alarm either
    }
    return finish(current, currentDate, latest, isApp);
  }

  // A git checkout genuinely does `git pull`, so main is the right target.
  try {
    const r = await fetch(REPO_API, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (r.ok) latest = ((await r.json()) as { sha?: string }).sha ?? null;
  } catch {
    // offline — fine, we just can't check
  }
  let news: UpdateInfo["news"] = [];
  try {
    const r = await fetch("https://sidenote.lol/api/changelog", {
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (r.ok) {
      news = (((await r.json()) as { entries?: UpdateInfo["news"] }).entries ?? []).slice(0, 3);
    }
  } catch {
    // best effort
  }
  return finish(current, currentDate, latest, isApp, news);
}

function finish(
  current: string | null,
  currentDate: string | null,
  latest: string | null,
  isApp: boolean,
  news: UpdateInfo["news"] = []
): UpdateInfo {
  const body: UpdateInfo = {
    current,
    currentDate,
    latest,
    updateAvailable: !!(current && latest && current !== latest),
    managed: process.env.SIDENOTE_MANAGED === "1",
    app: isApp,
    news,
  };
  cached = { at: Date.now(), body };
  return body;
}

export async function GET(req: NextRequest) {
  if (isDemo) {
    return NextResponse.json({ error: "Only available when running locally." }, { status: 400 });
  }
  return NextResponse.json(
    await check(req.nextUrl.searchParams.get("fresh") === "1")
  );
}

// Applies the update: pull, install, rebuild, then kick the LaunchAgent so
// launchd relaunches on the new build. Runs detached (its own session) so it
// survives the server it's about to restart.
export async function POST() {
  if (isDemo) {
    return NextResponse.json({ error: "Only available when running locally." }, { status: 400 });
  }
  if (process.env.SIDENOTE_APP === "1") {
    // The app updates by downloading a fresh build, not by git pull.
    return NextResponse.json({ ok: false, managed: false, app: true });
  }
  if (process.env.SIDENOTE_MANAGED !== "1") {
    return NextResponse.json({ ok: false, managed: false });
  }
  const dir = process.cwd();
  const log = fs.openSync(path.join(dir, "sidenote.log"), "a");
  spawn(
    "/bin/bash",
    [
      "-c",
      `cd "${dir}" && git pull --ff-only && npm install --no-fund --no-audit --loglevel=error && npm run build && launchctl kickstart -k "gui/$(id -u)/lol.sidenote.app"`,
    ],
    { detached: true, stdio: ["ignore", log, log] }
  ).unref();
  cached = null;
  return NextResponse.json({ ok: true, managed: true });
}
