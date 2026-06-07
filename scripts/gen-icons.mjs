// Genera los íconos PNG de la PWA rasterizando un ícono de cristal con Chromium.
import { chromium } from "playwright";

const icon = (size) => `
<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0}
  .wrap{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 32% 26%, #b58bff 0%, #7c4dff 42%, #4a1fae 100%);}
  svg{width:62%;height:62%;filter:drop-shadow(0 ${size * 0.02}px ${size * 0.03}px rgba(0,0,0,.35))}
</style></head><body>
<div class="wrap">
  <svg viewBox="0 0 90 112" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff"/>
        <stop offset="0.2" stop-color="#e9dbff"/>
        <stop offset="0.6" stop-color="#c9a8ff"/>
        <stop offset="1" stop-color="#9c63ff"/>
      </linearGradient>
    </defs>
    <ellipse cx="45" cy="100" rx="26" ry="6.5" fill="#6a35cc"/>
    <ellipse cx="45" cy="97" rx="26" ry="6.5" fill="url(#b)"/>
    <path d="M26,97 Q45,99 64,97 L57,87 Q45,84 33,87 Z" fill="url(#b)"/>
    <path d="M37,86 Q33,66 36,52 L54,52 Q57,66 53,86 Z" fill="url(#b)"/>
    <path d="M33,53 Q45,47 57,53 L54,44 Q45,41 36,44 Z" fill="url(#b)"/>
    <ellipse cx="45" cy="40" rx="8.5" ry="6.5" fill="url(#b)"/>
    <path d="M42,14 L48,14 L48,22 L55,22 L55,28 L48,28 L48,38 L42,38 L42,28 L35,28 L35,22 L42,22 Z" fill="url(#b)"/>
  </svg>
</div></body></html>`;

const browser = await chromium.launch({ args: ["--no-sandbox"] });
for (const [size, file] of [
  [192, "public/icon-192.png"],
  [512, "public/icon-512.png"],
  [180, "public/apple-touch-icon.png"],
]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(icon(size));
  await page.waitForTimeout(150);
  await page.locator(".wrap").screenshot({ path: file });
  await page.close();
  console.log("generado", file);
}
await browser.close();
