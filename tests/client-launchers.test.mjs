import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, lstat, mkdtemp, mkdir, readFile, readlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = dirname(dirname(fileURLToPath(import.meta.url)));

async function runLauncher(client, home, imageVariable) {
  const temp = await mkdtemp(join(tmpdir(), `${client}-openshell-`));
  const fakeBin = join(temp, "bin");
  const workdir = join(temp, "openshell-environments");
  const log = join(temp, "openshell.log");
  await mkdir(fakeBin);
  await mkdir(workdir);
  await writeFile(join(fakeBin, "docker"), `#!/usr/bin/env bash\nexit 0\n`);
  await writeFile(join(fakeBin, "openshell"), `#!/usr/bin/env bash\nset -euo pipefail\nprintf '%s\\n' "$*" >>"$FAKE_LOG"\nexit 0\n`);
  await chmod(join(fakeBin, "docker"), 0o755);
  await chmod(join(fakeBin, "openshell"), 0o755);

  const image = `registry.example/team/${client}:test`;
  await execFileAsync(join(root, "bin", `${client}-openshell`), ["--version", "extra argument"], {
    cwd: workdir,
    env: {
      ...process.env,
      PATH: `${fakeBin}:${process.env.PATH}`,
      FAKE_LOG: log,
      [imageVariable]: image,
    },
  });

  const calls = await readFile(log, "utf8");
  const sandboxName = calls.match(/sandbox create --name (\S+)/)?.[1];
  assert.ok(sandboxName);
  assert.ok(sandboxName.length <= 19, `sandbox name exceeds OpenShell's limit: ${sandboxName}`);
  assert.match(sandboxName, new RegExp(`^${client.slice(0, 5)}-[a-z0-9-]+-\\d+$`));
  assert.match(calls, new RegExp(`sandbox create .* --from ${image.replaceAll("/", "\\/")}`));
  const sandboxCommand = client === "codex" ? "codex-openshell-entrypoint" : client;
  assert.match(calls, new RegExp(`sandbox exec .* --env HOME=${home} .* -- ${sandboxCommand} --version extra argument`));
  assert.match(calls, /sandbox download/);
  assert.match(calls, /sandbox delete/);
}

test("Claude terminal launcher uses the Claude sandbox and forwards arguments", async () => {
  await runLauncher("claude", "/home/claude", "CLAUDE_OPENSHELL_IMAGE");
});

test("Codex terminal launcher uses the Codex sandbox and forwards arguments", async () => {
  await runLauncher("codex", "/home/codex", "CODEX_OPENSHELL_IMAGE");
});

test("Claude and Codex launchers expose retained-sandbox recovery", async () => {
  for (const client of ["claude", "codex"]) {
    const temp = await mkdtemp(join(tmpdir(), `${client}-recovery-`));
    const fakeBin = join(temp, "bin");
    const workdir = join(temp, "project");
    const log = join(temp, "openshell.log");
    await mkdir(fakeBin);
    await mkdir(workdir);
    await writeFile(join(fakeBin, "openshell"), `#!/usr/bin/env bash\nset -euo pipefail\nprintf '%s\\n' "$*" >>"$FAKE_LOG"\nexit 0\n`);
    await chmod(join(fakeBin, "openshell"), 0o755);

    await execFileAsync(join(root, "bin", `${client}-openshell`), ["--openshell-recover", "retained-box"], {
      cwd: workdir,
      env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}`, FAKE_LOG: log },
    });

    const calls = await readFile(log, "utf8");
    assert.match(calls, /sandbox get retained-box/);
    assert.doesNotMatch(calls, /sandbox create/);
    assert.match(calls, /sandbox exec .* -- \/bin\/bash/);
    assert.match(calls, /sandbox download retained-box/);
  }
});

test("launchers attach configured gateway providers", async () => {
  for (const client of ["claude", "codex"]) {
    const temp = await mkdtemp(join(tmpdir(), `${client}-provider-`));
    const fakeBin = join(temp, "bin");
    const workdir = join(temp, "project");
    const config = join(temp, "config", "openshell-clients");
    const log = join(temp, "openshell.log");
    await mkdir(fakeBin);
    await mkdir(workdir);
    await mkdir(config, { recursive: true });
    await writeFile(join(config, `${client}.provider`), `${client}-gateway\n`);
    await writeFile(join(fakeBin, "openshell"), `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >>"$FAKE_LOG"\nexit 0\n`);
    await writeFile(join(fakeBin, "docker"), `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >>"$FAKE_LOG"\n[[ " $* " == *" --format "* ]] && printf 'provider-v1\\n'\nexit 0\n`);
    await chmod(join(fakeBin, "openshell"), 0o755);
    await chmod(join(fakeBin, "docker"), 0o755);
    await execFileAsync(join(root, "bin", `${client}-openshell`), ["--version"], {
      cwd: workdir,
      env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}`, XDG_CONFIG_HOME: join(temp, "config"), FAKE_LOG: log },
    });
    assert.match(await readFile(log, "utf8"), new RegExp(`sandbox create .* --provider ${client}-gateway`));
  }
});

test("launcher installer exposes and safely removes claude and codex commands", async () => {
  const temp = await mkdtemp(join(tmpdir(), "openshell-client-bin-"));
  const installer = join(root, "bin", "install-openshell-client-launchers");
  const env = { ...process.env, OPENSHELL_CLIENT_BIN_DIR: temp };

  await execFileAsync(installer, ["install"], { env });
  for (const client of ["claude", "codex"]) {
    assert.equal((await lstat(join(temp, client))).isSymbolicLink(), true);
    assert.equal(await readlink(join(temp, client)), join(root, "bin", `${client}-openshell`));
  }

  await execFileAsync(installer, ["uninstall"], { env });
  for (const client of ["claude", "codex"]) {
    await assert.rejects(lstat(join(temp, client)), { code: "ENOENT" });
  }
});

test("launcher installer does not replace an existing command", async () => {
  const temp = await mkdtemp(join(tmpdir(), "openshell-client-collision-"));
  const installer = join(root, "bin", "install-openshell-client-launchers");
  await writeFile(join(temp, "codex"), "existing\n");
  await assert.rejects(
    execFileAsync(installer, ["install"], { env: { ...process.env, OPENSHELL_CLIENT_BIN_DIR: temp } }),
    /refusing to replace existing path/,
  );
  await assert.rejects(lstat(join(temp, "claude")), { code: "ENOENT" });
});
