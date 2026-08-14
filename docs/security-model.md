# Security model

OpenShell sandboxes receive snapshots, not host bind mounts. The launcher uploads only the current workspace (with normal ignore filtering) and a separately checked ordinary `.git` directory. It downloads changes on exit, prunes sandbox Git-ignored artifacts first, and retains the sandbox after any synchronization failure.

## Shared defaults

- Filesystem writes are limited to the workdir, `/tmp`, and `/dev/null`; each client adds only its own state path.
- General egress permits ports 80/443 only to explicitly listed public IPv4 and global-unicast IPv6 ranges. Private, loopback, link-local, special-use, and non-web destinations remain denied.
- Git metadata is rejected when it can escape the repository or execute/forward credentials: linked worktrees, alternates, symlinks, helpers, headers, includes, URL rewrites, proxy/SSH commands, executable remote helpers, and credential-bearing URLs.
- Ignored host files are neither uploaded nor replaced. Tracked deletions and `.git` history are synchronized.
- A full, versioned image reference is mandatory. Normal launch does not build or silently select a community image. An explicit exact vendor update runs on the host, rebuilds the local image at the resolved CLI version, and records that full local reference for later launches.

## Client boundary

Each client has a distinct image layer, policy, credential profile, state synchronization hook, tests, and threat model. Never grant a client the union of another client's permissions. The Pi hook remains in `pi-customizations`; it transfers sanitized preferences and only current-project sessions. Raw OAuth state, SSH keys, host configuration, and other projects' sessions are not transferred.

Provider credential substitution is gateway-owned and must match both endpoint and requesting binary. General web authorization does not broaden a provider's credential-routing profile. Claude/Codex persistence follows this boundary: host setup submits credentials to gateway storage, XDG activation files contain only provider names, and Codex's ephemeral `auth.json` contains only gateway-issued opaque handles. Never replace this with host auth-file upload or workspace synchronization. Codex trusts only the canonical repository/workspace root the user explicitly selected by invoking its launcher; its generated mode-0600 config does not merge host or project-local Codex configuration.

## Operational constraints

Do not modify a host checkout or the same client's project sessions while its sandbox is active: a later snapshot download may overwrite concurrent work. A failed download prints the retained sandbox name. Recover from the original project/subdirectory so paths map identically.

Treat the Docker socket and gateway state as privileged. Do not upload secrets in a workspace merely because provider handles are isolated.
