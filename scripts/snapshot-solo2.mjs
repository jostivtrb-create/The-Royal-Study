import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = new URL("../dist/", import.meta.url).pathname;
const PORT = 4325;
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
const movChip = async () => (await page.locator(".round-chip").nth(1).innerText()).trim();
async function selectMovable() {
  const hits = page.locator(".hit");
  const n = await hits.count();
  for (let i = 0; i < n; i++) {
    await hits.nth(i).click({ force: true });
    await page.waitForTimeout(110);
    if (await page.locator(".tile--hi").count()) return true;
    if (await page.locator(".piece-slot--sel").count()) { await hits.nth(i).click({ force: true }); await page.waitForTimeout(50); }
  }
  return false;
}

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem("tre-tutorial", "true"); });
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);

// Entrar a Modo infinito (sin tutorial).
await clickRe(/Jugar solo/i);
await page.waitForTimeout(500);

// --- Solución paso a paso (rendirse) ---
await clickRe(/Rendirse/i);
await page.waitForTimeout(300);
await clickRe(/Ver soluci/i);
await page.waitForTimeout(400);
await shot("sol-step0");
await clickRe(/Siguiente paso/i);
await page.waitForTimeout(500);
await shot("sol-step1");
await clickRe(/Siguiente paso/i);
await page.waitForTimeout(500);
const lbl = await page.locator(".panel-q").innerText();
console.log("etiqueta paso:", JSON.stringify(lbl));
await clickRe(/Anterior/i);
await page.waitForTimeout(500);
await shot("sol-back");
await clickRe(/Siguiente puzzle/i);
await page.waitForTimeout(500);

// --- Continuidad: mover y recargar ---
const before = await movChip();
await selectMovable();
await page.waitForTimeout(150);
const tgt = page.locator(".tile--hi").first();
if (await tgt.count()) { const b = await tgt.boundingBox(); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
await page.waitForTimeout(400);
const afterMove = await movChip().catch(() => "?");
console.log("mov antes:", before, "| tras mover:", afterMove);
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
const afterReload = await page.locator(".round-chip").count() ? await movChip().catch(() => "?") : "(no en solo)";
const inSolo = await page.getByText(/Iguala el objetivo|Resuelto en/i).count();
console.log("tras recargar mov:", afterReload, "| sigue en modo infinito:", inSolo > 0);

await browser.close();
server.close();
console.log("OK solo2");
