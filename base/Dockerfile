# Tool images intentionally track their current releases. Pin them in a client
# branch when reproducible tool versions are required.
FROM hashicorp/terraform:latest AS terraform
FROM ghcr.io/astral-sh/uv:latest AS uv
FROM ghcr.io/astral-sh/ruff:latest AS ruff
FROM rust:latest AS rust
RUN rustup component add rustfmt clippy

# Keep the Node major and Debian release explicit while accepting rebuilt
# security updates within that release.
FROM node:24-trixie-slim

ARG OPENSHELL_ENVIRONMENTS_VERSION=dev
ARG OPENSHELL_ENVIRONMENTS_REVISION=unknown
LABEL org.opencontainers.image.title="OpenShell development base" \
      org.opencontainers.image.version="$OPENSHELL_ENVIRONMENTS_VERSION" \
      org.opencontainers.image.revision="$OPENSHELL_ENVIRONMENTS_REVISION"

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    build-essential \
    ca-certificates \
    fd-find \
    git \
    iproute2 \
    libssl-dev \
    openssh-client \
    pkg-config \
    python3 \
    python3-venv \
    ripgrep \
    rsync \
  && rm -rf /var/lib/apt/lists/*

COPY --from=terraform /bin/terraform /usr/local/bin/terraform
COPY --from=uv /uv /uvx /usr/local/bin/
COPY --from=ruff /ruff /usr/local/bin/ruff
COPY --from=rust /usr/local/cargo /usr/local/cargo
COPY --from=rust /usr/local/rustup /usr/local/rustup
RUN corepack enable

ENV CARGO_HOME=/tmp/cargo \
  RUSTUP_HOME=/usr/local/rustup \
  COREPACK_HOME=/tmp/corepack \
  npm_config_cache=/tmp/npm-cache \
  UV_CACHE_DIR=/tmp/uv-cache \
  PATH=/usr/local/cargo/bin:/tmp/cargo/bin:${PATH}
WORKDIR /workspace
