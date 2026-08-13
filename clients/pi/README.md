# Pi client

The image consumes only the sanitized `pi-assets` artifact that `pi-customizations`' exporter produces, defined in [`../../docs/pi-release-contracts.md`](../../docs/pi-release-contracts.md), via `bin/openshell-image`. Resources install into Pi's standard `/home/pi/.pi/agent` paths, which Pi auto-discovers without settings registration; `/opt/pi-customizations` retains only the asset manifest for audit, not the checkout. Pi-owned settings/session/provider behavior stays in `pi-customizations`. This directory owns only the client image composition and minimum sandbox policy.

Compatibility: image/client API `pi-customizations-api-1`; `openshell-environments` 0.2.0 pairs with `pi-customizations` launcher API 1 and Pi asset API 1.

`bin/openshell-image` can source `pi-customizations` from a local checkout (`--pi-source PATH`, an explicit development override) or fetch a pinned tag/branch/SHA directly from `github.com/enriqTS/pi-customizations` (`--pi-ref REF`), so building the image no longer requires a local sibling checkout. The prior whole-tree build remains available for rollback at git tag `v0.1.0`.

The separately installed host integration package and digest-pinned, published image through release compatibility metadata remain future work (Phases 4-5 of `../../PLAN.md`).
