import path from "node:path";
import { access, rename, unlink, lstat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { videoThumbnail } from "./video.mjs";
import { assertWritableDirectory } from "./security.mjs";
export function createThumbnails(cache, catalog) {
  const pending = new Map();
  let running = 0;
  const queue = [];
  async function acquire() {
    if (running >= 2) await new Promise((resolve) => queue.push(resolve));
    else running++;
  }
  function release() {
    const next = queue.shift();
    if (next) next();
    else running--;
  }
  return async (item) => {
    await assertWritableDirectory(cache);
    const filename = `${item.id}-${item.version}-640-v1.jpg`;
    const destination = path.join(cache, filename);
    await catalog.resolve(item); // Removed originals must not be served from cache.
    try {
      await access(destination);
      const info = await lstat(destination);
      if (info.isSymbolicLink() || !info.isFile() || info.nlink > 1)
        throw new Error("Unsafe cache entry");
      return destination;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (pending.has(filename)) return pending.get(filename);
    const operation = (async () => {
      await acquire();
      const temp = path.join(cache, `${randomUUID()}.jpg`);
      try {
        const { file } = await catalog.resolve(item);
        if (item.kind === "video")
          await videoThumbnail(file, temp, item.duration);
        else
          await sharp(file, { limitInputPixels: 100000000 })
            .rotate()
            .resize(640, 640, { fit: "inside", withoutEnlargement: true })
            .flatten({ background: "#fff" })
            .jpeg({ quality: 82 })
            .toFile(temp);
        await catalog.resolve(item);
        await assertWritableDirectory(cache);
        await rename(temp, destination);
        return destination;
      } finally {
        await unlink(temp).catch(() => {});
        release();
      }
    })();
    pending.set(filename, operation);
    try {
      return await operation;
    } finally {
      pending.delete(filename);
    }
  };
}
