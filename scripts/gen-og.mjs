import sharp from "sharp";

// 1200x630 OG card: headline left, product shot right
const W = 1200;
const H = 630;

const bg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#fbfbfd"/>
  <text x="80" y="240" font-family="-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
        font-size="76" font-weight="700" fill="#1d1d1f" letter-spacing="-2">Every text.</text>
  <text x="80" y="330" font-family="-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
        font-size="76" font-weight="700" fill="#1d1d1f" letter-spacing="-2">Remembered.</text>
  <text x="80" y="405" font-family="-apple-system, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
        font-size="27" fill="#6e6e73">Search, pin, and ask AI about your</text>
  <text x="80" y="443" font-family="-apple-system, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
        font-size="27" fill="#6e6e73">iMessage history — 100% on your Mac.</text>
  <text x="80" y="530" font-family="-apple-system, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif"
        font-size="26" font-weight="600" fill="#0a84ff">sidenote.lol</text>
</svg>`;

const icon = await sharp("public/icon-512.png").resize(110, 110).png().toBuffer();

// screenshot panel on the right, slightly cropped
const shot = await sharp("public/screenshot.png")
  .resize({ height: 760 })
  .png()
  .toBuffer();
const shotMeta = await sharp(shot).metadata();

// rounded-corner mask for the screenshot
const mask = Buffer.from(
  `<svg width="${shotMeta.width}" height="${shotMeta.height}"><rect width="${shotMeta.width}" height="${shotMeta.height}" rx="18" fill="#fff"/></svg>`
);
const rounded = await sharp(shot)
  .composite([{ input: mask, blend: "dest-in" }])
  .png()
  .toBuffer();

// crop to the visible panel area (bleeds off the right/bottom edge)
const panel = await sharp(rounded)
  .extract({ left: 0, top: 0, width: 520, height: 540 })
  .png()
  .toBuffer();

await sharp(Buffer.from(bg))
  .composite([
    { input: icon, left: 80, top: 68 },
    { input: panel, left: 660, top: 90 },
  ])
  .png()
  .toFile("public/og.png");

console.log("og.png generated");
