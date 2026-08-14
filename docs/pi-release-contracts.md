# Pi release contracts

`pi-customizations` publishes the generic `pi-assets` archive. It contains only `APPEND_SYSTEM.md`, `agents/`, `extensions/`, `skills/`, and `themes/`, plus generic manifest metadata. It must not contain image helpers, launchers, settings, sessions, credentials, provider profiles, or OpenShell paths.

`openshell-environments` downloads the version pinned in `clients/pi/pi-assets.version`, verifies `SHA256SUMS` (and provenance in CI), and installs those resources into Pi's standard agent directory. The local `clients/pi/pi-openshell-entrypoint` and `patch-pi-codex` are OpenShell-owned image implementation.

This repository also produces `pi-openshell-<version>.tar.gz`. Its manifest follows `contracts/pi-host-integration.schema.json`; it contains the launcher, hook, settings/session/provider helpers, public provider profile, and `compatibility.json`. The package is installed atomically below `${XDG_DATA_HOME:-$HOME/.local/share}/pi-openshell/<version>` and activates only its own `pi` symlink.

`compatibility.json` follows `contracts/pi-release.schema.json` and binds the host package to a versioned, digest-pinned Pi image and the checksum/revision of the generic assets archive. The package may not require either source checkout at runtime.

API version 1 remains the launcher/hook contract (`prepare`, `upload`, `download`, `exec-env`). Raw credentials never belong in archives or hook output; gateway provider substitution remains the credential boundary.
