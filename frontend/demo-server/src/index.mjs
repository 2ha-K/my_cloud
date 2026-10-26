import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";
import { mkdir } from "node:fs/promises";
import { createMediaServer } from "./server.mjs";
import { assertWritableDirectory } from "./security.mjs";
const root = fileURLToPath(new URL("../test/", import.meta.url));
const cache = fileURLToPath(new URL("../cache/", import.meta.url));
const host = process.env.DEMO_HOST || "127.0.0.1";
const port = Number(process.env.DEMO_PORT || 8787);
const addresses = Object.values(networkInterfaces())
  .flat()
  .map((a) => a?.address);
if (!addresses.includes(host) || host === "0.0.0.0" || host === "::")
  throw new Error(
    "DEMO_HOST 必須是此電腦的明確 IP（例如 Wi-Fi IPv4），不能監聽所有介面",
  );
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("DEMO_PORT 必須為 1024–65535");
await mkdir(root, { recursive: true });
await mkdir(cache, { recursive: true });
await assertWritableDirectory(root);
await assertWritableDirectory(cache);
const server = createMediaServer({ root, cache });
server.listen(port, host, () =>
  console.log(
    `My Cloud demo: http://${host}:${port}\nRead-only media: ${root}\nCache: ${cache}`,
  ),
);
server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
