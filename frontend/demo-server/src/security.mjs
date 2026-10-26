import path from "node:path";
import { lstat, realpath } from "node:fs/promises";

export function inside(root, target) {
  const relative = path.relative(root, target);
  return (
    relative !== "" &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  );
}

// No client-supplied path ever enters this function. Reject symlinks/junctions,
// including replacement of the configured root after startup.
export async function safeFile(root, filename) {
  if (
    path.basename(filename) !== filename ||
    filename.includes("\\") ||
    filename.includes("/") ||
    filename.includes(":")
  ) {
    throw new Error("Unsafe filename");
  }
  const rootInfo = await lstat(root);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory())
    throw new Error("Unsafe media root");
  const canonicalRoot = await realpath(root);
  if (
    path.resolve(canonicalRoot).toLowerCase() !==
    path.resolve(root).toLowerCase()
  )
    throw new Error("Redirected media root");
  const file = path.join(root, filename);
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.nlink > 1)
    throw new Error("Not an isolated regular file");
  const actual = await realpath(file);
  if (!inside(canonicalRoot, actual)) throw new Error("Outside media root");
  return { file: actual, info };
}

export async function assertWritableDirectory(directory) {
  const info = await lstat(directory);
  const actual = await realpath(directory);
  if (
    !info.isDirectory() ||
    info.isSymbolicLink() ||
    path.resolve(actual).toLowerCase() !== path.resolve(directory).toLowerCase()
  ) {
    throw new Error("Cache must be a real directory inside demo-server");
  }
}
