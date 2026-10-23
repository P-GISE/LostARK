import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const revision = "a".repeat(40);
const oldImage = "sha256:" + "b".repeat(64);
const newImage = "sha256:" + "c".repeat(64);
const configDigest = "sha256:" + "d".repeat(64);
const roots: string[] = [];
const posix = (path: string) => path.replaceAll("\\", "/").replace(/^([A-Za-z]):/, (_, drive: string) => "/" + drive.toLowerCase());
const mock = `#!/usr/bin/env node
const fs = require('fs');
const a = process.argv.slice(2), tool = process.env.MOCK_TOOL;
const state = JSON.parse(fs.readFileSync(process.env.MOCK_STATE, 'utf8'));
const record = () => fs.appendFileSync(process.env.MOCK_LOG, JSON.stringify({ tool, args: a, image: process.env.LOSTARK_RELEASE_IMAGE }) + '\\n');
record();
if (tool === 'docker') {
  if (a[0] === 'ps') console.log('lostark-party-web-1\\nlostark-party-worker-1\\nlostark-party-character-worker-1\\nlostark-party-postgres-1\\neventops-app-1');
  else if (a[0] === 'inspect') {
    const f = a[2], name = a[3];
    if (f.includes('working_dir')) console.log(state.appDir);
    else if (f.includes('RestartCount')) console.log(state.image + ' true 0');
    else if (f === '{{.Image}}') console.log(state.image);
    else if (f === '{{.State.Running}}') console.log('true');
    else if (f === '{{.Name}}') console.log('/' + name);
    else console.log(name + ' original-start-time');
  } else if (a[0] === 'exec') console.log(state.mode === 'schema-change' ? 'changed  prisma/schema.prisma' : 'same  prisma/schema.prisma');
  else if (a[0] === 'image') console.log(a[3].includes('revision') ? (state.mode === 'revision-mismatch' ? 'wrong' : state.revision) : (state.mode === 'image-mismatch' ? 'wrong' : state.newImage));
  else if (a[0] === 'compose') {
    state.image = process.env.LOSTARK_RELEASE_IMAGE.startsWith('lostark-party-app:') ? state.newImage : process.env.LOSTARK_RELEASE_IMAGE;
    fs.writeFileSync(process.env.MOCK_STATE, JSON.stringify(state));
    if (state.mode === 'rollback-failure' || (state.mode === 'compose-failure' && state.image === state.newImage)) process.exit(1);
  }
} else if (tool === 'curl') console.log(state.mode === 'health-failure' && state.image === state.newImage ? '503' : '200');
else if (tool === 'systemctl') console.log(state.mode === 'protected-change' && state.image === state.newImage ? '43' : '42');
else if (tool === 'flock' && state.mode === 'locked') process.exit(1);
else if (tool === 'python3') console.log(state.configDigest);
else if (tool === 'mv') {
  fs.renameSync(a[0], a[1]);
  if (state.mode === 'state-commit-failure' && state.image === state.newImage) process.exit(1);
}
`;

function run(mode: string, corruptArchive = false) {
  const root = mkdtempSync(join(tmpdir(), "lostark-deploy-test-"));
  roots.push(root);
  const bin = join(root, "bin"), app = join(root, "app"), bundle = join(root, "bundle");
  for (const dir of [bin, app, bundle]) mkdirSync(dir);
  writeFileSync(join(app, ".env"), "SYNTHETIC_FIXTURE=true\n");
  writeFileSync(join(app, "docker-compose.vps.yml"), "services: {}\n");
  writeFileSync(join(app, ".last-app-deployment"), "previous-state\n");
  if (mode === "previous-incomplete") writeFileSync(join(app, ".app-deployment-in-progress"), "in-progress previous\n");
  const script = readFileSync(resolve("scripts/deploy-aws-app.sh"), "utf8").replaceAll("\r\n", "\n");
  writeFileSync(join(bundle, "deploy-aws-app.sh"), script);
  writeFileSync(join(bundle, "prisma.sha256"), "same  prisma/schema.prisma\n");
  writeFileSync(join(bundle, "image-config-digest.txt"), configDigest + "\n");
  writeFileSync(join(bundle, "verify-app-image.py"), readFileSync("scripts/verify-app-image.py"));
  writeFileSync(join(bundle, "app-only.compose.yml"), readFileSync("deploy/app-only.compose.yml"));
  const archive = Buffer.from("synthetic image archive");
  writeFileSync(join(bundle, "image.tar.gz"), archive);
  writeFileSync(join(bundle, "image.tar.gz.sha256"), (corruptArchive ? "0".repeat(64) : createHash("sha256").update(archive).digest("hex")) + "  image.tar.gz\n");
  const statePath = join(root, "state.json"), logPath = join(root, "calls.jsonl");
  writeFileSync(statePath, JSON.stringify({ mode, image: oldImage, newImage, configDigest, revision, appDir: posix(app) }));
  writeFileSync(logPath, "");
  writeFileSync(join(bin, "mock.cjs"), mock);
  for (const tool of ["docker", "curl", "systemctl", "sleep", "flock", "python3", "mv"]) {
    const path = join(bin, tool);
    writeFileSync(path, `#!/usr/bin/env bash
MOCK_TOOL=${tool} node "${posix(join(bin, "mock.cjs"))}" "$@"
status=$?
if [[ "$MOCK_MODE" = signal-* && "$1" = compose ]] && ! test -f "$MOCK_SIGNALLED"; then
  touch "$MOCK_SIGNALLED"
  if [ "$MOCK_MODE" = signal-term ]; then kill -TERM "$PPID"; else kill -INT "$PPID"; fi
fi
exit "$status"
`);
    chmodSync(path, 0o755);
  }
  const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";
  const invoke = () => spawnSync(bash, ["-c", 'export PATH="$MOCK_BIN:$PATH"; bash "$BUNDLE/deploy-aws-app.sh" "$REVISION"'], {
    encoding: "utf8",
    timeout: 60000,
    env: { ...process.env, APP_DIR: posix(app), MOCK_BIN: posix(bin), MOCK_STATE: statePath, MOCK_LOG: logPath, MOCK_MODE: mode, MOCK_SIGNALLED: posix(join(root, "signalled")), BUNDLE: posix(bundle), REVISION: revision },
  });
  const result = invoke();
  const calls = readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean).map(line => JSON.parse(line) as { tool: string; args: string[]; image?: string });
  return { result, calls, state: JSON.parse(readFileSync(statePath, "utf8")), app, invoke };
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    if (!resolve(root).startsWith(resolve(tmpdir()) + sep) || !basename(root).startsWith("lostark-deploy-test-")) {
      throw new Error("Refusing to remove a directory outside this test's temporary roots");
    }
    rmSync(root, { recursive: true, force: true });
  }
});

