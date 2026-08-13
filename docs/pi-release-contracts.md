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

`target: agent` members install below `/home/pi/.pi/agent`; `target: image` members are image build helpers and do not remain in the agent resource tree. Phase 3 removes image helpers after use.

`pi-customizations` publishes this archive itself, from its own CI, as a GitHub Release on a `pi-assets-v<version>` tag (independent of `openshell-environments`' own version): the release attaches `pi-assets-<version>.tar.gz`, `SHA256SUMS`, and a GitHub build-provenance attestation on the archive. `openshell-environments` never clones `pi-customizations`' source or runs its exporter to obtain a release artifact — it downloads the published archive, verifies it against `SHA256SUMS`, and (in CI) additionally verifies the attestation. `clients/pi/pi-assets.version` pins which published release an `openshell-environments` build consumes; bumping it is a small, reviewable commit, and a new environment release is cut only after the pinned `pi-assets` release already exists.

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

`pi-customizations` publishes this archive itself, on a `pi-openshell-v<version>` tag (its own independent version line, distinct from both `pi-assets-v<version>` and the environment version), via `.github/workflows/release-pi-openshell.yml`. That workflow assembles `compatibility.json` from real, already-published data rather than transcribing it by hand: it reads `release/openshell-environments.version` and `release/pi-assets.version` (pin files analogous to `clients/pi/pi-assets.version` in this repo), resolves the pinned image's digest and `org.opencontainers.image.revision` label directly from the registry (`docker pull` + `docker image inspect`, never parsed from release notes text), and downloads+verifies the pinned `pi-assets` release to read its version/API/source-revision and compute its checksum. `pi-customizations/bin/install-pi-openshell` is the installer: a single self-contained, curl-pipeable script implementing `install`/`upgrade`/`downgrade`/`uninstall`/`list`, with its own inline manifest/compatibility validation (no dependency on a local checkout of either repository), a best-effort `gh attestation verify` when `gh` is available, and the same clone-a-tagged-release mechanism as the existing 0.1.0 adapter for fetching the compatible `openshell-environments` release it depends on.

## Release compatibility

Each host package includes `compatibility.json`, which validates against `pi-release.schema.json` and binds exactly one environment release, immutable client image digest, host package version/APIs, and asset artifact. The image is pulled using `<reference>@<digest>`; the version tag is retained for human inspection. `latest`, `dev`, tag-only, unqualified, and digest-less references are invalid in release metadata. The compatibility file deliberately does not contain the host archive's own checksum: doing so would create a self-referential archive. `SHA256SUMS` and release provenance bind the completed host archive externally.

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

SHA-256 is mandatory for each member in its manifest, for the asset archive referenced by compatibility metadata, and for every downloadable archive in `SHA256SUMS`. The host archive checksum cannot be embedded in that same archive and is therefore supplied only by `SHA256SUMS` and provenance. Stable releases also require GitHub artifact attestations for both archives and the OCI image plus a keyless Sigstore signature on the digest. Consumers verify checksums unconditionally and provenance when the installer supports online verification; a future release may make provenance verification mandatory without changing artifact contents.

## Image publishing

`openshell-environments`' `.github/workflows/release-images.yml` builds and publishes both images on a `v<semver>` tag that must equal `VERSION`: `base` first, then `pi` pinned to `base`'s pushed digest via `--build-arg BASE_IMAGE=<ref>@<digest>`, both pushed to `ghcr.io/enriqts/openshell-environments/{base,pi}:<version>` with a BuildKit SBOM and provenance attestation, then signed keylessly with `cosign` over GitHub Actions OIDC (no stored keys). A `verify-clean-pull` job with no checkout step at all pulls both images by digest only and re-runs the same resource-layout and restricted-PATH Rust checks used during development, proving a machine with neither source repository present can pull and launch them. Release notes on the tag record both image references, digests, and the pinned `pi-assets` version. Only `linux/amd64` is published; broader platform support is not claimed until it is actually built and tested, not merely cross-compiled.

## Development overrides

The following are explicit development controls and are never read as release defaults:

```bash
PI_OPENSHELL_ENVIRONMENTS_DIR=/any/path/openshell-environments
PI_OPENSHELL_INTEGRATION_DIR=/any/path/pi-customizations
PI_OPENSHELL_IMAGE=localhost/openshell-environments/pi:dev
```

`bin/openshell-image build pi` additionally accepts exactly one of three source modes: `--pi-source PATH` (local checkout), `--pi-ref REF` (shallow-fetch a source ref from GitHub and export it locally), or `--pi-assets-version VERSION` (download and verify an already-published `pi-assets` release, matching what the release workflow does). The first two are development overrides for iterating before a release exists; the third is how both local builds and CI consume a real release. Development tooling may accept mutable local tags and checkout paths. A package marked as a release must satisfy the stricter compatibility schema regardless of these variables.
