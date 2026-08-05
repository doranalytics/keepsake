import sharp from "sharp";
import { mkdirSync } from "fs";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3aa0ff"/>
      <stop offset="1" stop-color="#0a5fd7"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#bg)"/>
  <path d="M256 118c-84 0-152 55-152 123 0 39 22 74 57 97-3 18-12 37-28 51 26-2 51-12 70-26 17 4 35 7 53 7 84 0 152-55 152-129s-68-123-152-123z" fill="#ffffff"/>
  <circle cx="238" cy="234" r="46" fill="none" stroke="#0a72e8" stroke-width="22"/>
  <line x1="272" y1="268" x2="312" y2="308" stroke="#0a72e8" stroke-width="22" stroke-linecap="round"/>
</svg>`;

mkdirSync("public", { recursive: true });
const buf = Buffer.from(svg);
await sharp(buf).resize(512, 512).png().toFile("public/icon-512.png");
await sharp(buf).resize(192, 192).png().toFile("public/icon-192.png");
await sharp(buf).resize(180, 180).png().toFile("public/apple-icon.png");
await sharp(buf).resize(64, 64).png().toFile("src/app/icon.png");
console.log("icons generated");
