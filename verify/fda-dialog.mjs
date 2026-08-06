// Drives the real Full Disk Access failure path and measures whether the
// guide fits inside the dialog frame. Run against a Sidenote server whose
// process lacks Full Disk Access (a plain `next dev`), which is exactly the
// state a user hits on first sync.
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:4848";
const LABEL = process.argv[3] ?? "app";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(BASE, { waitUntil: "networkidle" });

// Trigger a real sync; without FDA it fails with a permission error.
await page.getByRole("button", { name: /^Sync$/ }).click();
await page.getByRole("button", { name: /Show me how to grant it/ }).click({ timeout: 45000 });

const dialog = page.getByRole("dialog");
await dialog.waitFor();
await page.waitForTimeout(400);

const box = await dialog.boundingBox();
const overflow = await dialog.evaluate((el) => {
  const rect = el.getBoundingClientRect();
  let worst = 0;
  let culprit = "";
  for (const node of el.querySelectorAll("*")) {
    const r = node.getBoundingClientRect();
    const over = Math.max(r.right - rect.right, rect.left - r.left);
    if (over > worst) {
      worst = over;
      culprit = node.className?.toString().slice(0, 60) ?? node.tagName;
    }
  }
  return {
    scrollOverflow: el.scrollWidth - el.clientWidth,
    worstChildOverflowPx: Math.round(worst),
    culprit,
  };
});

console.log(`[${LABEL}] dialog width: ${Math.round(box.width)}px, viewport 1280`);
console.log(`[${LABEL}] fits in viewport:`, box.x >= 0 && box.x + box.width <= 1280);
console.log(`[${LABEL}] overflow:`, JSON.stringify(overflow));
console.log(`[${LABEL}] engine path line shown:`, (await dialog.getByText(/^engine:/).count()) > 0);

await page.screenshot({ path: `verify/fda-${LABEL}.png` });
await browser.close();
