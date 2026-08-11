ARG BASE_IMAGE=localhost/openshell-environments/base:0.1.0
FROM ${BASE_IMAGE}

ARG OPENSHELL_ENVIRONMENTS_VERSION=dev
ARG OPENSHELL_ENVIRONMENTS_REVISION=unknown
ARG PI_CUSTOMIZATIONS_REVISION=unknown
LABEL org.opencontainers.image.title="Pi client for OpenShell" \
      org.opencontainers.image.version="$OPENSHELL_ENVIRONMENTS_VERSION" \
      org.opencontainers.image.revision="$OPENSHELL_ENVIRONMENTS_REVISION" \
      io.openshell.client="pi" \
      io.openshell.pi-customizations.revision="$PI_CUSTOMIZATIONS_REVISION" \
      io.openshell.compatibility="pi-customizations-api-1"

RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent \
  && useradd --create-home --shell /bin/bash pi

COPY pi-customizations /opt/pi-customizations
COPY pi-customizations/bin/pi-openshell-entrypoint /usr/local/bin/pi-openshell-entrypoint
RUN chmod 755 /usr/local/bin/pi-openshell-entrypoint \
  && node /opt/pi-customizations/bin/patch-pi-codex

RUN mkdir -p /home/pi/.pi/agent \
  && cp /opt/pi-customizations/APPEND_SYSTEM.md /home/pi/.pi/agent/APPEND_SYSTEM.md \
  && cp -a /opt/pi-customizations/agents /home/pi/.pi/agent/agents \
  && printf '%s\n' '{' \
    '  "extensions": ["/opt/pi-customizations/extensions"],' \
    '  "skills": ["/opt/pi-customizations/skills"],' \
    '  "themes": ["/opt/pi-customizations/themes"]' \
    '}' > /home/pi/.pi/agent/settings.json \
  && chown -R pi:pi /home/pi/.pi \
  && mkdir -p /workspace \
  && chown pi:pi /workspace

ENV HOME=/home/pi \
  PI_CODING_AGENT_DIR=/home/pi/.pi/agent
WORKDIR /workspace
USER pi
ENTRYPOINT ["/usr/local/bin/pi-openshell-entrypoint"]
