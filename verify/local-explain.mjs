// Drives the real feature against the real index: open a thread, right-click a
// message, pick Explain this, and screenshot the popover with a live answer.
import { chromium } from "playwright";

const BASE = "http://localhost:4848";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => m.type() === "error" && console.log("console error:", m.text()));

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);

// Open the first conversation in the sidebar by clicking its row.
const row = page.locator("button, [role=button], li, a").filter({ hasText: /\d{1,2}:\d{2}\s?(AM|PM)/ }).first();
if (await row.count()) {
  await row.click();
} else {
  await page.locator("aside li, aside button").first().click().catch(() => {});
}
await page.waitForSelector("[data-mid]", { timeout: 20000 });

const bubbles = page.locator("[data-mid]");
const n = await bubbles.count();
console.log("bubbles rendered:", n);
if (!n) {
  await page.screenshot({ path: "/tmp/nobubbles.png" });
  console.log("FAIL: no bubbles");
  process.exit(1);
}

// Right-click a message that has some text in it.
// The context-menu handler lives on the inner bubble, not the [data-mid] wrapper.
let target = page.locator("[data-mid] .whitespace-pre-wrap").nth(Math.max(0, (await page.locator("[data-mid] .whitespace-pre-wrap").count()) - 4));
await target.scrollIntoViewIfNeeded();
await target.click({ button: "right" });
await page.waitForTimeout(500);

const menuItems = await page.locator("text=Explain this").count();
console.log("menu has 'Explain this':", menuItems > 0);
if (!menuItems) {
  await page.screenshot({ path: "/tmp/nomenu.png" });
  process.exit(1);
}

await page.locator("text=Explain this").first().click();
// Give the answer time to stream in.
await page.waitForTimeout(9000);

const popover = await page.locator("text=What this means").count();
console.log("popover open:", popover > 0);
const body = await page.textContent("body");
console.log("has web button:", body.includes("Search the web"));
console.log("has follow-up:", (await page.locator('input[placeholder*="follow-up"]').count()) > 0);
const box = await page.locator("text=What this means").first().boundingBox();
const card = await page.locator('div:has(> div:has-text("What this means"))').last().boundingBox().catch(() => null);
console.log("popover fits in viewport:", box && card ? (card.y + card.height) <= 900 : "n/a");
console.log("has continue:", body.includes("Continue in panel"));

await page.screenshot({ path: "/tmp/local-explain.png" });
console.log("screenshot: /tmp/local-explain.png");
await browser.close();
