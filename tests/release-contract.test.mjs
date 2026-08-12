import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  validateAssetManifest,
  validateHostManifest,
  validateReleaseMetadata,
} from "../lib/pi-release-contract.mjs";

const revision = "a".repeat(40);
const digest = "b".repeat(64);
const checksum = "c".repeat(64);

const asset = () => ({
  schemaVersion: 1,
  name: "pi-assets",
  version: "1.2.3",
  piAssetsApi: 1,
  source: { repository: "https://github.com/enriqTS/pi-customizations", revision },
  files: [
    { path: "agents/reviewer.md", sha256: checksum, mode: "0644", target: "agent" },
    { path: "APPEND_SYSTEM.md", sha256: checksum, mode: "0644", target: "agent" },
    { path: "extensions/tools.mjs", sha256: checksum, mode: "0644", target: "agent" },
    { path: "skills/release/SKILL.md", sha256: checksum, mode: "0644", target: "agent" },
    { path: "themes/dark.json", sha256: checksum, mode: "0644", target: "agent" },
    { path: "image/pi-openshell-entrypoint", sha256: checksum, mode: "0755", target: "image" },
    { path: "image/patch-pi-codex", sha256: checksum, mode: "0755", target: "image" },
  ],
});

const host = () => ({
  schemaVersion: 1,
  name: "pi-openshell",
  version: "1.2.3",
  launcherApi: 1,
  hookApi: 1,
  source: { repository: "https://github.com/enriqTS/pi-customizations", revision },
  files: [
    { path: "bin/pi-openshell", sha256: checksum, mode: "0755" },
    { path: "bin/pi", sha256: checksum, mode: "0755" },
    { path: "bin/pi-openshell-hook", sha256: checksum, mode: "0755" },
    { path: "lib/settings-sanitizer.mjs", sha256: checksum, mode: "0644" },
    { path: "providers/codex.yaml", sha256: checksum, mode: "0644" },
    { path: "compatibility.json", sha256: checksum, mode: "0644" },
  ],
});

const release = () => ({
  schemaVersion: 1,
  environment: { version: "1.2.3", revision },
  image: {
    reference: "ghcr.io/enriqTS/openshell-environments/pi:1.2.3",
    digest: `sha256:${digest}`,
    platforms: ["linux/amd64"],
  },
  hostIntegration: { version: "2.0.0", launcherApi: 1, hookApi: 1 },
  piAssets: { version: "3.0.0", api: 1, sourceRevision: revision, sha256: checksum },
});

function rejected(mutate, validator, value, pattern) {
  mutate(value);
  assert.match(validator(value).join("\n"), pattern);
}

test("contract schemas are valid JSON and pin API 1", async () => {
  const names = ["pi-assets", "pi-host-integration", "pi-release"];
  const schemas = await Promise.all(names.map(async (name) => JSON.parse(await readFile(new URL(`../contracts/${name}.schema.json`, import.meta.url)))));
  for (const schema of schemas) {
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.equal(schema.properties.schemaVersion.const, 1);
  }
  assert.equal(schemas[0].properties.piAssetsApi.const, 1);
  assert.equal(schemas[1].properties.launcherApi.const, 1);
  assert.equal(schemas[1].properties.hookApi.const, 1);
  assert.equal((await readFile(new URL("../API_VERSION", import.meta.url), "utf8")).trim(), "1");
});

test("reviewed asset and host package manifests satisfy API 1", () => {
  assert.deepEqual(validateAssetManifest(asset()), []);
  assert.deepEqual(validateHostManifest(host()), []);
});

test("asset manifest rejects unsafe, forbidden, duplicate, and unreviewed paths", () => {
  rejected((x) => { x.files[0].path = "agents/../auth.json"; }, validateAssetManifest, asset(), /unsafe|forbidden/);
  rejected((x) => { x.files[0].path = "sessions/private.json"; }, validateAssetManifest, asset(), /path is invalid/);
  rejected((x) => { x.files[0].path = "extensions/settings.json"; }, validateAssetManifest, asset(), /forbidden/);
  rejected((x) => { x.files.push({ ...x.files[0] }); }, validateAssetManifest, asset(), /duplicated/);
  rejected((x) => { x.files[0].sha256 = "mutable"; }, validateAssetManifest, asset(), /sha256/);
});

test("host package rejects checkout content and incompatible hook APIs", () => {
  rejected((x) => { x.files[0].path = "pi-customizations/bin/pi"; }, validateHostManifest, host(), /path is invalid/);
  rejected((x) => { x.files[0].path = "lib/cache/token"; }, validateHostManifest, host(), /forbidden/);
  rejected((x) => { x.hookApi = 2; }, validateHostManifest, host(), /hookApi is incompatible/);
});

test("release metadata binds independently versioned compatible artifacts", () => {
  assert.deepEqual(validateReleaseMetadata(release()), []);
  const independent = release();
  assert.notEqual(independent.environment.version, independent.hostIntegration.version);
  assert.notEqual(independent.environment.version, independent.piAssets.version);
});

test("release metadata rejects mutable, unqualified, digest-less, and mismatched images", () => {
  for (const reference of ["pi:1.2.3", "ghcr.io/enriqTS/openshell-environments/pi:latest", "localhost/openshell-environments/pi:dev"]) {
    rejected((x) => { x.image.reference = reference; }, validateReleaseMetadata, release(), /image.reference/);
  }
  rejected((x) => { delete x.image.digest; }, validateReleaseMetadata, release(), /image.digest/);
  rejected((x) => { x.image.reference = "ghcr.io/enriqTS/openshell-environments/pi:9.9.9"; }, validateReleaseMetadata, release(), /incompatible/);
  rejected((x) => { x.image.platforms = ["linux/amd64", "linux/amd64"]; }, validateReleaseMetadata, release(), /platforms/);
});

test("release metadata rejects missing checksums, revisions, and incompatible APIs", () => {
  rejected((x) => { x.hostIntegration.sha256 = checksum; }, validateReleaseMetadata, release(), /not allowed/);
  rejected((x) => { x.piAssets.sha256 = ""; }, validateReleaseMetadata, release(), /piAssets.sha256/);
  rejected((x) => { delete x.piAssets.sourceRevision; }, validateReleaseMetadata, release(), /sourceRevision/);
  rejected((x) => { x.hostIntegration.launcherApi = 2; }, validateReleaseMetadata, release(), /launcherApi is incompatible/);
  rejected((x) => { x.piAssets.api = 2; }, validateReleaseMetadata, release(), /piAssets.api is incompatible/);
});
