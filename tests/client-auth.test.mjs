import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const setup = join(root, "bin", "setup-openshell-client-auth");

async function fakeEnvironment() {
  const temp = await mkdtemp(join(tmpdir(), "openshell-client-auth-"));
  const fakeBin = join(temp, "bin");
  const config = join(temp, "config");
  const log = join(temp, "openshell.log");
  await mkdir(fakeBin);
  const openshell = join(fakeBin, "openshell");
  await writeFile(openshell, `#!/usr/bin/env bash\nset -euo pipefail\nprintf '%s\\n' "$*" >>"$FAKE_LOG"\n[[ "$1 $2 $3" == "provider profile export" ]] && exit 1\n[[ "$1 $2" == "provider get" ]] && exit 1\nexit 0\n`);
  await chmod(openshell, 0o755);
  return {
    temp,
    config,
    log,
    env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH}`, XDG_CONFIG_HOME: config, FAKE_LOG: log },
  };
}

test("Claude auth setup stores its OAuth token only in the gateway provider", async () => {
  const fixture = await fakeEnvironment();
  const token = "claude-secret-setup-token";
  await execFileAsync(setup, ["claude", "--yes"], { env: { ...fixture.env, CLAUDE_CODE_OAUTH_TOKEN: token } });

  assert.equal(await readFile(join(fixture.config, "openshell-clients", "claude.provider"), "utf8"), "claude-openshell\n");
  const calls = await readFile(fixture.log, "utf8");
  assert.match(calls, /settings set --global --key providers_v2_enabled --value true --yes/);
  assert.match(calls, /provider profile import .*clients\/claude\/provider.yaml/);
  assert.match(calls, /provider create --name claude-openshell --type claude-openshell-oauth --credential CLAUDE_CODE_OAUTH_TOKEN/);
  assert.doesNotMatch(calls, new RegExp(token));
  assert.doesNotMatch(await readFile(join(fixture.config, "openshell-clients", "claude.provider"), "utf8"), /secret/);
});

test("Codex auth setup imports host tokens into a refresh-capable gateway provider", async () => {
  const fixture = await fakeEnvironment();
  const codexHome = join(fixture.temp, "codex-home");
  await mkdir(codexHome);
  await writeFile(join(codexHome, "auth.json"), JSON.stringify({
    auth_mode: "chatgpt",
    tokens: {
      access_token: "codex-access-secret",
      refresh_token: "codex-refresh-secret",
      account_id: "account-123",
    },
  }));
  await execFileAsync(setup, ["codex"], { env: { ...fixture.env, CODEX_HOME: codexHome } });

  assert.equal(await readFile(join(fixture.config, "openshell-clients", "codex.provider"), "utf8"), "codex-openshell\n");
  const calls = await readFile(fixture.log, "utf8");
  assert.match(calls, /provider create --name codex-openshell --type codex-openshell-oauth/);
  assert.match(calls, /provider refresh configure codex-openshell/);
  assert.match(calls, /--secret-material-env refresh_token=CODEX_REFRESH_TOKEN/);
  assert.doesNotMatch(calls, /codex-refresh-secret/);
  assert.match(calls, /provider refresh rotate codex-openshell --credential-key CODEX_AUTH_ACCESS_TOKEN/);
  assert.doesNotMatch(await readFile(join(fixture.config, "openshell-clients", "codex.provider"), "utf8"), /access|refresh|account/);
});

test("Codex entrypoint materializes only provider handles in native auth.json", async () => {
  const temp = await mkdtemp(join(tmpdir(), "codex-provider-entrypoint-"));
  const home = join(temp, "home");
  const fakeBin = join(temp, "bin");
  const log = join(temp, "codex.log");
  await mkdir(home);
  await mkdir(fakeBin);
  await writeFile(join(fakeBin, "codex"), `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >"$CODEX_LOG"\n`);
  await chmod(join(fakeBin, "codex"), 0o755);
  const handles = {
    CODEX_AUTH_ACCESS_TOKEN: "openshell:resolve:env:CODEX_AUTH_ACCESS_TOKEN",
    CODEX_AUTH_ACCOUNT_ID: "openshell:resolve:env:CODEX_AUTH_ACCOUNT_ID",
  };
  await execFileAsync(join(root, "clients", "codex", "codex-openshell-entrypoint"), ["--version"], {
    env: { ...process.env, CODEX_AUTH_REFRESH_TOKEN: "", CODEX_AUTH_ID_TOKEN: "", ...handles, HOME: home, PATH: `${fakeBin}:${process.env.PATH}`, CODEX_LOG: log },
  });
  const authPath = join(home, ".codex", "auth.json");
  const auth = JSON.parse(await readFile(authPath, "utf8"));
  assert.equal(auth.tokens.access_token, handles.CODEX_AUTH_ACCESS_TOKEN);
  assert.equal(auth.tokens.account_id, handles.CODEX_AUTH_ACCOUNT_ID);
  assert.equal(auth.tokens.refresh_token, "gateway-managed-refresh-token");
  assert.match(auth.tokens.id_token, /^[^.]+\.[^.]+\.placeholder$/);
  assert.equal((await stat(authPath)).mode & 0o777, 0o600);
  assert.equal(await readFile(log, "utf8"), "--version\n");
});
