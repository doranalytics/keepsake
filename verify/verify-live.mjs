import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("https://sidenote.lol", { waitUntil: "networkidle" });

const btn = page.locator('a[href="/Sidenote.zip"][download]');
const count = await btn.count();
console.log("download CTA present:", count > 0);
console.log("CTA text:", (await btn.first().innerText()).trim());

// Head-check the zip from the page's origin.
const zip = await page.evaluate(() =>
  fetch("/Sidenote.zip", { method: "HEAD" }).then((r) => ({ ok: r.ok, status: r.status, size: r.headers.get("content-length") }))
);
console.log("zip HEAD:", JSON.stringify(zip));

// Open the setup panel the way a user would (real click starts a download; use a
// synthetic click on the handler path by preventing navigation first).
await page.evaluate(() => {
  const a = document.querySelector('a[href="/Sidenote.zip"][download]');
  a.addEventListener("click", (e) => e.preventDefault(), { once: true });
  a.click();
});
await page.waitForTimeout(600);
const panel = await page.getByText("three steps from your first search").count();
console.log("setup panel shown:", panel > 0);
const dragStep = await page.getByText("drag").first().innerText().catch(() => "");
console.log("step copy:", dragStep.slice(0, 90));

const changelog = await page.getByText("Sidenote is now a real Mac app").count();
console.log("what's-new entry:", changelog > 0);

await page.screenshot({ path: "verify/reshot.png", fullPage: false });
console.log("screenshot saved");
await browser.close();
