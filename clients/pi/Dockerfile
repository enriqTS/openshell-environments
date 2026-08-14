ARG BASE_IMAGE=localhost/openshell-environments/base:0.4.0
FROM ${BASE_IMAGE}

ARG PI_CLI_VERSION=latest
RUN npm install -g --ignore-scripts "@earendil-works/pi-coding-agent@$PI_CLI_VERSION" \
  && useradd --create-home --shell /bin/bash pi \
  # This install runs as root and writes root-owned caches (npm_config_cache
  # etc. are already set by the base image); the runtime user is "pi", so a
  # cache baked into the image here would fail with EACCES on first use.
  && rm -rf /tmp/npm-cache /tmp/uv-cache /tmp/corepack /root/.npm /root/.cache

COPY pi-assets-*.tar.gz /tmp/pi-assets.tar.gz
COPY pi-openshell-entrypoint patch-pi-codex /build/
# OpenShell supplies Pi a restricted PATH when executing the entrypoint and can
# omit image ENV entirely. Restore the base toolchain environment before Pi
# starts so its child shell commands inherit it: without this, npm/uv/corepack
# fall back to their default caches under $HOME, which is read-only outside
# /home/pi/.pi/agent, and fail (e.g. "ENOENT: mkdir '/home/pi/.npm'").
RUN printf '%s\n' '#!/bin/sh' \
    'export PATH=/usr/local/cargo/bin:/tmp/cargo/bin:$PATH' \
    'export RUSTUP_HOME=/usr/local/rustup' \
    'export CARGO_HOME=/tmp/cargo' \
    'export npm_config_cache=/tmp/npm-cache' \
    'export COREPACK_HOME=/tmp/corepack' \
    'export UV_CACHE_DIR=/tmp/uv-cache' \
    'exec /usr/local/bin/pi-openshell-entrypoint "$@"' \
    > /usr/local/bin/pi-openshell-toolchain-entrypoint \
  && chmod 755 /usr/local/bin/pi-openshell-toolchain-entrypoint

# Install only the reviewed, allowlisted assets from the sanitized archive
# into Pi's standard resource paths, which Pi auto-discovers without settings
# registration. Keep just the manifest (not the checkout) for audit.
RUN mkdir -p /tmp/pi-assets /opt/pi-assets /home/pi/.pi/agent \
  && tar -xzf /tmp/pi-assets.tar.gz -C /tmp/pi-assets \
  && cp /tmp/pi-assets/manifest.json /opt/pi-assets/manifest.json \
  && cp /tmp/pi-assets/APPEND_SYSTEM.md /home/pi/.pi/agent/APPEND_SYSTEM.md \
  && cp -a /tmp/pi-assets/agents /home/pi/.pi/agent/agents \
  && cp -a /tmp/pi-assets/extensions /home/pi/.pi/agent/extensions \
  && cp -a /tmp/pi-assets/skills /home/pi/.pi/agent/skills \
  && cp -a /tmp/pi-assets/themes /home/pi/.pi/agent/themes \
  && install -m 0755 /build/pi-openshell-entrypoint /usr/local/bin/pi-openshell-entrypoint \
  && node /build/patch-pi-codex \
  && rm -rf /tmp/pi-assets /tmp/pi-assets.tar.gz \
  && chown -R pi:pi /home/pi/.pi \
  && mkdir -p /workspace \
  && chown pi:pi /workspace

ENV HOME=/home/pi \
  PI_CODING_AGENT_DIR=/home/pi/.pi/agent
WORKDIR /workspace
USER pi
ENTRYPOINT ["/usr/local/bin/pi-openshell-toolchain-entrypoint"]

ARG OPENSHELL_ENVIRONMENTS_VERSION=dev
ARG OPENSHELL_ENVIRONMENTS_REVISION=unknown
ARG PI_ASSETS_REVISION=unknown
ARG PI_ASSETS_VERSION=dev
LABEL org.opencontainers.image.title="Pi client for OpenShell" \
      org.opencontainers.image.version="$OPENSHELL_ENVIRONMENTS_VERSION" \
      org.opencontainers.image.revision="$OPENSHELL_ENVIRONMENTS_REVISION" \
      io.openshell.client="pi" \
      io.openshell.cli.version="$PI_CLI_VERSION" \
      io.openshell.pi-assets.source.revision="$PI_ASSETS_REVISION" \
      io.openshell.pi-assets.version="$PI_ASSETS_VERSION" \
      io.openshell.pi-assets.api="1" \
      io.openshell.compatibility="pi-assets-api-1"
