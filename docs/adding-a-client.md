# Adding a client

1. Define the client's threat model, state directories, endpoints, binaries, and credential source.
2. Add `clients/<name>/Dockerfile` on the shared base. Do not copy another client's baked assets or profile.
3. Add a minimum client policy. Preserve shared public-web restrictions; add only required filesystem paths and network rules.
4. Keep credential provider/profile, configuration sanitizer, state synchronization, and entrypoint client-specific.
5. Implement launcher API 1's executable hook phases:
   - `prepare SANDBOX HOST_WORKDIR SANDBOX_WORKDIR CONTEXT` — create temporary sanitized state.
   - `upload ...` — upload only that state after sandbox creation.
   - `download ...` — merge selected client state before workspace synchronization.
   - `exec-env ...` — print one non-secret `KEY=VALUE` per line.
6. Invoke `bin/openshell-workspace` from a thin client adapter with a full versioned image, client policy/hook, initial command, recovery command, and clear build hint.
7. Add positive and negative tests for image tools, filesystem access, network destinations/ports, credential binary+endpoint matching, state isolation, synchronization failure, and recovery.
8. Increment `API_VERSION` only for incompatible hook/launcher changes. Publish a repository version and record client compatibility before cutover.
9. For a portable client, define sanitized image assets, a minimal host integration package, immutable image metadata, checksums, and provenance. Pi's concrete contract is documented in [`pi-release-contracts.md`](pi-release-contracts.md).

Do not put secrets in hook output or `--exec-env`; use a dedicated gateway provider. Do not weaken the base to accommodate one client. OpenShell, not Docker Compose, owns sandbox client containers. Release launchers must fail closed rather than discovering source checkouts, accepting mutable image references, or building implicitly.
