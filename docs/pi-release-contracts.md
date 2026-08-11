# Pi release contracts

These contracts define the portable Pi distribution introduced after the 0.1.0 source-based baseline. `pi-customizations` owns and produces the Pi artifacts; this repository owns the image composition and the compatibility record. The JSON Schemas in [`contracts/`](../contracts/) are normative.

## Sanitized asset artifact

The producer emits `pi-assets-<version>.tar.gz` with this root layout:

```text
manifest.json
APPEND_SYSTEM.md
agents/...
extensions/...
skills/...
themes/...
image/pi-openshell-entrypoint
image/patch-pi-codex
```

`manifest.json` must validate against `pi-assets.schema.json`. Its `files` array is the complete allowlist: every regular archive member other than `manifest.json` must appear exactly once, every listed member must exist exactly once, and its SHA-256 and mode must match. Directories may be implicit. Symlinks, hard links, devices, absolute paths, `..` components, duplicate paths, and files outside the schema's path allowlist are invalid.

The exporter must select committed resources explicitly; it must never package a whole checkout or `$PI_CODING_AGENT_DIR`. Credentials, auth/session data, logs, caches, settings, temporary files, VCS metadata, SSH/GPG material, shell configuration, and host-specific paths are forbidden. In particular, names matching `auth.json`, `settings.json`, `sessions`, `.git`, `.ssh`, `.gnupg`, `node_modules`, `cache`, `tmp`, `*.log`, or `*.key` must fail export even below an otherwise allowed directory.

`target: agent` members install below `/home/pi/.pi/agent`; `target: image` members are image build helpers and do not remain in the agent resource tree. Phase 3 may remove image helpers after use.

## Host integration package

The producer emits `pi-openshell-<version>.tar.gz` with this root layout:

```text
manifest.json
compatibility.json
bin/pi
bin/pi-openshell
bin/pi-openshell-hook
lib/...
providers/...
```

`manifest.json` must validate against `pi-host-integration.schema.json` and obey the same exact-member, checksum, safe-path, and no-link rules as the asset artifact. The package contains only host runtime code and public provider configuration. Credentials, OAuth state, sessions, arbitrary user settings, caches, and checkout paths are forbidden.

The launcher resolves `lib`, `providers`, its hook, and `compatibility.json` relative to its own real package directory. It must not search sibling repositories or build an image. The default installation is:

```text
${XDG_DATA_HOME:-$HOME/.local/share}/pi-openshell/<version>/
${XDG_BIN_HOME:-$HOME/.local/bin}/pi -> <package>/bin/pi
```

Installation extracts to a temporary sibling directory, validates all manifests/checksums and compatibility, then atomically renames it and updates the user-facing symlink. Existing versions remain available for rollback. Package-owned files are immutable during normal operation; state remains in the existing host application locations.

The executable hook implements launcher/hook API 1 (`prepare`, `upload`, `download`, and `exec-env`) as documented in [`adding-a-client.md`](adding-a-client.md). Raw credentials never appear in hook output or archives; provider synchronization remains the only credential boundary.

## Release compatibility

Each host package includes `compatibility.json`, which validates against `pi-release.schema.json` and binds exactly one environment release, immutable client image digest, host package, and asset artifact. The image is pulled using `<reference>@<digest>`; the version tag is retained for human inspection. `latest`, `dev`, tag-only, unqualified, and digest-less references are invalid in release metadata.

All four versions may evolve independently. Install or launch fails closed when an API differs from the supported schema constants, versions do not match the selected release record, a checksum differs, or the running image labels disagree with the record. The error must identify the incompatible components and recommend selecting a compatible retained version; it must not rebuild or fall back automatically.

Required OCI labels are:

- `org.opencontainers.image.version`: environment release.
- `org.opencontainers.image.revision`: committed environment revision.
- `io.openshell.client=pi`.
- `io.openshell.pi-assets.version` and `io.openshell.pi-assets.api`.
- `io.openshell.pi-customizations.revision`: asset source revision.
- `io.openshell.launcher.api` and `io.openshell.hook.api`.

## Reproducibility and provenance

Archives use sorted bytewise paths, numeric owner/group `0`, empty owner/group names, normalized mode from the manifest, and `mtime=SOURCE_DATE_EPOCH` (the source commit time). Gzip uses no original filename or wall-clock timestamp. Identical committed inputs and tool versions must produce identical bytes.

SHA-256 is mandatory at three levels: each member in its manifest, each release archive in the release compatibility record, and each downloadable archive in `SHA256SUMS`. Stable releases also require GitHub artifact attestations for both archives and the OCI image plus a keyless Sigstore signature on the digest. Consumers verify checksums unconditionally and provenance when the installer supports online verification; a future release may make provenance verification mandatory without changing artifact contents.

## Development overrides

The following are explicit development controls and are never read as release defaults:

```bash
PI_OPENSHELL_ENVIRONMENTS_DIR=/any/path/openshell-environments
PI_OPENSHELL_INTEGRATION_DIR=/any/path/pi-customizations
PI_OPENSHELL_IMAGE=localhost/openshell-environments/pi:dev
```

Development tooling may accept mutable local tags and checkout paths. A package marked as a release must satisfy the stricter compatibility schema regardless of these variables.
