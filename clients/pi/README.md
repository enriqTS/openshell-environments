# Pi client

The current 0.1.0 rollback baseline consumes a clean, committed `pi-customizations` tree through `bin/openshell-image`. Pi-owned settings/session/provider behavior stays in that repository. This directory owns only the client image composition and minimum sandbox policy.

Compatibility: image/client API `pi-customizations-api-1`; `openshell-environments` 0.1.0 pairs with `pi-customizations` launcher API 1.

Portable releases will consume only the sanitized asset artifact defined in [`../../docs/pi-release-contracts.md`](../../docs/pi-release-contracts.md), paired with a separately installed host integration package and digest-pinned image through release compatibility metadata. Until the exporter and published artifacts exist, source checkouts remain an explicit development path; release launchers must not discover them implicitly.
