# OpenShell environments

Reusable, client-isolated OpenShell development environments. This repository owns the shared toolchain image, workspace/Git lifecycle, general web policy, gateway guidance, and explicit image lifecycle. It does not own client credentials or state formats.

## Pi integration

Compatibility: `pi-customizations` API 1 requires `openshell-environments` **0.1.0** (launcher API **1**). This source-based workflow remains the rollback baseline while portable releases are implemented.

Commit both source trees, then build deliberately tagged local images (the build command rejects dirty repositories so image labels and contents identify an exact revision):

```bash
bin/openshell-image build all --pi-source /path/to/pi-customizations
bin/openshell-image refs
bin/openshell-image inspect pi
```

The resulting client reference is `localhost/openshell-environments/pi:0.1.0`. Launchers never build implicitly. To remove this version's images:

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
