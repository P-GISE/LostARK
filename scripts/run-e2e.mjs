import { spawn, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const serverUrl = "http://127.0.0.1:3000";
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
const playwrightBin = join(root, "node_modules", "playwright", "cli.js");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerReady() {
  try {
    const response = await fetch(serverUrl, {
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(processHandle) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 120_000) {
    if (processHandle.exitCode !== null) {
      throw new Error(`Next dev server exited with code ${processHandle.exitCode}`);
    }
    if (await isServerReady()) {
      return;
    }
    await delay(1_000);
  }

  throw new Error(`Next dev server did not become ready at ${serverUrl}`);
}

function stopServer(processHandle) {
  if (!processHandle || processHandle.exitCode !== null || !processHandle.pid) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(processHandle.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  processHandle.kill("SIGTERM");
}

function runPlaywright() {
  const child = spawn(process.execPath, [playwrightBin, "test"], {
    cwd: root,
    env: {
      ...process.env,
      PLAYWRIGHT_EXTERNAL_SERVER: "1",
    },
    stdio: "inherit",
  });

  return new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
  });
}

let server = null;

try {
  if (!(await isServerReady())) {
    server = spawn(
      process.execPath,
      [nextBin, "dev", "--hostname", "127.0.0.1"],
      {
        cwd: root,
        env: process.env,
        stdio: "inherit",
      },
    );
    await waitForServer(server);
  }

  const code = await runPlaywright();
  stopServer(server);
  process.exit(code);
} catch (error) {
  stopServer(server);
  console.error(error);
  process.exit(1);
}
