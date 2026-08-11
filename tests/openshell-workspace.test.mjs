import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, cp, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const launcher = join(root, "bin", "openshell-workspace");

test("recover-download prunes ignored artifacts and synchronizes a retained Git workspace", async () => {
  const temp = await mkdtemp(join(tmpdir(), "openshell-workspace-"));
  const host = join(temp, "project");
  const sandbox = join(temp, "sandbox-project");
  const fakeBin = join(temp, "bin");
  const log = join(temp, "openshell.log");
  const policy = join(temp, "policy.yaml");
  await mkdir(host); await mkdir(fakeBin);
  await writeFile(policy, "version: 1\n");
  await writeFile(join(host, ".gitignore"), "target/\n");
  await writeFile(join(host, "source.txt"), "host\n");
  await mkdir(join(host, "target"));
  await writeFile(join(host, "target", "host-cache"), "keep\n");
  await execFileAsync("git", ["init", "-q"], { cwd: host });
  await execFileAsync("git", ["add", ".gitignore", "source.txt"], { cwd: host });
  await cp(host, sandbox, { recursive: true, force: true });
  await writeFile(join(sandbox, "source.txt"), "sandbox\n");
  await writeFile(join(sandbox, "target", "large-build-output"), "generated\n");

  const fakeOpenShell = join(fakeBin, "openshell");
  await writeFile(fakeOpenShell, `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >>"$FAKE_LOG"
case "$1 $2" in
  "sandbox get") exit 0 ;;
  "sandbox exec") [[ " $* " != *" git clean -fdX "* ]] || git -C "$FAKE_SANDBOX" clean -fdX >/dev/null ;;
  "sandbox download") mkdir -p "$5"; cp -a "$FAKE_SANDBOX/." "$5/" ;;
  "sandbox delete") exit 0 ;;
  *) exit 1 ;;
esac
`);
  await chmod(fakeOpenShell, 0o755);
  const { stderr } = await execFileAsync(launcher, [
    "--image", "localhost/test/client:1", "--policy", policy,
    "--command", "true", "--recover-download", "test-project-123",
  ], { cwd: host, env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}`, FAKE_LOG: log, FAKE_SANDBOX: sandbox } });

  assert.match(stderr, /recovering retained sandbox test-project-123/);
  assert.equal(await readFile(join(host, "source.txt"), "utf8"), "sandbox\n");
  assert.equal(await readFile(join(host, "target", "host-cache"), "utf8"), "keep\n");
  const calls = await readFile(log, "utf8");
  assert.ok(calls.indexOf("git clean -fdX") < calls.indexOf("sandbox download test-project-123 /workspace/project"));
  assert.match(calls, /sandbox delete test-project-123/);
});

test("requires a full versioned image reference", async () => {
  const temp = await mkdtemp(join(tmpdir(), "openshell-image-ref-"));
  const policy = join(temp, "policy.yaml");
  await writeFile(policy, "version: 1\n");
  await assert.rejects(execFileAsync(launcher, ["--image", "pi-customized", "--policy", policy, "--command", "true"], { cwd: temp }), /full, versioned image reference/);
});
