import http from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { createCatalog } from "./catalog.mjs";
import { createThumbnails } from "./thumbnails.mjs";
import { parseRange } from "./range.mjs";
import { toolsAvailable } from "./video.mjs";
const mime = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
};
function publicItem(item) {
  return {
    ...item,
    originalPath: `/media/${item.id}/original?v=${item.version}`,
    thumbnailPath: `/media/${item.id}/thumbnail?v=${item.version}`,
  };
}
export function createMediaServer({ root, cache }) {
  const catalog = createCatalog(root);
  const thumbnail = createThumbnails(cache, catalog);
  return http.createServer(async (req, res) => {
    const json = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(data));
    };
    // Native clients do not require CORS. Web preview is restricted to localhost.
    if (
      /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(req.headers.origin ?? "")
    ) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Range");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader(
        "Access-Control-Expose-Headers",
        "Content-Range, Accept-Ranges, Content-Length",
      );
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      json(405, { error: "僅提供唯讀存取" });
      return;
    }
    try {
      const url = new URL(req.url, "http://demo.local");
      if (url.pathname === "/health") {
        json(200, { ok: true, videoTools: await toolsAvailable() });
        return;
      }
      if (url.pathname === "/media") {
        const result = await catalog.refresh();
        json(200, {
          items: result.items.map(publicItem),
          warnings: result.warnings,
        });
        return;
      }
      const match = /^\/media\/([a-f0-9]{24})(?:\/(original|thumbnail))?$/.exec(
        url.pathname,
      );
      if (!match) {
        json(404, { error: "找不到媒體" });
        return;
      }
      const item = catalog.get(match[1]);
      if (!item) {
        json(404, { error: "找不到媒體，請重新整理圖庫" });
        return;
      }
      const source = await catalog.resolve(item);
      if (!match[2]) {
        json(200, publicItem(item));
        return;
      }
      if (
        url.searchParams.has("v") &&
        url.searchParams.get("v") !== item.version
      ) {
        json(409, { error: "媒體已更新，請重新整理" });
        return;
      }
      const isThumb = match[2] === "thumbnail";
      const file = isThumb ? await thumbnail(item) : source.file;
      const info = isThumb ? await stat(file) : source.info;
      const range = parseRange(req.headers.range, info.size);
      if (range === false) {
        res.writeHead(416, { "Content-Range": `bytes */${info.size}` });
        res.end();
        return;
      }
      const headers = {
        "Content-Type": isThumb ? "image/jpeg" : mime[item.format],
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=0, must-revalidate",
        ETag: `"${item.version}-${isThumb ? "thumb" : "original"}"`,
        "Content-Length": range ? range.end - range.start + 1 : info.size,
      };
      if (!range && req.headers["if-none-match"] === headers.ETag) {
        res.writeHead(304, headers);
        res.end();
        return;
      }
      if (range)
        headers["Content-Range"] =
          `bytes ${range.start}-${range.end}/${info.size}`;
      res.writeHead(range ? 206 : 200, headers);
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      await pipeline(createReadStream(file, range ?? {}), res);
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const status = error.status ?? (error.code === "ENOENT" ? 404 : 500);
      json(status, {
        error:
          status === 404
            ? "媒體已移除，請重新整理"
            : status === 409
              ? error.message
              : "讀取媒體失敗，請重試",
      });
      if (status === 500) console.error("[demo]", error.message);
    }
  });
}
