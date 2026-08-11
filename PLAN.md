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
docker pull ghcr.io/enriqTS/openshell-environments/pi:<version>
pi
```

The installer should use XDG locations by default and never assume paths such as `~/Projetos/...`.

## Architecture

### Published OCI images

- Publish the Pi client image under a full versioned reference, for example:
  `ghcr.io/enriqTS/openshell-environments/pi:0.2.0`.
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

Planned. The 0.1.0 source-based migration is complete and remains the rollback baseline. Next action: define the sanitized Pi artifact manifest and host integration package contract before changing image paths or publishing artifacts.
