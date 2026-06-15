import { spawn } from "node:child_process";
import { existsSync, openSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readOption(name) {
  const optionIndex = process.argv.indexOf(name);
  if (optionIndex === -1) {
    return null;
  }

  const value = process.argv[optionIndex + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }

  return value;
}

const port = readOption("--port") ?? process.env.PORT ?? "3001";
const hostname = readOption("--hostname") ?? process.env.PROD_SERVER_HOSTNAME ?? "0.0.0.0";
const nextCli = join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const outLog = join(projectRoot, `next-start-${port}.out.log`);
const errLog = join(projectRoot, `next-start-${port}.err.log`);
const launcherPidFile = join(projectRoot, `prod-server-launcher-${port}.pid`);
const childPidFile = join(projectRoot, `next-start-${port}.pid`);

if (!existsSync(nextCli)) {
  throw new Error(`Next CLI was not found at ${nextCli}.`);
}

writeFileSync(launcherPidFile, `${process.pid}\n`, "utf8");

const outFd = openSync(outLog, "a");
const errFd = openSync(errLog, "a");

function log(fd, message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  writeFileSync(fd, line);
}

let child = null;
let shuttingDown = false;

function startNext() {
  log(outFd, `Starting Next on ${hostname}:${port}`);

  child = spawn(
    process.execPath,
    [nextCli, "start", "--hostname", hostname, "--port", port],
    {
      cwd: projectRoot,
      stdio: ["pipe", outFd, errFd],
      windowsHide: true,
    },
  );

  writeFileSync(childPidFile, `${child.pid}\n`, "utf8");

  child.on("exit", (code, signal) => {
    log(errFd, `Next exited with code=${code ?? "null"} signal=${signal ?? "null"}`);
    child = null;

    if (!shuttingDown) {
      setTimeout(startNext, 5000);
    }
  });
}

function shutdown() {
  shuttingDown = true;

  if (child && !child.killed) {
    child.kill();
  }

  setTimeout(() => process.exit(0), 3000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

startNext();
