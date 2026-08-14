# Pi client

The image consumes only the generic, published `pi-assets` archive produced by `pi-customizations`, as defined in [`../../docs/pi-release-contracts.md`](../../docs/pi-release-contracts.md). The archive contains Pi resources only; this repository owns all OpenShell-specific image and host behavior.

Resources install into Pi's standard `/home/pi/.pi/agent` paths, which Pi auto-discovers without settings registration. `/opt/pi-assets` retains only the generic asset manifest for audit. The image entrypoint and Codex opaque-account-ID patch are reviewed local files in this directory, not asset archive members.

Build from the independently versioned asset release pinned in `pi-assets.version`:

```bash
bin/openshell-image build pi --pi-assets-version "$(<clients/pi/pi-assets.version)"
```

The build downloads and checksum-verifies the published archive; it never clones `pi-customizations` or invokes its exporter. `.github/workflows/release-images.yml` additionally verifies the producer's provenance attestation and publishes the signed, attested `ghcr.io/enriqts/openshell-environments/pi:<environment-version>` image.

The host launcher, synchronization hook, settings/session translators, provider integration, installer, exporter, and release workflow are under `clients/pi/host/`, `bin/`, and `.github/workflows/release-pi-openshell.yml` in this repository.
