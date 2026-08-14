# OpenShell environments

Reusable, client-isolated OpenShell development environments. This repository owns the shared toolchain image, workspace/Git lifecycle, general web policy, gateway guidance, and explicit image lifecycle. It does not own client credentials or state formats.

## Pi integration

Pi OpenShell integration is owned here. `pi-customizations` is only the producer of a generic, published `pi-assets` resource archive; this repository downloads and checksum-verifies it, while image helpers, session/settings synchronization, provider routing, launchers, installer, and package release stay here.

Build explicitly from the pinned generic release (no checkout or exporter from `pi-customizations` is used):

```bash
bin/openshell-image build all --pi-assets-version "$(<clients/pi/pi-assets.version)"
```

After the next environment-owned host-package release, install it with:

```bash
curl -fsSL https://raw.githubusercontent.com/enriqTS/openshell-environments/main/bin/install-pi-openshell | bash -s -- install <version>
```

The installer activates `pi` atomically under XDG directories. Exact `pi update` runs the host updater; `pi update --models` runs inside the sandbox. Existing `pi-openshell-v0.2.0` remains the rollback chain during migration.

## Claude Code and Codex integration

Claude Code and Codex have lightweight, local-only OpenShell clients. Build them explicitly, then install command symlinks so typing `claude` or `codex` launches the matching sandbox automatically:

```bash
bin/openshell-image build base
bin/openshell-image build claude
bin/openshell-image build codex
bin/install-openshell-client-launchers install
```

`${XDG_BIN_HOME:-$HOME/.local/bin}` must precede native installations on `PATH`. The installer refuses to replace unrelated paths. Each launcher accepts a `direct` subcommand (`pi direct`, `claude direct`, or `codex direct`) which executes the native host CLI without OpenShell; updates record the exact native executable for this route. For Pi migration, it accepts only an existing packaged `${XDG_DATA_HOME:-$HOME/.local/share}/pi-openshell/<version>/bin/pi` symlink, records that launcher as the normal-command backend, and installs a checkout shim that intercepts only exact `pi update`; uninstall atomically restores the packaged Pi symlink. Use `bin/install-openshell-client-launchers uninstall` to remove only links owned by this checkout.

Update a vendor CLI and rebuild its local image with the normal command:

```bash
pi update
claude update
codex update

# Explicitly bypass OpenShell and run on the host
pi direct --version
claude direct --version
codex direct --version
```

Exact update commands run on the host, not in a sandbox. The shared updater temporarily removes the verified OpenShell command symlink, updates Pi and Codex in npm's configured global host installation, runs Claude's official installer (`claude.ai/install.sh`), reads the installed version, atomically restores the same launcher even on failure, and builds the image with that exact version. If npm's global prefix is protected (for example `/usr`), Pi/Codex updates invoke `sudo` and show the normal administrator password prompt. Other Pi forms such as `pi update --models` continue into the sandbox. The compatible Pi launcher in `pi-customizations` owns the `pi update` delegation.

If an update prints only vendor-installer output and not `updated … and rebuilt its OpenShell image`, the command resolved to a native vendor executable rather than the OpenShell launcher. Remove that vendor executable from `${XDG_BIN_HOME:-$HOME/.local/bin}` and rerun `bin/install-openshell-client-launchers install`; it deliberately refuses to overwrite an unrelated command.

These launchers reuse Pi's workspace/Git lifecycle and can retain authentication through gateway providers even though every successful sandbox is deleted. Configure them once after logging in with the preserved direct CLIs:

```bash
bin/setup-openshell-client-auth claude   # prompts for `claude direct setup-token` output
bin/setup-openshell-client-auth codex    # imports host ~/.codex/auth.json into gateway storage
```

The gateway injects only opaque credential handles. Codex materializes an ephemeral `auth.json` containing those handles; raw host OAuth files, API keys, and tokens are never copied into a sandbox. The gateway refreshes Codex's access token. Images are never built or pulled during launch. See [`clients/claude/README.md`](clients/claude/README.md) and [`clients/codex/README.md`](clients/codex/README.md).

## Layout

- `base/Dockerfile` — shared development toolchain.
- `bin/openshell-workspace` — snapshot upload/download, Git safeguards, recovery, and client hooks.
- `bin/openshell-image` — explicit build, inspect, reference, and cleanup commands.
- `clients/{pi,claude,codex}/` — isolated client image layers and minimum policies.
- `contracts/` — machine-readable Pi asset, host package, and release metadata contracts.
- `lib/pi-release-contract.mjs` — fail-closed contract validation shared with tests and future release tooling.
- `policies/base.yaml` — default shared filesystem and public HTTP/HTTPS policy.
- `docs/` — gateway operations, security model, release contracts, and client addition contract.

## Validation

```bash
npm test
bin/openshell-image build all --pi-assets-version "$(<clients/pi/pi-assets.version)"
```

See [`docs/security-model.md`](docs/security-model.md) before adding permissions, [`docs/gateway.md`](docs/gateway.md) for local operation, and [`docs/pi-release-contracts.md`](docs/pi-release-contracts.md) for the portable distribution boundary. The contracts are defined now; no portable release is published yet.
