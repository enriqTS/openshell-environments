# Plan

## Objective

Make OpenShell client environments portable across computers without requiring identical checkout paths or source repositories during normal use.

Normal installations should consume:

1. A published, immutable OCI client image containing reviewed client assets.
2. A small, versioned host integration package containing the launcher and client-specific synchronization/provider helpers.

Local source checkouts remain supported only as explicit development overrides.

## Desired user experience

A new computer should need Docker, OpenShell, and a bootstrap/install command, then be able to run Pi without cloning repositories into a specific location:

```bash
pi-openshell install
docker pull ghcr.io/enriqts/openshell-environments/pi:<version>
pi
```

The installer should use XDG locations by default and never assume paths such as `~/Projetos/...`.

## Architecture

### Published OCI images

- Publish the Pi client image under a full versioned reference, for example:
  `ghcr.io/enriqts/openshell-environments/pi:0.2.0`.
- Also publish or record its immutable digest and prefer digest-pinned compatibility metadata for normal installations.
- Build the image from committed, reviewed revisions only.
- Record the `openshell-environments` revision, Pi asset revision, compatibility API, and release version as OCI labels.
- Copy reviewed Pi resources into Pi's standard internal paths under `/home/pi/.pi/agent` where practical, rather than requiring runtime resource paths into a source checkout.
- Never bake credentials, sessions, arbitrary host settings, caches, or the host Pi profile into the image.

### Host integration package

Create a versioned package containing only the host-side components required at runtime:

- Thin `pi-openshell` launcher.
- Pi settings sanitizer.
- Project-session translator/synchronizer.
- Provider synchronization helper and provider profile.
- Client hook and compatibility metadata.

Install it by default under an XDG path such as:

```text
${XDG_DATA_HOME:-$HOME/.local/share}/pi-openshell/<version>/
```

Expose `pi` through `~/.local/bin` or another user-selected `PATH` directory. The installed launcher must resolve files relative to its own package and must not depend on the location of a `pi-customizations` checkout.

The package should be produced from `pi-customizations`, preserving that repository's ownership of Pi-specific behavior. This repository may provide orchestration and compatibility metadata, but should not duplicate mutable Pi implementation files.

### Development overrides

Retain explicit local-development controls:

```bash
PI_OPENSHELL_ENVIRONMENTS_DIR=/any/path/openshell-environments
PI_OPENSHELL_INTEGRATION_DIR=/any/path/pi-customizations
PI_OPENSHELL_IMAGE=localhost/openshell-environments/pi:dev
```

Development builds may consume explicit checkout paths, but release launchers must never silently discover an unversioned sibling repository or rebuild images during startup.

## Implementation phases

### Phase 1: Define release contracts

1. Define the Pi asset/export manifest and host integration package layout.
2. Version the image, launcher API, client hook API, and Pi asset compatibility independently where needed.
3. Define compatibility metadata linking:
   - OpenShell environment release.
   - OCI image tag/digest.
   - Host integration package release.
   - Pi customization revision/API.
4. Decide release archive checksums and signature/provenance strategy.
5. Add tests that reject missing, incompatible, or mutable/unversioned dependencies.

### Phase 2: Produce sanitized Pi artifacts

1. Add an export/package command in `pi-customizations` that selects only reviewed resources and integration files.
2. Use an explicit allowlist; never archive the complete host `~/.pi/agent` directory.
3. Include a manifest, version, source revision, checksums, and compatibility API.
4. Make output deterministic enough to verify in CI.
5. Test that credentials, sessions, logs, settings, temporary files, and unrelated host paths are absent.

### Phase 3: Use standard paths inside the image

1. Update the Pi image layer to consume the sanitized asset artifact.
2. Install agents, extensions, skills, themes, and `APPEND_SYSTEM.md` into reviewed standard Pi paths.
3. Generate minimal image settings referencing those installed paths only when Pi requires explicit resource registration.
4. Remove unnecessary runtime dependence on `/opt/pi-customizations` while retaining a read-only metadata location if useful for auditing.
5. Re-run extension discovery, subagents, Terraform guard, themes, skills, and system-prompt tests.

### Phase 4: Publish OCI images

