// Sirve el build de /dist y captura el prototipo en tamaño celular.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = new URL("../dist/", import.meta.url).pathname;
const PORT = 4317;

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
};

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url || "/").split("?")[0]);
    if (p === "/") p = "/index.html";
    const file = join(DIST, normalize(p));
    const data = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({
  viewport: { width: 412, height: 900 },
  deviceScaleFactor: 2,
});
await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: "snapshots/home.png" });

// Entrar al juego.
const playBtn = page.getByRole("button", { name: /Jugar local/i });
if (await playBtn.count()) {
  await playBtn.click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: "snapshots/game.png" });

  // Seleccionar una pieza para mostrar elevación + casillas destino.
  const piece = page.locator(".piece-slot").first();
  if (await piece.count()) {
    await piece.click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({ path: "snapshots/game-selected.png" });
  }
}

await browser.close();
server.close();
console.log("OK: snapshots/home.png, snapshots/game.png");
