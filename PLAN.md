# Plan

Objective: extract and validate shared OpenShell infrastructure with the Pi client as the first isolated integration.

Approach:
1. Preserve the pre-migration behavior in the base/toolchain, Pi image layer, policy, workspace/Git lifecycle, and tests.
2. Build explicit versioned images and run lifecycle, image, policy, and Pi integration parity checks.
3. Document gateway operations, security boundaries, client addition, compatibility, upgrades, and rollback.

Status: complete — shared repository/API 1, Pi client extraction, explicit 0.1.0 image lifecycle, documentation, unit/lifecycle tests, image/tool checks, policy negatives, snapshot/session round trip, and live Codex provider request all passed. Tag `v0.1.0` is the Pi compatibility release.
