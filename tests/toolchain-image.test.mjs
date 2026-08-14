import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const base = await readFile(new URL("../base/Dockerfile", import.meta.url), "utf8");
const pi = await readFile(new URL("../clients/pi/Dockerfile", import.meta.url), "utf8");
const claude = await readFile(new URL("../clients/claude/Dockerfile", import.meta.url), "utf8");
const codex = await readFile(new URL("../clients/codex/Dockerfile", import.meta.url), "utf8");
const codexEntrypoint = await readFile(new URL("../clients/codex/codex-openshell-entrypoint", import.meta.url), "utf8");
const claudeProvider = await readFile(new URL("../clients/claude/provider.yaml", import.meta.url), "utf8");
const codexProvider = await readFile(new URL("../clients/codex/provider.yaml", import.meta.url), "utf8");
const imageTool = await readFile(new URL("../bin/openshell-image", import.meta.url), "utf8");
const updater = await readFile(new URL("../bin/update-openshell-client", import.meta.url), "utf8");
const claudeLauncher = await readFile(new URL("../bin/claude-openshell", import.meta.url), "utf8");
const codexLauncher = await readFile(new URL("../bin/codex-openshell", import.meta.url), "utf8");

test("base provides the established development toolchain", () => {
  for (const pattern of [/openssh-client/, /python3-venv/, /FROM rust:latest AS rust/, /rustup component add rustfmt clippy/, /COPY --from=terraform/, /COPY --from=uv/, /COPY --from=ruff/]) {
    assert.match(base, pattern);
  }
});

test("Rust remains usable when OpenShell supplies its restricted execution PATH", () => {
  assert.match(base, /for tool in cargo rustc rustdoc rustfmt clippy-driver cargo-clippy cargo-fmt rustup/);
  assert.match(base, /export RUSTUP_HOME=\/usr\/local\/rustup/);
  assert.match(base, /export CARGO_HOME=\/tmp\/cargo/);
  assert.match(base, /"\/usr\/local\/bin\/\$tool"/);
});

test("Claude and Codex are isolated client layers with their own CLI and user", () => {
  assert.match(claude, /ARG CLAUDE_CLI_VERSION=latest/);
  assert.match(claude, /npm install -g "@anthropic-ai\/claude-code@\$CLAUDE_CLI_VERSION"/);
  assert.doesNotMatch(claude, /npm install -g --ignore-scripts/);
  assert.match(claude, /claude --version/);
  assert.match(claude, /useradd --create-home --shell \/bin\/bash claude/);
  assert.match(claude, /USER claude/);
  assert.match(claude, /io\.openshell\.client="claude"/);
  assert.doesNotMatch(claude, /@openai\/codex|USER codex/);

  assert.match(codex, /ARG CODEX_CLI_VERSION=latest/);
  assert.match(codex, /npm install -g --ignore-scripts "@openai\/codex@\$CODEX_CLI_VERSION"/);
  assert.match(codex, /useradd --create-home --shell \/bin\/bash codex/);
  assert.match(codex, /USER codex/);
  assert.match(codex, /io\.openshell\.client="codex"/);
  assert.doesNotMatch(codex, /@anthropic-ai\/claude-code|USER claude/);
});

test("client providers expose only gateway-routed authentication handles", () => {
  assert.match(claudeProvider, /env_vars: \[CLAUDE_CODE_OAUTH_TOKEN\]/);
  assert.match(claudeProvider, /auth_style: bearer/);
  assert.doesNotMatch(claudeProvider, /sk-ant-|access_token:/);
  assert.match(codexProvider, /env_vars: \[CODEX_AUTH_ACCESS_TOKEN\]/);
  assert.match(codexProvider, /strategy: oauth2_refresh_token/);
  assert.match(codexProvider, /secret: true/);
  assert.doesNotMatch(codexProvider, /eyJ|refresh_token: [^\n]*[A-Za-z0-9_-]{20}/);
});

test("Codex materializes native auth from opaque provider handles", () => {
  assert.match(codex, /COPY --chmod=0755 codex-openshell-entrypoint/);
  assert.match(codex, /io\.openshell\.client-auth="provider-v2"/);
  assert.match(codexEntrypoint, /CODEX_AUTH_ACCESS_TOKEN/);
  assert.match(codexEntrypoint, /CODEX_AUTH_ACCOUNT_ID/);
  assert.match(codexEntrypoint, /auth_mode: "chatgpt"/);
  assert.match(codexEntrypoint, /mode: 0o600/);
  assert.match(codexEntrypoint, /exec codex "\$@"/);
});

test("image lifecycle supports Claude and Codex explicitly", () => {
  assert.match(imageTool, /CLAUDE_IMAGE=.*claude:\$VERSION/);
  assert.match(imageTool, /CODEX_IMAGE=.*codex:\$VERSION/);
  assert.match(imageTool, /build_client claude "\$CLAUDE_IMAGE" "\$cli_version"/);
  assert.match(imageTool, /build_client codex "\$CODEX_IMAGE" "\$cli_version"/);
  assert.match(imageTool, /-t "\$image" "\$ROOT\/clients\/\$client"/);
  assert.match(imageTool, /codex-openshell-entrypoint --version/);
  assert.match(imageTool, /"\$image" "\$client" --version/);
});

