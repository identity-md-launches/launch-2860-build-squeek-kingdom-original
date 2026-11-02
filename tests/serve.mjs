import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
export async function serve(root = "dist") {
  const server = createServer(async (req, res) => {
    try {
      let url = decodeURIComponent(req.url.split("?")[0]);
      if (!url.startsWith("/preview/")) {
        res.writeHead(404);
        res.end();
        return;
      }
      url = url.slice(9) || "index.html";
      const file = path.resolve(root, url);
      if (!file.startsWith(path.resolve(root) + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const data = await readFile(file);
      const type =
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".svg": "image/svg+xml",
          ".woff2": "font/woff2",
          ".png": "image/png",
          ".json": "application/json",
        }[path.extname(file)] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, url: `http://127.0.0.1:${server.address().port}/preview/` };
}
