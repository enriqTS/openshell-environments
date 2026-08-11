# Plan

Objective: extract and validate shared OpenShell infrastructure with the Pi client as the first isolated integration.

Approach:
1. Preserve the pre-migration behavior in the base/toolchain, Pi image layer, policy, workspace/Git lifecycle, and tests.
2. Build explicit versioned images and run lifecycle, image, policy, and Pi integration parity checks.
3. Document gateway operations, security boundaries, client addition, compatibility, upgrades, and rollback.

Status: in progress — initial shared repository and Pi client extraction created; parity validation and documentation remain.
