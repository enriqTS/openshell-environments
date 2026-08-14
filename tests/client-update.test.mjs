import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, lstat, mkdtemp, mkdir, readFile, readlink, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const updater = join(root, "bin", "update-openshell-client");

async function fixture(client, { buildFails = false, installerFails = false } = {}) {
  const temp = await mkdtemp(join(tmpdir(), `${client}-update-`));
  const bin = join(temp, "bin");
  const tools = join(temp, "tools");
  const launcher = join(temp, `${client}-openshell`);
  const target = join(bin, client);
  const imageLog = join(temp, "image.log");
  await mkdir(bin);
  await mkdir(tools);
  await writeFile(launcher, "#!/bin/sh\nexit 99\n");
  await chmod(launcher, 0o755);
  await symlink(launcher, target);

  await writeFile(join(tools, "image-tool"), `#!/bin/sh\nif [ "$1" = refs ]; then printf '${client}=localhost/openshell-environments/${client}:0.3.0\\n'; exit 0; fi\nprintf '%s\\n' "$*" >"$IMAGE_LOG"\nexit ${buildFails ? 1 : 0}\n`);
  await chmod(join(tools, "image-tool"), 0o755);

  const installer = `#!/bin/sh\n${installerFails ? "exit 23" : `cat >"$OPENSHELL_UPDATE_TARGET" <<'CLI'\n#!/bin/sh\necho '${client} 9.8.7'\nCLI\nchmod 755 "$OPENSHELL_UPDATE_TARGET"`}\n`;
  await writeFile(join(tools, "curl"), `#!/bin/sh\ncat <<'INSTALL'\n${installer}INSTALL\n`);
  await chmod(join(tools, "curl"), 0o755);
  await writeFile(join(tools, "npm"), `#!/bin/sh\nif [ "$1" = prefix ]; then printf '%s\\n' ${JSON.stringify(temp)}; exit 0; fi\n${installer}`);
  await chmod(join(tools, "npm"), 0o755);

  return {
    temp,
    launcher,
    target,
    imageLog,
    env: {
      ...process.env,
      PATH: `${tools}:${process.env.PATH}`,
      CURL: join(tools, "curl"),
      NPM: join(tools, "npm"),
      OPENSHELL_CLIENT_BIN_DIR: bin,
      OPENSHELL_IMAGE_TOOL: join(tools, "image-tool"),
      XDG_CONFIG_HOME: join(temp, "config"),
      IMAGE_LOG: imageLog,
    },
  };
}

for (const client of ["pi", "claude", "codex"]) {
  test(`${client} vendor update restores its launcher and pins the image version`, async () => {
    const f = await fixture(client);
    await execFileAsync(updater, [client, "--launcher", f.launcher], { env: f.env });
    assert.equal((await lstat(f.target)).isSymbolicLink(), true);
    assert.equal(await readlink(f.target), f.launcher);
    const build = await readFile(f.imageLog, "utf8");
    assert.match(build, new RegExp(`build ${client} .*--cli-version 9\\.8\\.7`));
    if (client === "pi") assert.match(build, /--pi-assets-version 0\.1\.0/);
    assert.equal(await readFile(join(f.temp, "config", "openshell-clients", `${client}.image`), "utf8"), `localhost/openshell-environments/${client}:0.3.0\n`);
  });
}

test("launcher is restored when the image build fails", async () => {
  const f = await fixture("claude", { buildFails: true });
  await assert.rejects(execFileAsync(updater, ["claude", "--launcher", f.launcher], { env: f.env }));
  assert.equal((await lstat(f.target)).isSymbolicLink(), true);
  assert.equal(await readlink(f.target), f.launcher);
});

test("launcher is restored when the vendor installer fails", async () => {
  const f = await fixture("pi", { installerFails: true });
  await assert.rejects(execFileAsync(updater, ["pi", "--launcher", f.launcher], { env: f.env }));
  assert.equal((await lstat(f.target)).isSymbolicLink(), true);
  assert.equal(await readlink(f.target), f.launcher);
});

test("updater refuses a command that is not the expected OpenShell launcher", async () => {
  const f = await fixture("codex");
  const other = join(f.temp, "other-launcher");
  await writeFile(other, "#!/bin/sh\nexit 0\n");
  await chmod(other, 0o755);
  await assert.rejects(execFileAsync(updater, ["codex", "--launcher", other], { env: f.env }), /refusing to replace launcher/);
  assert.equal(await readlink(f.target), f.launcher);
});
