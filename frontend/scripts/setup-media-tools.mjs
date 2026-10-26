import {
  mkdir,
  copyFile,
  writeFile,
  rename,
  unlink,
  chmod,
  readFile,
  lstat,
  realpath,
} from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { createHash } from "node:crypto";
const directory = fileURLToPath(
  new URL("../demo-server/tools/", import.meta.url),
);
const require = createRequire(
  new URL("../demo-server/package.json", import.meta.url),
);
if (process.platform !== "win32" || process.arch !== "x64")
  throw new Error("This prototype setup script targets Windows x64.");
await mkdir(directory, { recursive: true });
if (
  (await lstat(directory)).isSymbolicLink() ||
  (await realpath(directory)).toLowerCase() !==
    path.resolve(directory).toLowerCase()
)
  throw new Error("Tools directory cannot be redirected");
const release = "b6.1.1";
const base = `https://github.com/eugeneware/ffmpeg-static/releases/download/${release}`;
async function download(url, destination, gzip = false) {
  const temporary = `${destination}.download`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
    if (!response.ok || !response.body)
      throw new Error(`Download failed: ${response.status} ${url}`);
    const source = Readable.fromWeb(response.body);
    if (gzip)
      await pipeline(
        source,
        createGunzip(),
        createWriteStream(temporary, { flags: "wx" }),
      );
    else await pipeline(source, createWriteStream(temporary, { flags: "wx" }));
    await rename(temporary, destination);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
const target = path.join(directory, "ffmpeg.exe");
console.log(
  "Downloading pinned FFmpeg release into frontend/demo-server/tools…",
);
await download(`${base}/ffmpeg-win32-x64.gz`, target, true);
await download(
  `${base}/win32-x64.LICENSE`,
  path.join(directory, "ffmpeg.LICENSE"),
);
await download(
  `${base}/win32-x64.README`,
  path.join(directory, "ffmpeg.README"),
);
const probe = require("ffprobe-static").path;
await copyFile(probe, path.join(directory, "ffprobe.exe"));
await chmod(target, 0o755);
const manifest = {
  ffmpegSource: `${base}/ffmpeg-win32-x64.gz`,
  ffmpegSha256: createHash("sha256")
    .update(await readFile(target))
    .digest("hex"),
  ffprobePackage: "ffprobe-static@3.1.0",
  ffprobeSha256: createHash("sha256")
    .update(await readFile(probe))
    .digest("hex"),
};
await writeFile(
  path.join(directory, "provenance.json"),
  JSON.stringify(manifest, null, 2),
);
console.log("Video tools ready. Originals are never rewritten.");
