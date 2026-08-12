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
  assert.match(pi, /COPY pi-customizations \/opt\/pi-customizations/);
  assert.match(pi, /pi-openshell-toolchain-entrypoint/);
  assert.match(pi, /export PATH=\/usr\/local\/cargo\/bin:\/tmp\/cargo\/bin:\$PATH/);
  assert.match(pi, /ENTRYPOINT \["\/usr\/local\/bin\/pi-openshell-toolchain-entrypoint"\]/);
  assert.match(pi, /io\.openshell\.compatibility="pi-customizations-api-1"/);
});

test("image lifecycle is explicit rather than part of launch", () => {
  assert.match(imageTool, /docker buildx build/);
  assert.match(imageTool, /docker image inspect/);
  assert.match(imageTool, /docker image rm/);
  assert.match(imageTool, /verify_pi_rust/);
  assert.match(imageTool, /-e PATH=\/usr\/local\/bin:\/usr\/bin:\/bin/);
  assert.match(imageTool, /test "\$RUSTUP_HOME" = \/usr\/local\/rustup/);
  assert.match(imageTool, /test "\$CARGO_HOME" = \/tmp\/cargo/);
  assert.match(imageTool, /cargo clippy --version/);
});
