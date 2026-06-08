import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = new URL("../dist/", import.meta.url).pathname;
const PORT = 4326;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try { let p = decodeURIComponent((req.url || "/").split("?")[0]); if (p === "/") p = "/index.html"; const f = join(DIST, normalize(p)); res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" }); res.end(await readFile(f)); }
  catch { res.writeHead(404); res.end("nf"); }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2 });
const shot = (n) => page.screenshot({ path: `snapshots/${n}.png` });
const clickRe = (re) => page.getByRole("button", { name: re }).first().click({ force: true });

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
await clickRe(/Jugar solo/i); await page.waitForTimeout(300);

await clickRe(/Empezar/i); await page.waitForTimeout(300);  // 0->1
await clickRe(/Siguiente/i); await page.waitForTimeout(300); // 1->2 mover

const hits = page.locator(".hit");
await hits.nth(8).click({ force: true }); await page.waitForTimeout(150);
await hits.nth(5).click({ force: true }); await page.waitForTimeout(250); // mal
console.log("paso mover, tras error bloquea Siguiente:", (await page.getByRole("button", { name: /Siguiente/i }).count()) === 0);
await hits.nth(8).click({ force: true }); await page.waitForTimeout(150);
await hits.nth(7).click({ force: true }); await page.waitForTimeout(300); // bien
await shot("t2-move-ok");
await clickRe(/Siguiente/i); await page.waitForTimeout(300); // 2->3 girar

await shot("t3-rotate");
// intentar mover (mal) en paso girar
await hits.nth(8).click({ force: true }); await page.waitForTimeout(120);
await hits.nth(7).click({ force: true }); await page.waitForTimeout(250);
// transformar mal (espejo H = nth 2)
await page.locator(".op-btn").nth(2).click({ force: true }); await page.waitForTimeout(250);
console.log("paso girar, antes de acertar bloquea Siguiente:", (await page.getByRole("button", { name: /Siguiente/i }).count()) === 0);
await shot("t3-rotate-hint");
// transformar bien (⟳ = nth 0)
await page.locator(".op-btn").nth(0).click({ force: true }); await page.waitForTimeout(400);
await shot("t3-rotate-ok");
await clickRe(/Siguiente/i); await page.waitForTimeout(300); // 3->4 meta
await shot("t4-meta");
await clickRe(/Siguiente/i); await page.waitForTimeout(300); // 4->5 final
await clickRe(/Probemos/i); await page.waitForTimeout(500);

// Continuidad infinito: capturar board, Rendirse, Siguiente puzzle, capturar board (mismas piezas).
await shot("c-solo-A");
await clickRe(/Rendirse/i); await page.waitForTimeout(300);
await clickRe(/Siguiente/i); await page.waitForTimeout(500); // result -> siguiente puzzle
await shot("c-solo-B");
console.log("OK flow2");

await browser.close();
server.close();
