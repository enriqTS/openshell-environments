import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const base = await readFile(new URL("../policies/base.yaml", import.meta.url), "utf8");
const pi = await readFile(new URL("../clients/pi/policy.yaml", import.meta.url), "utf8");
const claude = await readFile(new URL("../clients/claude/policy.yaml", import.meta.url), "utf8");
const codex = await readFile(new URL("../clients/codex/policy.yaml", import.meta.url), "utf8");

for (const [name, policy] of [["base", base], ["Pi", pi], ["Claude", claude], ["Codex", codex]]) {
  test(`${name} policy permits public web ports without private ranges`, () => {
    assert.match(policy, /^      - ports: \[80, 443\]$/m);
    assert.match(policy, /^          - "2000::\/3"$/m);
    assert.match(policy, /^          - "104\.0\.0\.0\/5"$/m);
    assert.doesNotMatch(policy, /0\.0\.0\.0\/0|10\.0\.0\.0\/8|127\.0\.0\.0\/8|169\.254\.0\.0\/16|192\.168\.0\.0\/16/);
    assert.doesNotMatch(policy, /ports?: \[[^\]]*\b22\b/);
  });
}

test("interactive-login clients keep general HTTPS opaque instead of intercepting OAuth TLS", () => {
  assert.doesNotMatch(claude, /protocol: rest/);
  assert.doesNotMatch(codex, /protocol: rest/);
});

test("client-only filesystem permissions are not in the shared base", () => {
  assert.doesNotMatch(base, /pi-customizations|\/home\/(pi|claude|codex)/);
  assert.match(pi, /\/opt\/pi-customizations/);
  assert.match(pi, /\/home\/pi\/\.pi\/agent/);
  assert.match(claude, /\/home\/claude/);
  assert.doesNotMatch(claude, /\/home\/(pi|codex)/);
  assert.match(codex, /\/home\/codex/);
  assert.doesNotMatch(codex, /\/home\/(pi|claude)/);
});
