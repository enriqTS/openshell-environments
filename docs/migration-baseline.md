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

A live paid Codex request and destructive failure/concurrency scenarios were not re-run during baseline capture. They remain cutover acceptance checks and must use a disposable project.
