import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const base = await readFile(new URL("../base/Dockerfile", import.meta.url), "utf8");
const pi = await readFile(new URL("../clients/pi/Dockerfile", import.meta.url), "utf8");
const imageTool = await readFile(new URL("../bin/openshell-image", import.meta.url), "utf8");

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

test("Pi is a separate client layer with compatibility labels", () => {
  assert.match(pi, /^ARG BASE_IMAGE=/m);
  assert.match(pi, /pi-openshell-toolchain-entrypoint/);
  assert.match(pi, /export PATH=\/usr\/local\/cargo\/bin:\/tmp\/cargo\/bin:\$PATH/);
  assert.match(pi, /ENTRYPOINT \["\/usr\/local\/bin\/pi-openshell-toolchain-entrypoint"\]/);
  assert.match(pi, /io\.openshell\.compatibility="pi-customizations-api-1"/);
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
  assert.match(pi, /cp \/tmp\/pi-assets\/manifest\.json \/opt\/pi-customizations\/manifest\.json/);
  assert.match(pi, /cp \/tmp\/pi-assets\/APPEND_SYSTEM\.md \/home\/pi\/\.pi\/agent\/APPEND_SYSTEM\.md/);
  for (const resource of ["agents", "extensions", "skills", "themes"]) {
    assert.match(pi, new RegExp(`cp -a /tmp/pi-assets/${resource} /home/pi/\\.pi/agent/${resource}`));
  }
  assert.match(pi, /install -m 0755 \/tmp\/pi-assets\/image\/pi-openshell-entrypoint \/usr\/local\/bin\/pi-openshell-entrypoint/);
  assert.match(pi, /node \/tmp\/pi-assets\/image\/patch-pi-codex/);
  assert.doesNotMatch(pi, /settings\.json/);
  assert.match(pi, /io\.openshell\.pi-assets\.version="\$PI_ASSETS_VERSION"/);
  assert.match(pi, /io\.openshell\.pi-assets\.api="1"/);
});

test("image lifecycle is explicit rather than part of launch", () => {
  assert.match(imageTool, /docker buildx build/);
  assert.match(imageTool, /docker image inspect/);
  assert.match(imageTool, /docker image rm/);
  assert.match(imageTool, /verify_pi_toolchain/);
  assert.match(imageTool, /-e PATH=\/usr\/local\/bin:\/usr\/bin:\/bin/);
  assert.match(imageTool, /test "\$RUSTUP_HOME" = \/usr\/local\/rustup/);
  assert.match(imageTool, /test "\$CARGO_HOME" = \/tmp\/cargo/);
  assert.match(imageTool, /npm install --no-audit --no-fund lodash/);
  assert.match(imageTool, /cargo clippy --version/);
});

test("Pi build consumes the exporter and can source pi-customizations from a local checkout or GitHub", () => {
  assert.match(imageTool, /export-pi-release\.mjs" assets --version "\$VERSION" --output "\$context"/);
  assert.doesNotMatch(imageTool, /git archive --format=tar HEAD/);
  assert.match(imageTool, /--pi-source\) pi_source="\$\{2:-\}"; shift 2/);
  assert.match(imageTool, /--pi-ref\) pi_ref="\$\{2:-\}"; shift 2/);
  assert.match(imageTool, /git -C "\$dest" fetch --depth 1 origin "\$ref"/);
  assert.match(imageTool, /specify only one of --pi-source, --pi-ref, or --pi-assets-version/);
  assert.match(imageTool, /https:\/\/github\.com\/enriqTS\/pi-customizations\.git/);
});

test("Pi build can consume a published pi-assets release without cloning pi-customizations at all", () => {
  assert.match(imageTool, /--pi-assets-version\) pi_assets_version="\$\{2:-\}"; shift 2/);
  assert.match(imageTool, /fetch_pi_assets_release\(\) \{/);
  assert.match(imageTool, /https:\/\/github\.com\/enriqTS\/pi-customizations\/releases\/download\/pi-assets-v\$\{version\}/);
  assert.match(imageTool, /sha256sum -c --ignore-missing SHA256SUMS/);
  assert.match(imageTool, /JSON\.parse\(require\("fs"\)\.readFileSync\(0,"utf8"\)\)\.source\.revision/);
  // Never running pi-customizations' own scripts against a downloaded release.
  const releaseBranch = imageTool.slice(imageTool.indexOf("if [[ -n \"$pi_assets_version\" ]]"), imageTool.indexOf("else"));
  assert.doesNotMatch(releaseBranch, /export-pi-release\.mjs/);
});

test("only one pi-customizations source mode is accepted at a time", () => {
  const sourcesGivenBlock = imageTool.slice(imageTool.indexOf("local sources_given=0"), imageTool.indexOf("if ((sources_given > 1))"));
  // ((var++)) on a var starting at 0 aborts under `set -e`; must use assignment form.
  assert.doesNotMatch(sourcesGivenBlock, /\(\(sources_given\+\+\)\)/);
  assert.match(sourcesGivenBlock, /sources_given=\$\(\(sources_given \+ 1\)\)/g);
});
