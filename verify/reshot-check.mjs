// Verifies the reshot on the LIVE site: the landing page's "Already installed?"
// launcher and the in-app Settings dialog with AI model section.
import { chromium } from "playwright";

const URL = "https://sidenote.lol";
const fail = (msg) => {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 860 } });

// 1) Fresh visitor → landing page with the launch affordance
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector("text=Every text.", { timeout: 15000 });
const already = page.locator("text=Already installed?");
if (!(await already.count())) fail("landing is missing 'Already installed?'");
const openLink = page.locator('a[href="http://localhost:4747"]').first();
if (!(await openLink.count())) fail("landing has no Open Sidenote link to localhost:4747");
await page.screenshot({ path: "verify/reshot-landing.png" });

// 2) Enter the demo → gear button → Settings dialog with AI model section
await page.click("text=Browse the demo");
await page.waitForSelector('[aria-label="Open settings"]', { timeout: 15000 });
await page.click('[aria-label="Open settings"]');
await page.waitForSelector("text=Settings", { timeout: 10000 });
if (!(await page.locator("text=AI model").count())) fail("settings dialog missing 'AI model'");
if (!(await page.locator("text=Opening Sidenote").count()))
  fail("settings dialog missing 'Opening Sidenote' section");
await page.screenshot({ path: "verify/reshot.png" });

console.log("PASS: landing launcher + settings dialog verified on live site");
await browser.close();
