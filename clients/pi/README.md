# Pi client

The image consumes only the sanitized `pi-assets` artifact that `pi-customizations`' exporter produces, defined in [`../../docs/pi-release-contracts.md`](../../docs/pi-release-contracts.md), via `bin/openshell-image`. Resources install into Pi's standard `/home/pi/.pi/agent` paths, which Pi auto-discovers without settings registration; `/opt/pi-customizations` retains only the asset manifest for audit, not the checkout. Pi-owned settings/session/provider behavior stays in `pi-customizations`. This directory owns only the client image composition and minimum sandbox policy.

Compatibility: image/client API `pi-customizations-api-1`; `openshell-environments` 0.2.0 pairs with `pi-customizations` launcher API 1 and Pi asset API 1.

`bin/openshell-image` can source `pi-customizations` from a local checkout (`--pi-source PATH`, an explicit development override), a pinned tag/branch/SHA fetched directly from `github.com/enriqTS/pi-customizations` (`--pi-ref REF`, also a development override), or an already-published, checksum-verified `pi-assets` release (`--pi-assets-version VERSION`) — the last is what both local release builds and CI use, and never clones `pi-customizations` or runs its scripts. The prior whole-tree build remains available for rollback at git tag `v0.1.0`.

`.github/workflows/release-images.yml` publishes `ghcr.io/enriqTS/openshell-environments/pi:<version>` (and `base`) on a version tag, digest-pinned, SBOM/provenance-attested, and cosign-signed. The separately installed host integration package and digest-pinned compatibility metadata tying it to a specific image remain future work (Phase 5 of `../../PLAN.md`).
