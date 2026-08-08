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

const html = await page.content();
// The bare word "Ollama" is allowed: past changelog entries are a record and
// legitimately name it. What must be gone is any present-tense claim or
// instruction — those are what became false when Claude entered the loop.
for (const stale of ["ollama pull", "100% local", "Runs 100% locally", "runs 100% on your Mac"]) {
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
await page.goto(`${URL}/app`, { waitUntil: "networkidle" }).catch(() => {});
if (!page.url().includes("/app")) {
  // The demo may live on the root behind a "Browse the demo" affordance.
  await page.goto(URL, { waitUntil: "networkidle" });
  const browse = page.locator('a:has-text("Browse the demo"), button:has-text("Browse the demo")').first();
  if (await browse.count()) await browse.click();
}
await page.waitForTimeout(2500);

// Open the first conversation, then right-click the first message bubble.
const thread = page.locator('[class*="cursor"], button').filter({ hasText: /Maya|Mom|Jake|Sarah/ }).first();
if (await thread.count()) await thread.click().catch(() => {});
await page.waitForTimeout(1500);

const bubble = page.locator("[data-mid]").first();
if (!(await bubble.count())) fail("no message bubbles rendered in the demo");
await bubble.click({ button: "right" });
await page.waitForTimeout(600);

for (const item of ["Explain this", "Look this up", "Help me reply"]) {
  if (!(await page.locator(`text=${item}`).count())) fail(`context menu is missing "${item}"`);
}
console.log("ok: right-click menu has Explain this / Look this up / Help me reply");

await page.locator("text=Explain this").first().click();
await page.waitForTimeout(1200);
if (!(await page.locator("text=What this means").count())) {
  fail("Explain popover did not open");
}
console.log("ok: Explain popover opens on the message");

await page.screenshot({ path: "verify/reshot.png", fullPage: false });
console.log("\nPASS — saved verify/reshot.png");
await browser.close();
