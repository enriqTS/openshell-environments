# Claude Code client

A minimum OpenShell client for running the [Claude Code](https://www.npmjs.com/package/@anthropic-ai/claude-code) CLI in a sandbox: filesystem writes limited to the workdir and the `claude` user's home directory, general public web on ports 80/443 only (see `../../policies/base.yaml` and `../../docs/security-model.md`). Unlike `clients/pi/`, this is deliberately lightweight — no credential-provider hooks, no host-state synchronization, no published image. Log in interactively each time you use a new sandbox; nothing under `/home/claude` survives sandbox deletion. The launcher deliberately does not copy a host `ANTHROPIC_API_KEY` into the sandbox.

`/home/claude` (not just `/home/claude/.claude`) is read-write because Claude Code keeps some state directly at `$HOME/.claude.json`, not only under `$HOME/.claude/`.

## Build

```bash
bin/openshell-image build base
bin/openshell-image build claude
```

The resulting local image is `localhost/openshell-environments/claude:0.3.0`. Override it at launch with `CLAUDE_OPENSHELL_IMAGE=<full-versioned-reference>` when needed.

## Run

Install the checkout-backed command launcher once:

```bash
bin/install-openshell-client-launchers install
```

Ensure `${XDG_BIN_HOME:-$HOME/.local/bin}` is on `PATH`, then run `claude [arguments...]` normally. The installed `claude` symlink invokes `bin/claude-openshell`, which uploads the current workspace, launches Claude with `HOME=/home/claude`, downloads changes, and removes the sandbox. It never builds or pulls implicitly. The installer refuses to overwrite an existing command; remove or rename that path explicitly before retrying.

If synchronization fails and a sandbox is retained, use `claude --openshell-recover SANDBOX` for a recovery shell or `claude --openshell-recover-download SANDBOX` to retry downloading it.
