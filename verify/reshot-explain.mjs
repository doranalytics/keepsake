// Verifies this reshot on the LIVE site: the landing page describes the
// right-click Explain feature (and no longer claims 100% local AI), and the
// demo app actually opens the popover from a message's context menu.
import { chromium } from "playwright";

const URL = process.argv[2] ?? "https://sidenote.lol";
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });

// ---------- 1. landing page ----------
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector("text=Every text.", { timeout: 20000 });

// The homepage must be the homepage — never the app. Linking someone to
// sidenote.lol used to drop them into the demo once they'd visited before.
if (await page.locator("[data-mid]").count()) {
  fail("/ rendered the app instead of the landing page");
}
if (!(await page.locator('a[href="/demo"]').count())) {
  fail("landing has no link to the /demo page");
}
console.log("ok: / is the landing page, demo lives at /demo");

const html = await page.content();
// The bare word "Ollama" is allowed: past changelog entries are a record and
// legitimately name it. What must be gone is any present-tense claim or
// instruction — those are what became false when Claude entered the loop.
for (const stale of [
  "ollama pull",
  "100% local",
  "Runs 100% locally",
  "runs 100% on your Mac",
  "Open Sidenote",
  "localhost:4747",
  "prefer the browser",
]) {
  if (html.includes(stale)) fail(`landing still says "${stale}"`);
}
if (!html.includes("Explain this")) fail("landing never mentions Explain this");
console.log("ok: landing copy updated, no stale Ollama/100%-local claims");

// The hero privacy line must be the corrected one.
if (!(await page.locator("text=AI only sees the message you ask about").count())) {
  fail("hero privacy line not updated");
}
console.log("ok: hero privacy line corrected");

await page.screenshot({ path: "verify/reshot-landing.png", fullPage: false });

// ---------- 2. demo app: right-click a message ----------
// The demo is entered from the landing page, not a URL — clicking through is
// also what a real visitor does.
await page.locator('a[href="/demo"]').first().click();
await page.waitForURL(/\/demo/, { timeout: 15000 });
await page.waitForTimeout(2000);

// Open the first conversation, then right-click an actual message bubble.
// The context-menu handler is on the inner bubble, not the [data-mid] wrapper.
const row = page.locator("button, [role=button], li, a").filter({ hasText: /\d{1,2}:\d{2}\s?(AM|PM)|Yesterday/ }).first();
if (await row.count()) await row.click();
await page.waitForSelector("[data-mid]", { timeout: 20000 }).catch(() => {});

const bubbles = page.locator("[data-mid] .whitespace-pre-wrap");
const count = await bubbles.count();
if (!count) fail("no message bubbles rendered in the demo");
const target = bubbles.nth(Math.max(0, count - 4));
await target.scrollIntoViewIfNeeded();
await target.click({ button: "right" });
await page.waitForTimeout(700);

for (const item of ["Explain this", "Look this up", "Help me reply"]) {
  if (!(await page.locator(`text=${item}`).count())) fail(`context menu is missing "${item}"`);
}
console.log("ok: right-click menu has Explain this / Look this up / Help me reply");

await page.locator("text=Explain this").first().click();
await page.waitForTimeout(1500);
if (!(await page.locator("text=What this means").count())) fail("Explain popover did not open");
console.log("ok: Explain popover opens on the message");

await page.screenshot({ path: "verify/reshot.png", fullPage: false });
console.log("\nPASS — saved verify/reshot.png");
await browser.close();
