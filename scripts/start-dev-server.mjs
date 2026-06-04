import { mkdirSync, openSync, writeSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
mkdirSync(join(root, ".next"), { recursive: true });
const log = openSync(join(root, ".next", "dev-server.log"), "a");
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");

writeSync(log, `\n[start-dev-server] ${new Date().toISOString()}\n`);

const child = spawn(process.execPath, [nextBin, "dev"], {
  cwd: root,
  env: process.env,
  stdio: ["ignore", log, log],
});

child.on("exit", (code, signal) => {
  writeSync(log, `[next exited] code=${code} signal=${signal}\n`);
  process.exit(code ?? 1);
});

process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));
