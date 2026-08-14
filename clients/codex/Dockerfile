ARG BASE_IMAGE=localhost/openshell-environments/base:0.4.0
FROM ${BASE_IMAGE}

ARG CODEX_CLI_VERSION=latest
RUN npm install -g --ignore-scripts "@openai/codex@$CODEX_CLI_VERSION" \
  && useradd --create-home --shell /bin/bash codex \
  && mkdir -p /workspace \
  && chown codex:codex /workspace \
  && rm -rf /root/.npm /root/.cache

# OpenShell always execs into the sandbox with HOME=/workspace, regardless of
# this image's ENV, so callers must pass --env HOME=/home/codex on
# `sandbox create`/`sandbox exec` (see clients/codex/README.md). This ENV
# only affects plain `docker run` outside OpenShell.
COPY --chmod=0755 codex-openshell-entrypoint /usr/local/bin/codex-openshell-entrypoint

ENV HOME=/home/codex
WORKDIR /workspace
USER codex

ARG OPENSHELL_ENVIRONMENTS_VERSION=dev
ARG OPENSHELL_ENVIRONMENTS_REVISION=unknown
LABEL org.opencontainers.image.title="Codex client for OpenShell" \
      org.opencontainers.image.version="$OPENSHELL_ENVIRONMENTS_VERSION" \
      org.opencontainers.image.revision="$OPENSHELL_ENVIRONMENTS_REVISION" \
      io.openshell.client="codex" \
      io.openshell.client-auth="provider-v2" \
      io.openshell.cli.version="$CODEX_CLI_VERSION"
