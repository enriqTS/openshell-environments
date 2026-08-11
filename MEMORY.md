# Memory

- This repository owns reusable OpenShell base images, workspace/Git lifecycle behavior, shared policies, gateway operations, and client isolation conventions.
- Client permissions remain separate. The initial Pi client consumes reviewed Pi-owned assets from `pi-customizations`; settings/session translation, OAuth compatibility, provider profile, resources, and the entrypoint remain owned there.
- API version 1 is the hook contract used by `openshell-workspace`: `prepare`, `upload`, `download`, and `exec-env` phases.
- Images use full local references under `localhost/openshell-environments` and explicit version tags. Launch never builds implicitly; `bin/openshell-image` owns deliberate build, inspection, and cleanup.
- The base intentionally tracks current Terraform, uv, Ruff, and Rust images; Node major 24 and Debian trixie are explicit. Pin tool images in a project branch when exact reproducibility is needed.
- General web policy allows only public global-unicast addresses on ports 80/443. Client provider profiles remain narrower and client-owned.
