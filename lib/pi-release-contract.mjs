const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/;
const REVISION = /^[0-9a-f]{40,64}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const IMAGE = /^ghcr\.io\/enriqts\/openshell-environments\/pi:([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)$/;
const ASSET_PATH = /^(APPEND_SYSTEM\.md|agents\/[^/].*|extensions\/[^/].*|skills\/[^/].*|themes\/[^/].*|image\/(pi-openshell-entrypoint|patch-pi-codex))$/;
const HOST_PATH = /^(bin\/(pi|pi-openshell|pi-openshell-hook)|lib\/[^/].*|providers\/[^/].*|compatibility\.json)$/;
const FORBIDDEN = /(^|\/)(auth\.json|settings\.json|sessions?|\.git|\.ssh|\.gnupg|node_modules|cache|tmp)(\/|$)|\.(log|key)$/i;

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function check(value, pattern, label, errors) {
  if (typeof value !== "string" || !pattern.test(value)) errors.push(`${label} is invalid`);
}

function exactKeys(value, allowed, label, errors) {
  if (!object(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) errors.push(`${label}.${key} is not allowed`);
  }
}

function requirePaths(files, requirements, errors) {
  if (!Array.isArray(files)) return;
  for (const [label, matches] of requirements) {
    if (!files.some((file) => object(file) && typeof file.path === "string" && matches(file.path))) errors.push(`files is missing ${label}`);
  }
}

function validateFiles(files, pathPattern, errors) {
  if (!Array.isArray(files) || files.length === 0) {
    errors.push("files must be a non-empty array");
    return;
  }
  const seen = new Set();
  for (const [index, file] of files.entries()) {
    const label = `files[${index}]`;
    if (!object(file)) {
      errors.push(`${label} is invalid`);
      continue;
    }
    check(file.path, pathPattern, `${label}.path`, errors);
    if (typeof file.path === "string" && (file.path.startsWith("/") || file.path.includes("\\") || file.path.split("/").some((part) => part === "." || part === ".."))) errors.push(`${label}.path is unsafe`);
    if (typeof file.path === "string" && FORBIDDEN.test(file.path)) errors.push(`${label}.path is forbidden`);
    if (seen.has(file.path)) errors.push(`${label}.path is duplicated`);
    seen.add(file.path);
    check(file.sha256, SHA256, `${label}.sha256`, errors);
    if (!["0644", "0755"].includes(file.mode)) errors.push(`${label}.mode is invalid`);
  }
}

export function validateAssetManifest(manifest) {
  const errors = [];
  if (!object(manifest)) return ["manifest must be an object"];
  exactKeys(manifest, ["schemaVersion", "name", "version", "piAssetsApi", "source", "files"], "manifest", errors);
  if (manifest.schemaVersion !== 1) errors.push("schemaVersion is incompatible");
  if (manifest.name !== "pi-assets") errors.push("name is invalid");
  check(manifest.version, VERSION, "version", errors);
  if (manifest.piAssetsApi !== 1) errors.push("piAssetsApi is incompatible");
  if (!object(manifest.source)) errors.push("source is invalid");
  else {
    if (manifest.source.repository !== "https://github.com/enriqTS/pi-customizations") errors.push("source.repository is invalid");
    check(manifest.source.revision, REVISION, "source.revision", errors);
  }
  validateFiles(manifest.files, ASSET_PATH, errors);
  requirePaths(manifest.files, [
    ["APPEND_SYSTEM.md", (path) => path === "APPEND_SYSTEM.md"],
    ["agents", (path) => path.startsWith("agents/")],
    ["extensions", (path) => path.startsWith("extensions/")],
    ["skills", (path) => path.startsWith("skills/")],
    ["themes", (path) => path.startsWith("themes/")],
    ["image/pi-openshell-entrypoint", (path) => path === "image/pi-openshell-entrypoint"],
    ["image/patch-pi-codex", (path) => path === "image/patch-pi-codex"],
  ], errors);
  for (const [index, file] of (manifest.files ?? []).entries()) {
    if (object(file) && !["agent", "image"].includes(file.target)) errors.push(`files[${index}].target is invalid`);
  }
  return errors;
}

export function validateHostManifest(manifest) {
  const errors = [];
  if (!object(manifest)) return ["manifest must be an object"];
  exactKeys(manifest, ["schemaVersion", "name", "version", "launcherApi", "hookApi", "source", "files"], "manifest", errors);
  if (manifest.schemaVersion !== 1) errors.push("schemaVersion is incompatible");
  if (manifest.name !== "pi-openshell") errors.push("name is invalid");
  check(manifest.version, VERSION, "version", errors);
  if (manifest.launcherApi !== 1) errors.push("launcherApi is incompatible");
  if (manifest.hookApi !== 1) errors.push("hookApi is incompatible");
  if (!object(manifest.source)) errors.push("source is invalid");
  else {
    if (manifest.source.repository !== "https://github.com/enriqTS/pi-customizations") errors.push("source.repository is invalid");
    check(manifest.source.revision, REVISION, "source.revision", errors);
  }
  validateFiles(manifest.files, HOST_PATH, errors);
  requirePaths(manifest.files, [
    ["bin/pi", (path) => path === "bin/pi"],
    ["bin/pi-openshell", (path) => path === "bin/pi-openshell"],
    ["bin/pi-openshell-hook", (path) => path === "bin/pi-openshell-hook"],
    ["lib integration helper", (path) => path.startsWith("lib/")],
    ["provider profile", (path) => path.startsWith("providers/")],
    ["compatibility.json", (path) => path === "compatibility.json"],
  ], errors);
  return errors;
}

export function validateReleaseMetadata(metadata) {
  const errors = [];
  if (!object(metadata)) return ["metadata must be an object"];
  exactKeys(metadata, ["schemaVersion", "environment", "image", "hostIntegration", "piAssets"], "metadata", errors);
  if (metadata.schemaVersion !== 1) errors.push("schemaVersion is incompatible");

  if (!object(metadata.environment)) errors.push("environment is invalid");
  else {
    check(metadata.environment.version, VERSION, "environment.version", errors);
    check(metadata.environment.revision, REVISION, "environment.revision", errors);
  }

  if (!object(metadata.image)) errors.push("image is invalid");
  else {
    const match = typeof metadata.image.reference === "string" && metadata.image.reference.match(IMAGE);
    if (!match) errors.push("image.reference must be a full immutable-release repository with a version tag");
    else if (match[1] !== metadata.environment?.version) errors.push("image tag is incompatible with environment.version");
    if (typeof metadata.image.digest !== "string" || !/^sha256:[0-9a-f]{64}$/.test(metadata.image.digest)) errors.push("image.digest is invalid");
    if (!Array.isArray(metadata.image.platforms) || metadata.image.platforms.length === 0 || metadata.image.platforms.some((p) => !["linux/amd64", "linux/arm64"].includes(p)) || new Set(metadata.image.platforms).size !== metadata.image.platforms.length) errors.push("image.platforms is invalid");
  }

  if (!object(metadata.hostIntegration)) errors.push("hostIntegration is invalid");
  else {
    exactKeys(metadata.hostIntegration, ["version", "launcherApi", "hookApi"], "hostIntegration", errors);
    check(metadata.hostIntegration.version, VERSION, "hostIntegration.version", errors);
    if (metadata.hostIntegration.launcherApi !== 1) errors.push("hostIntegration.launcherApi is incompatible");
    if (metadata.hostIntegration.hookApi !== 1) errors.push("hostIntegration.hookApi is incompatible");
  }

  if (!object(metadata.piAssets)) errors.push("piAssets is invalid");
  else {
    check(metadata.piAssets.version, VERSION, "piAssets.version", errors);
    if (metadata.piAssets.api !== 1) errors.push("piAssets.api is incompatible");
    check(metadata.piAssets.sourceRevision, REVISION, "piAssets.sourceRevision", errors);
    check(metadata.piAssets.sha256, SHA256, "piAssets.sha256", errors);
  }
  return errors;
}
