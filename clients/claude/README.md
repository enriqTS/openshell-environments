# Claude Code client

A minimum OpenShell client for running the [Claude Code](https://www.npmjs.com/package/@anthropic-ai/claude-code) CLI in a sandbox: filesystem writes limited to the workdir and the `claude` user's home directory, general public web on ports 80/443 only (see `../../policies/base.yaml` and `../../docs/security-model.md`). Its general HTTPS rule uses an opaque L4 relay rather than REST/TLS interception because `platform.claude.com` rejects the intercepted login connection with HTTP 403. Unlike `clients/pi/`, this has no host-state synchronization or published image, but it uses the same credential principle: raw OAuth state stays outside the sandbox and an attached gateway provider supplies an opaque handle.

`/home/claude` (not just `/home/claude/.claude`) is read-write because Claude Code keeps some state directly at `$HOME/.claude.json`, not only under `$HOME/.claude/`.

## Build

```bash
bin/openshell-image build base
bin/openshell-image build claude
```

The resulting local image is `localhost/openshell-environments/claude:0.4.0`. Override it at launch with `CLAUDE_OPENSHELL_IMAGE=<full-versioned-reference>` when needed.

## Run

Install the checkout-backed command launcher once:

```bash
bin/install-openshell-client-launchers install
```

Generate a long-lived Claude setup token with the preserved host CLI, then store it in the gateway provider. The setup command prompts without echoing or writing the token to shell history:

```bash
claude-direct setup-token
bin/setup-openshell-client-auth claude
```

It imports `clients/claude/provider.yaml`, stores the token through the gateway credential store, and writes only the non-secret provider name to `${XDG_CONFIG_HOME:-$HOME/.config}/openshell-clients/claude.provider`. Re-run setup to update the token. If the provider was created with the wrong token or must be regenerated completely, use `bin/setup-openshell-client-auth claude --replace`. `CLAUDE_OPENSHELL_PROVIDER=none` explicitly returns to disposable interactive login.

Ensure `${XDG_BIN_HOME:-$HOME/.local/bin}` is on `PATH`, then run `claude [arguments...]` normally. The installed `claude` symlink invokes `bin/claude-openshell`, which uploads the current workspace, launches Claude with `HOME=/home/claude`, downloads changes, and removes the sandbox. It never builds or pulls implicitly. The installer refuses to overwrite an existing command; remove or rename that path explicitly before retrying.

If synchronization fails and a sandbox is retained, use `claude --openshell-recover SANDBOX` for a recovery shell or `claude --openshell-recover-download SANDBOX` to retry downloading it.