1. Add CI that builds base and client images from tags and clean committed sources.
2. Push version tags to GHCR and capture immutable digests.
3. Publish architecture support explicitly; do not imply multi-architecture support unless tested.
4. Generate SBOM/provenance metadata where practical.
5. Test pulling and launching the image on a clean machine with no source checkout.
6. Keep local `bin/openshell-image` build, inspect, and cleanup commands for development.

### Phase 5: Package and install the host integration

1. Produce a versioned release archive/package from `pi-customizations`.
2. Implement an installer that:
   - Downloads a pinned release.
   - Verifies checksum/signature.
   - Installs atomically under the XDG data directory.
   - Updates the user-facing symlink only after validation.
   - Preserves previous versions for rollback.
3. Make the launcher select its compatible image digest/reference from package metadata.
4. Add upgrade, downgrade, uninstall, and inspection commands.
5. Keep secrets in existing host application locations and pass them only through OpenShell provider synchronization.

### Phase 6: Clean-machine acceptance

Validate on at least two computers or clean user environments with different home and checkout layouts:

- No `pi-customizations` or `openshell-environments` checkout is present.
- Installation uses only documented XDG and `PATH` locations.
- The published image is pulled rather than rebuilt.
- Pi starts and custom agents/extensions/skills/themes load.
- Terraform apply remains blocked.
- Public HTTP/HTTPS works; port 22 and private/special-use destinations remain blocked.
- Codex provider routing succeeds without exposing raw credentials.
- Only sanitized settings and current-project sessions synchronize.
- Git history, tracked edits/deletions, ignored files, and recovery behave as before.
- Image/package version mismatch fails with a clear upgrade or rollback instruction.

## Security constraints

- Never solve portability by copying the complete host Pi configuration directory.
- Never upload credentials, unrelated sessions, SSH/GPG files, shell configuration, trust state, or caches.
- Keep each client independently permissioned; a portable package must not broaden the shared policy.
- Use full OCI references and immutable digests for releases.
- Do not silently build, pull a community image, or search arbitrary sibling paths at launch.
- Preserve explicit local overrides for development without making them release defaults.

## Rollback

- Keep `openshell-environments` 0.1.0 and the current source-based Pi integration available during the transition.
- Do not switch the installed `pi` symlink until the published image and host package pass clean-machine acceptance.
- Preserve the previous integration package and image digest for one-command rollback.
- Never delete retained OpenShell sandboxes as part of installation or upgrade.

## Completion criteria

This work is complete when a clean computer can install and run customized Pi without either source repository, without machine-specific paths, and with the current security, provider, session, Git, recovery, and customization behavior preserved.

## Status

Phase 4 complete. `ghcr.io/enriqts/openshell-environments/{base,pi}:0.2.0` are published, signed, and verified. The 0.1.0 whole-tree image build remains the rollback baseline, reachable at git tag `v0.1.0`.

Completed (Phase 1-2, contracts and exporter):

- Added machine-readable version 1 contracts for sanitized Pi assets, the host integration package, and release compatibility metadata.
- Defined deterministic archives, exact member allowlists, SHA-256 verification, stable-release provenance, XDG installation, atomic activation/rollback, and explicit development overrides.
- Added fail-closed validators and tests for mutable or mismatched image references, malformed digests/checksums/revisions, unsafe or forbidden package paths, duplicate members, and incompatible APIs.
- Phase 2 delivered in `pi-customizations`: a clean-tree, allowlist-based deterministic exporter produces verified asset and host-package archives with manifests, source revisions, normalized modes/timestamps, per-member checksums, package-relative runtime files, and negative security tests. No artifact was published or activated.

Completed (Phase 3, standard paths inside the image):

- `bin/openshell-image build pi/all` no longer copies the whole `pi-customizations` checkout into the build context. It invokes `pi-customizations/bin/export-pi-release.mjs assets` to produce the sanitized `pi-assets-<version>.tar.gz`, and only that archive enters the Docker build context.
- The Pi image installs `agents`, `extensions`, `skills`, `themes`, and `APPEND_SYSTEM.md` directly into Pi's standard `/home/pi/.pi/agent/...` paths. Verified against the shipped Pi package that these are auto-discovered by default with no `settings.json` registration, so the image no longer generates one.
- `/opt/pi-customizations` no longer holds the source tree; it retains only the exported `manifest.json` as a read-only audit record (version, source revision, per-file checksums).
- Added `--pi-ref REF` to `bin/openshell-image build pi/all` as an alternative to `--pi-source PATH`: it shallow-fetches an exact tag/branch/SHA straight from `https://github.com/enriqTS/pi-customizations`, so building the image no longer requires a local sibling checkout at all. `--pi-source` remains as the explicit local-development override.
- Added `io.openshell.pi-assets.version` and `io.openshell.pi-assets.api` OCI labels alongside the existing compatibility labels.

