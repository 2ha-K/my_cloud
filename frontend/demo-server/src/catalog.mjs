import { readdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import exifr from "exifr";
import { safeFile, assertWritableDirectory } from "./security.mjs";
import { probeVideo, toolsAvailable } from "./video.mjs";

// Avoid holding Windows file handles open when users replace test media.
sharp.cache(false);

const photos = new Map([
  [".jpg", "jpeg"],
  [".jpeg", "jpeg"],
  [".png", "png"],
  [".webp", "webp"],
  [".gif", "gif"],
]);
const videos = new Map([
  [".mp4", "mp4"],
  [".mov", "mov"],
]);
export async function fingerprint(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex").slice(0, 24);
}
function captureDate(value) {
  if (!value) return null;
  // EXIF without a timezone is a local wall-clock value, not UTC.
  if (typeof value === "string" && /^\d{4}:\d{2}:\d{2} /.test(value))
    return value.replace(/^(\d{4}):(\d{2}):(\d{2}) /, "$1-$2-$3T");
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
export function createCatalog(root) {
  let entries = new Map();
  let pending;
  async function scan() {
    await assertWritableDirectory(root);
    const next = new Map();
    const warnings = [];
    const available = await toolsAvailable();
    for (const filename of (await readdir(root)).sort()) {
      const ext = path.extname(filename).toLowerCase();
      if (!photos.has(ext) && !videos.has(ext)) continue;
      try {
        const { file, info } = await safeFile(root, filename);
        // Hash on refresh so even same-size, same-mtime replacements invalidate caches.
        const version = await fingerprint(file);
        const id = createHash("sha256")
          .update(filename)
          .digest("hex")
          .slice(0, 24);
        const previous = entries.get(id);
        if (previous?.version === version) {
          next.set(id, { ...previous, modifiedAt: info.mtime.toISOString() });
          continue;
        }
        let meta;
        const isVideo = videos.has(ext);
        if (isVideo) {
          if (!available)
            throw new Error("請先執行 npm run setup:tools，才能讀取影片");
          meta = await probeVideo(file);
        } else {
          const image = sharp(file, { limitInputPixels: 100000000 });
          const m = await image.metadata();
          if (
            !["jpeg", "png", "webp", "gif"].includes(m.format) ||
            !m.width ||
            !m.height
          )
            throw new Error("Invalid image");
          // Decode a small frame to catch corrupt pixel data, not only corrupt headers.
          await image.resize(16, 16, { fit: "inside" }).toBuffer();
          const rotated = [5, 6, 7, 8].includes(m.orientation);
          const exif = await exifr
            .parse(file, { pick: ["DateTimeOriginal"], reviveValues: false })
            .catch(() => null);
          meta = {
            width: rotated ? (m.pageHeight ?? m.height) : m.width,
            height: rotated ? m.width : (m.pageHeight ?? m.height),
            capturedAt: exif?.DateTimeOriginal ?? null,
          };
        }
        const after = await safeFile(root, filename);
        if (
          after.info.size !== info.size ||
          after.info.mtimeMs !== info.mtimeMs
        )
          throw new Error("File changed during scan; refresh again");
        next.set(id, {
          id,
          filename,
          kind: isVideo ? "video" : "photo",
          format: (isVideo ? videos : photos).get(ext),
          size: info.size,
          modifiedAt: info.mtime.toISOString(),
          ...meta,
          capturedAt: captureDate(meta.capturedAt),
          version,
        });
      } catch (error) {
        warnings.push({ filename, message: error.message });
      }
    }
    entries = next;
    return {
      items: [...entries.values()].sort(
        (a, b) =>
          (b.capturedAt ?? b.modifiedAt).localeCompare(
            a.capturedAt ?? a.modifiedAt,
          ) || a.id.localeCompare(b.id),
      ),
      warnings,
    };
  }
  return {
    refresh() {
      return (pending ??= scan().finally(() => {
        pending = undefined;
      }));
    },
    get(id) {
      return entries.get(id);
    },
    async resolve(item) {
      const result = await safeFile(root, item.filename);
      if (
        result.info.size !== item.size ||
        result.info.mtime.toISOString() !== item.modifiedAt
      )
        throw Object.assign(new Error("媒體已變更，請重新整理"), {
          status: 409,
        });
      return result;
    },
  };
}
