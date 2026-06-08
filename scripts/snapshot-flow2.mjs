import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = new URL("../dist/", import.meta.url).pathname;
const PORT = 4324;
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

// --- Parte A: primera vez + tutorial guiado ---
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);
console.log("¿tutorial NO sale al abrir?:", (await page.locator(".tut").count()) === 0);
console.log("botones inicio:", JSON.stringify(await page.locator(".menu-btn").allInnerTexts()));
await shot("f2-home");

await clickRe(/Jugar solo/i);
await page.waitForTimeout(400);
console.log("¿tutorial sale en Jugar solo (1a vez)?:", (await page.locator(".tut").count()) > 0);

await clickRe(/Empezar/i); await page.waitForTimeout(300);
await clickRe(/Siguiente/i); await page.waitForTimeout(400); // ahora paso 2 (mover)

// Movimiento EQUIVOCADO: Rey (8) a (1,2)=5 → debe deshacer + pista, sin avanzar.
const hits = page.locator(".hit");
await hits.nth(8).click({ force: true }); await page.waitForTimeout(200);
await hits.nth(5).click({ force: true }); await page.waitForTimeout(300);
const sigAfterWrong = await page.getByRole("button", { name: /Siguiente/i }).count();
console.log("tras error: ¿bloquea Siguiente?:", sigAfterWrong === 0);
await shot("f2-tut-move-wrong");

// Movimiento CORRECTO: Rey (8) a (2,1)=7 → éxito.
await hits.nth(8).click({ force: true }); await page.waitForTimeout(200);
await hits.nth(7).click({ force: true }); await page.waitForTimeout(400);
console.log("tras acierto: ¿aparece Siguiente?:", (await page.getByRole("button", { name: /Siguiente/i }).count()) > 0);
await shot("f2-tut-move-ok");

await clickRe(/Siguiente/i); await page.waitForTimeout(400); // paso 3 (girar)
// Intento mover en el paso de girar → pista.
await hits.nth(8).click({ force: true }); await page.waitForTimeout(150);
await hits.nth(7).click({ force: true }); await page.waitForTimeout(300);
await shot("f2-tut-rot-warn");
// Girar correctamente.
await clickRe(/Girar el tablero/i); await page.waitForTimeout(500);
await shot("f2-tut-rot-ok");

await clickRe(/Siguiente/i); await page.waitForTimeout(400); // paso final
await shot("f2-tut-final");
await clickRe(/Probemos/i); await page.waitForTimeout(600);
console.log("tras Probemos ¿está en Modo infinito?:", (await page.getByText(/Iguala el objetivo/i).count()) > 0);
await shot("f2-solo");

// --- Parte B: multiplayer + jugar solo ya sin tutorial ---
await page.evaluate(() => { localStorage.clear(); localStorage.setItem("tre-tutorial", "true"); });
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
await clickRe(/Jugar Multiplayer/i); await page.waitForTimeout(400);
await shot("f2-multiplayer");
console.log("submenu:", JSON.stringify(await page.locator(".menu-btn").allInnerTexts()));

await browser.close();
server.close();
console.log("OK flow2");