Completed (Phase 4, publish OCI images):

- `pi-customizations` gained `.github/workflows/release-pi-assets.yml`: on a `pi-assets-v<version>` tag it runs the existing exporter and publishes `pi-assets-<version>.tar.gz` plus `SHA256SUMS` as a GitHub Release, with a build-provenance attestation on the archive. This repository's image build never clones `pi-customizations`' source or runs its scripts to get a release artifact — it only downloads and verifies the published one. `pi-assets-v0.1.0` is published: https://github.com/enriqTS/pi-customizations/releases/tag/pi-assets-v0.1.0.
- `bin/openshell-image build pi/all` gained a third source mode, `--pi-assets-version VERSION` (mutually exclusive with `--pi-source`/`--pi-ref`), which downloads and checksum-verifies that published archive. `clients/pi/pi-assets.version` pins which release an environment build consumes (currently `0.1.0`).
- `.github/workflows/test.yml` runs `npm test` on every push/PR to `main`. `.github/workflows/release-images.yml`, triggered by a `v<semver>` tag matching `VERSION`, builds `base` then `pi` (pinned to `base`'s pushed digest), pushes both to `ghcr.io/enriqts/openshell-environments/{base,pi}` with a BuildKit SBOM and provenance attestation, signs both keylessly with `cosign` over GitHub Actions OIDC, then a `verify-clean-pull` job with no checkout step at all pulls both by digest and reruns the resource-layout and restricted-PATH Rust checks — the automated form of "pull and launch on a clean machine." A `release-notes` job records both image references, digests, and the pinned `pi-assets` version.
- **Published and independently verified**: `ghcr.io/enriqts/openshell-environments/base:0.2.0@sha256:99e0540bc786b5ab825eeb0beaaf0d5b5982bfea312a4cbe5fb2e97f6c6947dd` and `.../pi:0.2.0@sha256:e820b9e224a217dddaae670979566e8c20ef331be3bb2d62c94e47862c771ca0`. Release: https://github.com/enriqTS/openshell-environments/releases/tag/v0.2.0. Both pulled and `cosign verify`'d from outside CI (offline Rekor transparency-log check, correct OIDC identity/workflow/commit/tag), confirming they aren't just a CI self-report.
- Only `linux/amd64` is published; this session's sandbox and GitHub-hosted runners can only build and test that architecture, so broader platform support is never claimed unverified.
- **Bug found and fixed during the first real run**: `ghcr.io/enriqTS/...` (the reference used throughout the original `PLAN.md` and Phase 1 contracts) is an invalid OCI reference — Docker/OCI repository names must be all-lowercase. The first `release-images.yml` run failed at the base image push for exactly this reason. Fixed to `ghcr.io/enriqts/...` (GHCR maps the lowercase image path to the `enriqTS` account regardless of the username's real casing) across both repos' contracts, validators, workflows, and docs; GitHub source URLs (`https://github.com/enriqTS/...`) are unaffected since those aren't OCI references. The `v0.2.0` tag was moved to the fixed commit before any image or release existed under it, so nothing published is affected.

Next action: Phase 5 (host integration package: its own release/tag pattern in `pi-customizations`, an installer, `compatibility.json` generation, XDG install/rollback).

Maintenance completed: OpenShell can replace image `PATH` at Pi exec time. The base image provides Rustup-aware `/usr/local/bin` wrappers, and the Pi image starts through a toolchain entrypoint which restores the Rust path and state before launching Pi. `openshell-image build pi/all` now runs Cargo, Rustc, Rustfmt, and Clippy through that entrypoint with the restricted OpenShell PATH, so it fails rather than reporting a build that cannot run Rust. Create a new (non-recovery) sandbox after a successful build.
