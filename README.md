# OpenShell environments

Reusable, client-isolated OpenShell development environments. This repository owns the shared toolchain image, workspace/Git lifecycle, general web policy, gateway guidance, and explicit image lifecycle. It does not own client credentials or state formats.

## Pi integration

Compatibility: `pi-customizations` API 1 pairs with `openshell-environments` **0.2.0**. The Pi image now builds from `pi-customizations`' sanitized `pi-assets` archive (see [`pi-release-contracts.md`](docs/pi-release-contracts.md)) instead of a whole checked-out tree, and installs resources into Pi's standard `/home/pi/.pi/agent` paths. The prior whole-tree build is preserved for rollback at git tag `v0.1.0`, which still produces `localhost/openshell-environments/pi:0.1.0`.

Commit both source trees, then build deliberately tagged local images (the build command rejects dirty repositories so image labels and contents identify an exact revision). Source `pi-customizations` from a local checkout, directly from GitHub, or from its published release (pick exactly one):

```bash
bin/openshell-image build all --pi-source /path/to/pi-customizations
# or, with no local checkout at all:
bin/openshell-image build all --pi-ref main               # any tag, branch, or commit SHA
bin/openshell-image build all --pi-assets-version 0.1.0    # a published pi-assets release
bin/openshell-image refs
bin/openshell-image inspect pi
```

`--pi-ref` shallow-fetches the exact revision from `https://github.com/enriqTS/pi-customizations` into a throwaway directory before exporting; it never uses `main` implicitly unless you ask for it. `--pi-assets-version` instead downloads and checksum-verifies an already-built `pi-assets-<version>.tar.gz` GitHub Release published by `pi-customizations`' own CI — no clone, no running its scripts. Exactly one of the three may be given. `.github/workflows/release-images.yml` uses `--pi-assets-version` (via `clients/pi/pi-assets.version`) to build and publish `ghcr.io/enriqts/openshell-environments/{base,pi}:<version>` on a `v<semver>` tag; see [`pi-release-contracts.md`](docs/pi-release-contracts.md#image-publishing).

The resulting client reference is `localhost/openshell-environments/pi:0.2.0`. Launchers never build implicitly. To remove this version's images:

```bash
bin/openshell-image cleanup
```

The Pi adapter is installed and invoked from `pi-customizations`. For an explicit development checkout override:

```bash
export PI_OPENSHELL_ENVIRONMENTS_DIR=/path/to/openshell-environments
/path/to/pi-customizations/bin/pi-openshell
```

## Layout

- `base/Dockerfile` — shared development toolchain.
- `bin/openshell-workspace` — snapshot upload/download, Git safeguards, recovery, and client hooks.
- `bin/openshell-image` — explicit build, inspect, reference, and cleanup commands.
- `clients/pi/` — Pi image layer and minimum policy.
- `contracts/` — machine-readable Pi asset, host package, and release metadata contracts.
- `lib/pi-release-contract.mjs` — fail-closed contract validation shared with tests and future release tooling.
- `policies/base.yaml` — default shared filesystem and public HTTP/HTTPS policy.
- `docs/` — gateway operations, security model, release contracts, and client addition contract.

## Validation

```bash
npm test
bin/openshell-image build all --pi-source /path/to/pi-customizations
```

See [`docs/security-model.md`](docs/security-model.md) before adding permissions, [`docs/gateway.md`](docs/gateway.md) for local operation, and [`docs/pi-release-contracts.md`](docs/pi-release-contracts.md) for the portable distribution boundary. The contracts are defined now; no portable release is published yet.
