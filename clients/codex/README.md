# Codex client

A minimum OpenShell client for running the [Codex](https://www.npmjs.com/package/@openai/codex) CLI in a sandbox: filesystem writes limited to the workdir and the `codex` user's home directory, general public web on ports 80/443 only (see `../../policies/base.yaml` and `../../docs/security-model.md`). Interactive OAuth/device-auth HTTPS uses an opaque L4 relay; provider-specific L7 rules can still be layered by OpenShell. Unlike `clients/pi/`, this is deliberately lightweight — no credential-provider hooks, no host-state synchronization, no published image. Log in interactively each time you use a new sandbox; nothing under `/home/codex` survives sandbox deletion. The launcher deliberately does not copy a host `OPENAI_API_KEY` into the sandbox.

## Build

```bash
bin/openshell-image build base
bin/openshell-image build codex
```

The resulting local image is `localhost/openshell-environments/codex:0.3.0`. Override it at launch with `CODEX_OPENSHELL_IMAGE=<full-versioned-reference>` when needed.

## Run

Install the checkout-backed command launcher once:

```bash
bin/install-openshell-client-launchers install
```

Ensure `${XDG_BIN_HOME:-$HOME/.local/bin}` is on `PATH`, then run `codex [arguments...]` normally. The installed `codex` symlink invokes `bin/codex-openshell`, which uploads the current workspace, launches Codex with `HOME=/home/codex`, downloads changes, and removes the sandbox. It never builds or pulls implicitly. The installer refuses to overwrite an existing command; remove or rename that path explicitly before retrying.

If synchronization fails and a sandbox is retained, use `codex --openshell-recover SANDBOX` for a recovery shell or `codex --openshell-recover-download SANDBOX` to retry downloading it.

Codex may warn that system `bubblewrap` is absent and that it is using its bundled copy. OpenShell remains the outer enforced sandbox; do not weaken its policy to enable nested sandboxing. Treat the warning as informational unless Codex subsequently reports that the bundled fallback failed.
