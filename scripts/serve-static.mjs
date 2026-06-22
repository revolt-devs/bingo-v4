#!/usr/bin/env node

import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = process.cwd();
const port = Number(process.argv[2] || 4174);
const appShell = resolve(root, "wrapped", "index.html");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml"
};

function send(response, statusCode, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, { "Content-Type": contentType });
  response.end(body);
}

function resolveRequestPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relativePath = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const candidate = resolve(root, normalize(relativePath));

  if (candidate !== root && !candidate.startsWith(root + sep)) {
    return null;
  }

  try {
    const stats = statSync(candidate);
    if (stats.isDirectory()) return join(candidate, "index.html");
    return candidate;
  } catch {
    return candidate;
  }
}

const server = createServer((request, response) => {
  const requestPath = (request.url || "/").split("?")[0];

  if (requestPath === "/") {
    response.writeHead(302, { Location: "/wrapped/" });
    response.end();
    return;
  }

  if (requestPath === "/wrapped") {
    const query = (request.url || "").includes("?") ? `?${(request.url || "").split("?").slice(1).join("?")}` : "";
    response.writeHead(302, { Location: `/wrapped/${query}` });
    response.end();
    return;
  }

  const filePath = resolveRequestPath(request.url || "/");
  if (!filePath) {
    send(response, 403, "Forbidden");
    return;
  }

  let stats;
  try {
    stats = statSync(filePath);
  } catch {
    if (!extname(filePath)) {
      const fallbackStats = statSync(appShell);
      response.writeHead(200, {
        "Content-Type": mimeTypes[".html"],
        "Content-Length": fallbackStats.size
      });
      createReadStream(appShell).pipe(response);
      return;
    }

    send(response, 404, "Not found");
    return;
  }

  if (!stats.isFile()) {
    send(response, 404, "Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream",
    "Content-Length": stats.size
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}/`);
});
