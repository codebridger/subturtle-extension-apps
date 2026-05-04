// Tiny static-file server for E2E fixtures. Avoids pulling in `serve` /
// `http-server` as a devDep just to back the Playwright tests.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "fixtures");
const PORT = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript",
  ".json": "application/json; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url ?? "/", `http://localhost:${PORT}`);
    let file = path.join(ROOT, decodeURIComponent(u.pathname));
    const stat = await fs.stat(file).catch(() => null);
    if (stat?.isDirectory()) file = path.join(file, "index.html");
    const data = await fs.readFile(file);
    res.writeHead(200, {
      "content-type": types[path.extname(file)] || "text/plain",
    });
    res.end(data);
  } catch {
    res.writeHead(404).end("not found");
  }
});

server.listen(PORT, () => {
  console.log(`fixtures at http://localhost:${PORT}`);
});
