# Pi extraction baseline

Pre-migration source: `pi-customizations` commit `05d90d3`, tagged `pre-openshell-migration-20260811`.

Inventory boundary:

- Shared: base toolchain, public-web/filesystem defaults, workspace upload/download, ordinary Git metadata checks/synchronization, recovery lifecycle, gateway/security guidance, and image lifecycle.
- Pi-owned: resources, settings sanitizer, project-session path translation, Codex patch/profile/provider synchronization, entrypoint, and thin adapter.
- Repository-only: each repository's README, durable memory/plan, package metadata, and migration records.

Captured before extraction:

- `npm test`: 13/13 passed.
- `docker buildx build --pull --load -t localhost/pi-customizations:pre-migration .`: passed.
- OpenShell CLI: 0.0.102; Docker engine: 29.7.2.
- The existing policy tests confirmed public HTTP/HTTPS ranges and no port 22; image tests confirmed SSH client plus Terraform, uv, Ruff, Rust, Rustfmt, and Clippy sources; lifecycle tests confirmed retained-sandbox recovery and ignored-artifact pruning; settings/session tests confirmed project-scoped round trips.

Post-extraction cutover checks:

- Both 0.1.0 images built from committed sources and expose OCI source/compatibility labels.
- The Pi image exposes Pi 0.84.1, Terraform 1.15.8, uv 0.12.3, Ruff 0.16.2, Rust 1.97.1, Clippy, Rustfmt, SSH, and `fdfind`.
- Public HTTP and HTTPS requests succeeded after policy identity initialization; port 22 and writes outside Pi's allowed profile/workspace failed.
- A disposable Git project completed upload, `.git` transfer, `pi --version`, session download, ignored-artifact pruning, workspace download, and sandbox deletion.
- A live `openai-codex/gpt-5.6-sol` request through the `pi-codex` provider returned the requested `MIGRATION_OK`, without transferring host credentials.

Forced termination, failed-download retention, and concurrent-host-edit behavior are covered by lifecycle tests/documented recovery constraints; destructive live variants were not induced during cutover.
