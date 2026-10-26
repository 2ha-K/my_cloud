import test from "node:test";
import assert from "node:assert/strict";
import { DemoMediaRepository, mapMedia } from "../services/DemoMediaRepository";
const row = {
  id: "abc",
  kind: "video",
  filename: "旅行.mov",
  version: "v1",
  width: 1920,
  height: 1080,
  size: 3000,
  format: "mov",
  modifiedAt: "2026-01-01T00:00:00Z",
  capturedAt: null,
  duration: 12,
  codec: "h264",
  originalPath: "/media/abc/original?v=v1",
  thumbnailPath: "/media/abc/thumbnail?v=v1",
};
test("maps relative media URLs and video metadata without fabricating capture dates", () => {
  const result = mapMedia(row, "http://192.168.1.10:8787");
  assert.equal(
    result.originalUri,
    "http://192.168.1.10:8787/media/abc/original?v=v1",
  );
  assert.equal(result.capturedAt, null);
  assert.equal(result.duration, 12);
});
test("rejects invalid or external media paths", () => {
  assert.throws(() =>
    mapMedia(
      { ...row, originalPath: "https://other.invalid/a" },
      "http://localhost",
    ),
  );
  assert.throws(() => mapMedia({ ...row, width: null }, "http://localhost"));
});
test("refresh requests a fresh list and maps removals", async () => {
  const original = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ items: count++ === 0 ? [row] : [], warnings: [] }),
    );
  try {
    const repository = new DemoMediaRepository("http://localhost:8787");
    assert.equal((await repository.listMedia()).items.length, 1);
    assert.equal((await repository.listMedia()).items.length, 0);
  } finally {
    globalThis.fetch = original;
  }
});
test("missing base URL gives actionable configuration message", async () => {
  await assert.rejects(
    new DemoMediaRepository("").listMedia(),
    /EXPO_PUBLIC_MEDIA_BASE_URL/,
  );
});
