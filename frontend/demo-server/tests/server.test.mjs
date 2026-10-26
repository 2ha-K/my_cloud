import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  writeFile,
  readFile,
  stat,
  unlink,
  symlink,
  utimes,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { createMediaServer } from "../src/server.mjs";
import { createCatalog, fingerprint } from "../src/catalog.mjs";
import { createThumbnails } from "../src/thumbnails.mjs";
import { safeFile } from "../src/security.mjs";
import { parseRange } from "../src/range.mjs";
import { ffmpeg, toolsAvailable } from "../src/video.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execute = promisify(execFile);
const temporary = fileURLToPath(new URL("../../.tmp/tests/", import.meta.url));
async function fixture() {
  await mkdir(temporary, { recursive: true });
  const base = await mkdtemp(path.join(temporary, "media-"));
  const root = path.join(base, "test"),
    cache = path.join(base, "cache");
  await mkdir(root);
  await mkdir(cache);
  return { base, root, cache };
}
async function picture(root, name = "sample.jpg", color = "#ff5577") {
  const file = path.join(root, name);
  await sharp({
    create: { width: 24, height: 16, channels: 3, background: color },
  })
    .jpeg()
    .toFile(file);
  return file;
}
test("range parsing handles seek, suffix, open ranges and invalid ranges", () => {
  assert.deepEqual(parseRange("bytes=2-4", 10), { start: 2, end: 4 });
  assert.deepEqual(parseRange("bytes=-3", 10), { start: 7, end: 9 });
  assert.deepEqual(parseRange("bytes=8-", 10), { start: 8, end: 9 });
  assert.equal(parseRange("bytes=10-", 10), false);
  assert.equal(parseRange("bytes=0-1,3-4", 10), false);
  assert.equal(parseRange("bytes=-0", 10), false);
});
test("empty folder, invalid images and refresh add/modify/remove", async () => {
  const { root } = await fixture();
  const catalog = createCatalog(root);
  assert.deepEqual((await catalog.refresh()).items, []);
  await writeFile(path.join(root, "broken.png"), "not a png");
  await writeFile(path.join(root, "ignored.txt"), "not media");
  const file = await picture(root);
  let result = await catalog.refresh();
  assert.equal(result.items.length, 1);
  assert.equal(result.warnings.length, 1);
  const first = result.items[0];
  await picture(root, "sample.jpg", "#2299ff");
  result = await catalog.refresh();
  assert.equal(result.items[0].id, first.id);
  assert.notEqual(result.items[0].version, first.version);
  await unlink(file);
  assert.equal((await catalog.refresh()).items.length, 0);
});
test("thumbnail reuse, concurrent requests, source invalidation and original integrity", async () => {
  const { root, cache } = await fixture();
  const file = await picture(root);
  const before = await fingerprint(file);
  const catalog = createCatalog(root);
  let item = (await catalog.refresh()).items[0];
  const thumbnails = createThumbnails(cache, catalog);
  const results = await Promise.all([
    thumbnails(item),
    thumbnails(item),
    thumbnails(item),
  ]);
  assert.equal(new Set(results).size, 1);
  const modified = (await stat(results[0])).mtimeMs;
  assert.equal(await thumbnails(item), results[0]);
  assert.equal((await stat(results[0])).mtimeMs, modified);
  assert.equal(await fingerprint(file), before);
  await picture(root, "sample.jpg", "#111111");
  item = (await catalog.refresh()).items[0];
  assert.notEqual(await thumbnails(item), results[0]);
  await unlink(file);
  await assert.rejects(thumbnails(item));
});
test("same-length same-mtime replacement gets a new version on refresh", async () => {
  const { root } = await fixture();
  const file = await picture(root);
  const catalog = createCatalog(root);
  const first = (await catalog.refresh()).items[0];
  const info = await stat(file);
  const data = await readFile(file);
  data[data.length - 10] ^= 1;
  await writeFile(file, data);
  await utimes(file, info.atime, info.mtime);
  const next = await catalog.refresh();
  assert.ok(next.items.length === 0 || next.items[0].version !== first.version);
});
test("path escape and Windows junctions are rejected", async () => {
  const { base, root } = await fixture();
  await assert.rejects(safeFile(root, "../outside.jpg"));
  await assert.rejects(safeFile(root, "..\\outside.jpg"));
  await assert.rejects(safeFile(root, "C:\\outside.jpg"));
  const outside = path.join(base, "outside");
  await mkdir(outside);
  await picture(outside);
  const link = path.join(root, "linked");
  await symlink(
    outside,
    link,
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(safeFile(link, "sample.jpg"));
});
test("HTTP listing, HEAD, byte ranges, missing files and unsupported methods", async () => {
  const fixtureData = await fixture();
  const file = await picture(fixtureData.root);
  const server = createMediaServer(fixtureData);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const list = await (await fetch(`${base}/media`)).json();
    assert.equal(list.items.length, 1);
    const url = base + list.items[0].originalPath;
    const part = await fetch(url, { headers: { Range: "bytes=0-9" } });
    assert.equal(part.status, 206);
    assert.equal((await part.arrayBuffer()).byteLength, 10);
    assert.equal(part.headers.get("content-type"), "image/jpeg");
    assert.equal((await fetch(url, { method: "HEAD" })).status, 200);
    assert.equal(
      (await fetch(url, { headers: { Range: "bytes=999999-" } })).status,
      416,
    );
    assert.equal(
      (await fetch(`${base}/media`, { method: "POST" })).status,
      405,
    );
    assert.equal((await fetch(`${base}/media/%2e%2e%2foutside`)).status, 404);
    assert.equal((await fetch(base + list.items[0].thumbnailPath)).status, 200);
    await unlink(file);
    assert.equal((await fetch(url)).status, 404);
    assert.equal((await (await fetch(`${base}/media`)).json()).items.length, 0);
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});
test("H.264 MP4 is probed and receives a cached JPEG poster without source changes", async (t) => {
  if (!(await toolsAvailable())) {
    t.skip("Run npm run setup:tools first");
    return;
  }
  const { root, cache } = await fixture();
  const file = path.join(root, "clip.mp4");
  await execute(
    ffmpeg,
    [
      "-nostdin",
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=blue:s=64x48:r=10",
      "-t",
      "1",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      file,
    ],
    { windowsHide: true, timeout: 20000 },
  );
  const before = await fingerprint(file);
  const catalog = createCatalog(root);
  const item = (await catalog.refresh()).items[0];
  assert.equal(item.kind, "video");
  assert.equal(item.codec, "h264");
  assert.equal(item.width, 64);
  assert.ok(item.duration > 0);
  const poster = await createThumbnails(cache, catalog)(item);
  assert.equal((await sharp(poster).metadata()).format, "jpeg");
  assert.equal(await fingerprint(file), before);
});
