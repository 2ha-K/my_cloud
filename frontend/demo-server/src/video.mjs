import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access } from "node:fs/promises";
const execute = promisify(execFile);
const tools = fileURLToPath(new URL("../tools/", import.meta.url));
export const ffmpeg = path.join(
  tools,
  process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
);
export const ffprobe = path.join(
  tools,
  process.platform === "win32" ? "ffprobe.exe" : "ffprobe",
);
export async function toolsAvailable() {
  try {
    await Promise.all([access(ffmpeg), access(ffprobe)]);
    return true;
  } catch {
    return false;
  }
}
export async function probeVideo(file) {
  const { stdout } = await execute(
    ffprobe,
    [
      "-v",
      "error",
      "-protocol_whitelist",
      "file",
      "-show_format",
      "-show_streams",
      "-of",
      "json",
      file,
    ],
    { timeout: 20000, maxBuffer: 2 * 1024 * 1024, windowsHide: true },
  );
  const data = JSON.parse(stdout);
  const stream = data.streams?.find((s) => s.codec_type === "video");
  if (!stream || !stream.width || !stream.height)
    throw new Error("No video stream");
  const rotation = Number(
    stream.side_data_list?.find((s) => s.rotation !== undefined)?.rotation ??
      stream.tags?.rotate ??
      0,
  );
  const rotated = Math.abs(rotation % 180) === 90;
  return {
    width: rotated ? stream.height : stream.width,
    height: rotated ? stream.width : stream.height,
    duration: Number(data.format?.duration ?? stream.duration) || 0,
    codec: stream.codec_name ?? "unknown",
    audioCodec:
      data.streams.find((s) => s.codec_type === "audio")?.codec_name ?? null,
    capturedAt:
      data.format?.tags?.creation_time ?? stream.tags?.creation_time ?? null,
  };
}
export async function videoThumbnail(file, output, duration) {
  await execute(
    ffmpeg,
    [
      "-nostdin",
      "-v",
      "error",
      "-protocol_whitelist",
      "file",
      "-ss",
      String(Math.min(1, duration / 2)),
      "-i",
      file,
      "-frames:v",
      "1",
      "-vf",
      "scale=640:640:force_original_aspect_ratio=decrease",
      "-threads",
      "1",
      "-f",
      "image2",
      "-y",
      output,
    ],
    { timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true },
  );
}