test("Pi is a separate client layer with compatibility labels", () => {
  assert.match(pi, /^ARG BASE_IMAGE=/m);
  assert.match(pi, /pi-openshell-toolchain-entrypoint/);
  assert.match(pi, /export PATH=\/usr\/local\/cargo\/bin:\/tmp\/cargo\/bin:\$PATH/);
  assert.match(pi, /ENTRYPOINT \["\/usr\/local\/bin\/pi-openshell-toolchain-entrypoint"\]/);
  assert.match(pi, /ARG PI_CLI_VERSION=latest/);
  assert.match(pi, /@earendil-works\/pi-coding-agent@\$PI_CLI_VERSION/);
  assert.match(pi, /io\.openshell\.compatibility="pi-assets-api-1"/);
  assert.match(pi, /io\.openshell\.cli\.version="\$PI_CLI_VERSION"/);
});

test("Pi restores npm/uv/corepack cache locations and ships no root-owned build-time cache", () => {
  assert.match(pi, /export npm_config_cache=\/tmp\/npm-cache/);
  assert.match(pi, /export COREPACK_HOME=\/tmp\/corepack/);
  assert.match(pi, /export UV_CACHE_DIR=\/tmp\/uv-cache/);
  assert.match(pi, /rm -rf \/tmp\/npm-cache \/tmp\/uv-cache \/tmp\/corepack \/root\/\.npm \/root\/\.cache/);
});

test("Pi installs only the sanitized asset archive into standard resource paths", () => {
  assert.match(pi, /COPY pi-assets-\*\.tar\.gz \/tmp\/pi-assets\.tar\.gz/);
  assert.doesNotMatch(pi, /COPY pi-customizations \/opt\/pi-customizations/);
  assert.match(pi, /tar -xzf \/tmp\/pi-assets\.tar\.gz -C \/tmp\/pi-assets/);
  assert.match(pi, /cp \/tmp\/pi-assets\/manifest\.json \/opt\/pi-assets\/manifest\.json/);
  assert.match(pi, /cp \/tmp\/pi-assets\/APPEND_SYSTEM\.md \/home\/pi\/\.pi\/agent\/APPEND_SYSTEM\.md/);
  for (const resource of ["agents", "extensions", "skills", "themes"]) {
    assert.match(pi, new RegExp(`cp -a /tmp/pi-assets/${resource} /home/pi/\\.pi/agent/${resource}`));
  }
  assert.match(pi, /install -m 0755 \/build\/pi-openshell-entrypoint \/usr\/local\/bin\/pi-openshell-entrypoint/);
  assert.match(pi, /node \/build\/patch-pi-codex/);
  assert.doesNotMatch(pi, /settings\.json/);
  assert.match(pi, /io\.openshell\.pi-assets\.version="\$PI_ASSETS_VERSION"/);
  assert.match(pi, /io\.openshell\.pi-assets\.api="1"/);
});

test("host updates use official installers and restore OpenShell launchers", () => {
  assert.match(updater, /https:\/\/pi\.dev\/install\.sh/);
  assert.match(updater, /https:\/\/claude\.ai\/install\.sh/);
  assert.match(updater, /i -g "\$\{CODEX_NPM_PACKAGE:-@openai\/codex\}"/);
  assert.match(updater, /trap restore_launcher EXIT HUP INT TERM/);
  assert.match(updater, /mv -Tf -- "\$replacement" "\$target"/);
  assert.match(updater, /config_dir="\$\{XDG_CONFIG_HOME:-\$HOME\/\.config\}\/openshell-clients"/);
  assert.match(updater, /"\$config_dir\/\$client\.image"/);
  for (const launcher of [claudeLauncher, codexLauncher]) {
    assert.match(launcher, /exec "\$ROOT\/bin\/update-openshell-client"/);
    assert.match(launcher, /openshell-clients\/[a-z]+\.image/);
  }
});

test("image lifecycle is explicit rather than part of launch", () => {
  assert.match(imageTool, /docker buildx build/);
  assert.match(imageTool, /docker image inspect/);
  assert.match(imageTool, /docker image rm/);
  assert.match(imageTool, /verify_pi_toolchain/);
  assert.match(imageTool, /--build-arg "\$cli_version_arg=\$cli_version"/);
  assert.match(imageTool, /--build-arg "PI_CLI_VERSION=\$cli_version"/);
  assert.match(imageTool, /-e PATH=\/usr\/local\/bin:\/usr\/bin:\/bin/);
  assert.match(imageTool, /test "\$RUSTUP_HOME" = \/usr\/local\/rustup/);
  assert.match(imageTool, /test "\$CARGO_HOME" = \/tmp\/cargo/);
  assert.match(imageTool, /npm install --no-audit --no-fund lodash/);
  assert.match(imageTool, /cargo clippy --version/);
});

test("Pi build consumes only a published generic pi-assets release", () => {
  assert.match(imageTool, /releases\/download\/pi-assets-v/);
  assert.match(imageTool, /sha256sum -c --ignore-missing SHA256SUMS/);
  assert.doesNotMatch(imageTool, /git clone|fetch_pi_ref|export-pi-release/);
  assert.doesNotMatch(imageTool, /--pi-source|--pi-ref/);
});

test("Pi image helpers are local OpenShell implementation", () => {
  assert.match(pi, /COPY pi-openshell-entrypoint patch-pi-codex \/build\//);
  assert.match(pi, /install -m 0755 \/build\/pi-openshell-entrypoint/);
});
