# OpenShell environments

Reusable, client-isolated OpenShell development environments. This repository owns the shared toolchain image, workspace/Git lifecycle, general web policy, gateway guidance, and explicit image lifecycle. It does not own client credentials or state formats.

## Initial Pi integration

Compatibility: `pi-customizations` API 1 requires `openshell-environments` **0.1.0** (launcher API **1**).

Build deliberately tagged local images:

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
- `policies/base.yaml` — default shared filesystem and public HTTP/HTTPS policy.
- `docs/` — gateway operations, security model, and client addition contract.

## Validation

```bash
npm test
bin/openshell-image build all --pi-source /path/to/pi-customizations
```

See [`docs/security-model.md`](docs/security-model.md) before adding permissions and [`docs/gateway.md`](docs/gateway.md) for local operation.
