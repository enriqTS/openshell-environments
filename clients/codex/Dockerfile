ARG BASE_IMAGE=localhost/openshell-environments/base:0.3.0
FROM ${BASE_IMAGE}

RUN npm install -g --ignore-scripts @openai/codex \
  && useradd --create-home --shell /bin/bash codex \
  && mkdir -p /workspace \
  && chown codex:codex /workspace \
  && rm -rf /root/.npm /root/.cache

# OpenShell always execs into the sandbox with HOME=/workspace, regardless of
# this image's ENV, so callers must pass --env HOME=/home/codex on
# `sandbox create`/`sandbox exec` (see clients/codex/README.md). This ENV
# only affects plain `docker run` outside OpenShell.
ENV HOME=/home/codex
WORKDIR /workspace
USER codex

ARG OPENSHELL_ENVIRONMENTS_VERSION=dev
ARG OPENSHELL_ENVIRONMENTS_REVISION=unknown
LABEL org.opencontainers.image.title="Codex client for OpenShell" \
      org.opencontainers.image.version="$OPENSHELL_ENVIRONMENTS_VERSION" \
      org.opencontainers.image.revision="$OPENSHELL_ENVIRONMENTS_REVISION" \
      io.openshell.client="codex"
