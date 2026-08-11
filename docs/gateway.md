# Local gateway operations

OpenShell's CLI does not include the gateway daemon. The local Docker gateway needs its supervisor binary, mTLS material, signing keys, persistent state, and access to the Docker socket. Follow the gateway release's official installation instructions; this repository intentionally does not pin gateway container `latest` to an unrelated client image release.

After startup, register and select it:

```bash
openshell gateway remove local 2>/dev/null || true
openshell gateway add https://127.0.0.1:8080 --local --name local
openshell gateway select local
openshell status
```

Operational checks:

```bash
docker logs -f openshell-gateway
openshell sandbox list
openshell provider list
```

The callback endpoint must be reachable from Docker sandbox networks, so a gateway published only on host loopback may not work. Restrict its published port with the host firewall. The Docker socket and persisted gateway credentials are privileged; ensure mounted directories and TLS keys are not readable by untrusted users.

The launcher defaults `OPENSHELL_GATEWAY=local`. Set that variable explicitly for another registered gateway. Compose may manage the gateway and expose image build commands, but must not start a redundant long-lived client container: OpenShell owns sandbox creation and policy enforcement.