describe("AWS app deployment executable scenarios", () => {
  it("replaces only the three app services and records the immutable image", () => {
    const { result, calls, state, app } = run("success");
    expect(result.stderr).toBe("");
    expect(result.status, JSON.stringify({ calls, stdout: result.stdout, app })).toBe(0);
    expect(state.image).toBe(newImage);
    const changes = calls.filter(c => c.tool === "docker" && c.args[0] === "compose");
    expect(changes).toHaveLength(1);
    expect(changes[0].args.slice(-3)).toEqual(["web", "worker", "character-worker"]);
    for (const flag of ["--no-deps", "--no-build", "never"]) expect(changes[0].args).toContain(flag);
    expect(readFileSync(join(app, ".last-app-deployment"), "utf8")).toBe(`${revision} ${newImage} ${oldImage}\n`);
    expect(calls.filter(c => c.tool === "systemctl").every(c => c.args[0] === "show")).toBe(true);
  });

  it.each(["schema-change", "locked", "previous-incomplete"])("blocks %s before image load or container changes", mode => {
    const { result, calls, state } = run(mode);
    expect(result.status).not.toBe(0);
    expect(state.image).toBe(oldImage);
    expect(calls.some(c => c.tool === "docker" && ["load", "compose"].includes(c.args[0]))).toBe(false);
  });

  it("rejects corrupted transfer bytes before loading the image", () => {
    const { result, calls } = run("success", true);
    expect(result.status).not.toBe(0);
    expect(calls.some(c => c.tool === "docker" && ["load", "compose"].includes(c.args[0]))).toBe(false);
  });

  it.each(["image-mismatch", "revision-mismatch"])("rejects %s before replacing apps", mode => {
    const { result, calls, state } = run(mode);
    expect(result.status).not.toBe(0);
    expect(state.image).toBe(oldImage);
    expect(calls.some(c => c.tool === "docker" && c.args[0] === "compose")).toBe(false);
  });

  it.each(["compose-failure", "health-failure", "protected-change", "signal-term", "signal-int", "state-commit-failure"])("rolls back app images on %s and reports failure", mode => {
    const { result, calls, state, app, invoke } = run(mode);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("ROLLBACK_OK");
    expect(state.image).toBe(oldImage);
    expect(calls.filter(c => c.tool === "docker" && c.args[0] === "compose").map(c => c.image)).toEqual([`lostark-party-app:${revision}`, oldImage]);
    expect(readFileSync(join(app, ".last-app-deployment"), "utf8")).toBe("previous-state\n");
    expect(readFileSync(join(app, ".app-deployment-in-progress"), "utf8")).toContain("rolled-back");
    const retry = invoke();
    expect(retry.status).not.toBe(0);
    expect(retry.stderr).toContain("PREVIOUS_DEPLOYMENT_REQUIRES_REVIEW");
  });

  it("leaves a blocking marker if rollback itself fails", () => {
    const { result, app, invoke } = run("rollback-failure");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("ROLLBACK_FAILED");
    expect(readFileSync(join(app, ".app-deployment-in-progress"), "utf8")).toContain("rollback-failed");
    expect(invoke().stderr).toContain("PREVIOUS_DEPLOYMENT_REQUIRES_REVIEW");
  });
});
