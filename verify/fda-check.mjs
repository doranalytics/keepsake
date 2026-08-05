// Verifies the Full Disk Access guided flow on the LOCAL install: a failing
// sync shows the permission banner, and the fix dialog walks through the steps.
import { chromium } from "playwright";

const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });
await page.goto("http://localhost:4747", { waitUntil: "networkidle" });

// Synced install → main app with a Sync button in the sidebar
await page.waitForSelector('button:has-text("Sync")', { timeout: 15000 });
const sync = await fetch("http://localhost:4747/api/sync", { method: "POST" });
const body = await sync.json();
if (sync.ok) {
  console.log("NOTE: sync succeeded — FDA already granted; banner flow not reachable.");
  await browser.close();
  process.exit(0);
}
if (!body.permission) fail(`sync failed but not flagged as permission: ${body.error}`);

// Drive the UI: click Sync, expect the banner with the guided-fix link
await page.click('button:has-text("Sync")');
await page.waitForSelector("text=Show me how to grant it", { timeout: 30000 });
await page.click("text=Show me how to grant it");
await page.waitForSelector("text=One-time macOS permission needed", { timeout: 10000 });
for (const label of [
  "Open Full Disk Access settings",
  "Reveal the engine in Finder",
  "Restart Sidenote",
]) {
  if (!(await page.locator(`button:has-text("${label}")`).count()))
    fail(`guide is missing button: ${label}`);
}
if (!(await page.locator("text=Sidenote Engine").count()))
  fail("guide does not mention the friendly 'Sidenote Engine' name");
if (!(await page.locator("text=turn its switch on").count()))
  fail("guide does not lead with the flip-the-switch instruction");
await page.screenshot({ path: "verify/reshot-fda.png" });
console.log("PASS: permission banner + guided FDA dialog verified locally");
await browser.close();
