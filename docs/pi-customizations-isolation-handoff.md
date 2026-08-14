# Handoff: remove OpenShell from `pi-customizations`

This document is for the follow-up change in `enriqTS/pi-customizations`. It accompanies `openshell-environments` commit `e5faa4c` (`Isolate Pi OpenShell integration ownership`).

## New boundary

`pi-customizations` must become a generic Pi resource producer. It may retain only:

- `APPEND_SYSTEM.md`
- `agents/`, `extensions/`, `skills/`, and `themes/`
- the deterministic generic asset exporter
- the `pi-assets-v<version>` GitHub Release workflow and tests/docs for that generic asset contract

It must not name, invoke, package, configure, or document OpenShell.

`openshell-environments` now owns the OpenShell Pi image helpers, host package, launcher, workspace hook, settings/session translation, provider profile/helper, installer, release workflow, and compatibility metadata.

## Required changes

### 1. Publish a new generic asset line

Create `pi-assets-v0.2.0` (or a later agreed semver) whose archive contains **only**:

```text
manifest.json
APPEND_SYSTEM.md
agents/...
extensions/...
skills/...
themes/...
```

The manifest remains schema/API version 1 and has `target: "agent"` for every member. Do not include an `image/` directory or any OpenShell helper.

Update the generic exporter so its explicit allowlist is exactly those resource paths. Preserve deterministic archive creation, committed-clean-tree checks, safe regular-file checks, normalized metadata, per-file SHA-256 manifest entries, `SHA256SUMS`, and archive verification.

Release `pi-assets-0.2.0.tar.gz` with `SHA256SUMS` and build provenance attestation from `pi-customizations` CI. Do not make this repository clone the producer or run its exporter.

After that release exists, the environment repository can build from its existing pin:

```text
clients/pi/pi-assets.version = 0.2.0
```

### 2. Delete OpenShell implementation and packaging

Remove OpenShell-specific files and their tests/workflows, including the current equivalents of:

```text
bin/install-openshell-environments
bin/install-pi-openshell
bin/patch-pi-codex
bin/pi-openshell
bin/pi-openshell-client
bin/pi-openshell-entrypoint
bin/pi-openshell-provider
bin/pi-openshell-sessions.mjs
bin/pi-openshell-settings.mjs
packaging/pi-openshell
providers/pi-codex.yaml
release/
openshell-environments.version
.github/workflows/release-pi-openshell.yml
```

Also remove the host-export branch from `bin/export-pi-release.mjs`; it should export assets only and accept no host compatibility or asset-archive options.

The removed behavior has already been copied into `openshell-environments` under:

```text
clients/pi/pi-openshell-entrypoint
clients/pi/patch-pi-codex
clients/pi/host/
bin/install-pi-openshell
bin/export-pi-host-package.mjs
.github/workflows/release-pi-openshell.yml
```

Do not attempt to keep dual ownership on the new release line.

### 3. Remove OpenShell documentation and assumptions

Delete or rewrite `OpenShell.md`, `OPENSHELL_MIGRATION_PLAN.md`, OpenShell sections of `README.md`, and OpenShell content in repository `PLAN.md` and `MEMORY.md`. Remove OpenShell-specific tests such as launcher, installer, settings/session, provider, and host-export tests.

The remaining documentation must describe generic Pi resources and the generic asset-release contract only.

### 4. Verify the separation

Before committing, confirm all relevant tests pass and run:

```bash
rg -n -i 'openshell|pi-openshell' \
  --glob '!MEMORY.md' --glob '!PLAN.md' --glob '!docs/pi-customizations-isolation-handoff.md' .
```

The expected result is no implementation, configuration, workflow, test, or normal documentation hits. Immutable Git history is out of scope.

Do not delete or move old published tags/releases: `pi-assets-v0.1.0` and `pi-openshell-v0.2.0` remain rollback artifacts.

## What happens next

Once generic `pi-assets-v0.2.0` is published, return to `openshell-environments` to build and validate the new Pi image, publish a new environment image, then publish the environment-owned `pi-openshell` host package. Existing published releases remain the rollback path until clean-machine acceptance succeeds.
