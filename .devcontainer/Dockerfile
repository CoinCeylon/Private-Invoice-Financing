# syntax=docker/dockerfile:1

# Microsoft's Node 22 + TypeScript image, locked to a multi-platform digest.
# The selected image contains Node.js 22.23.5.
FROM mcr.microsoft.com/devcontainers/typescript-node:22-bookworm@sha256:1496646b51a0aef4e76367a6bd5607a2b2bfeadfdd92026b9f2ec691bc0d25d9

SHELL ["/bin/bash", "-o", "pipefail", "-c"]
USER root

ARG PNPM_VERSION=12.21.0
# Aiken release tags include the leading "v".
ARG AIKEN_VERSION=v1.1.24
# Compact compiler and CLI versions from Midnight's compatibility matrix.
ARG COMPACT_VERSION=0.36.1
ARG COMPACT_CLI_VERSION=0.5.1
ARG PYTHON_VERSION=3.12.16
# Copy this from the official Python 3.12.16 release files on python.org.
ARG PYTHON_SHA256=b5796915dc45ff745cfb4e990a7e7c93d6f546328a102ce31448d69ebc37575c
# Leave empty to install Bookworm's current tesseract-ocr (fixed by the pinned
# base image). To pin, set it to the "Candidate" from `apt-cache policy tesseract-ocr`.
ARG TESSERACT_APT_VERSION=

RUN : "${PNPM_VERSION:?Pass an exact PNPM_VERSION build argument}" \
    && : "${AIKEN_VERSION:?Pass an exact AIKEN_VERSION release tag, including v}" \
    && : "${COMPACT_VERSION:?Pass P4s exact Compact toolchain version}" \
    && : "${COMPACT_CLI_VERSION:?Pass the exact Compact CLI version}" \
    && [[ "${PNPM_VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] \
    && [[ "${AIKEN_VERSION}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] \
    && [[ "${COMPACT_VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] \
    && [[ "${COMPACT_CLI_VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]

# Debian Bookworm supplies a different Python minor version. Build the pinned
# Python 3.12 release separately, keeping the distribution's Python intact.
RUN TESSERACT_PKG="tesseract-ocr${TESSERACT_APT_VERSION:+=${TESSERACT_APT_VERSION}}" \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        curl \
        libbz2-dev \
        libffi-dev \
        libgdbm-dev \
        liblzma-dev \
        libncursesw5-dev \
        libreadline-dev \
        libsqlite3-dev \
        libssl-dev \
        "${TESSERACT_PKG}" \
        tesseract-ocr-eng \
        unzip \
        uuid-dev \
        xz-utils \
        zlib1g-dev \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Also adds `python` and `pip` commands, and gives the node user ownership of
# /opt/python so `pip install` works inside the dev container.
RUN curl --proto '=https' --tlsv1.2 -fLsS \
        "https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tar.xz" \
        -o /tmp/python.tar.xz \
    && printf '%s  %s\n' "${PYTHON_SHA256}" /tmp/python.tar.xz | sha256sum -c - \
    && tar -xJf /tmp/python.tar.xz -C /tmp \
    && cd "/tmp/Python-${PYTHON_VERSION}" \
    && ./configure --prefix=/opt/python --enable-shared --with-ensurepip=install \
    && make -j"$(nproc)" \
    && make install \
    && printf '%s\n' /opt/python/lib > /etc/ld.so.conf.d/python312.conf \
    && ldconfig \
    && ln -s /opt/python/bin/python3 /opt/python/bin/python \
    && ln -s /opt/python/bin/pip3 /opt/python/bin/pip \
    && chown -R node:node /opt/python \
    && /opt/python/bin/python --version \
    && /opt/python/bin/pip --version \
    && rm -rf /tmp/python.tar.xz "/tmp/Python-${PYTHON_VERSION}"

ENV PATH="/opt/python/bin:/home/node/.local/bin:/home/node/.aiken/bin:${PATH}" \
    COREPACK_HOME=/usr/local/share/corepack \
    COREPACK_DEFAULT_TO_LATEST=0 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    PNPM_VERSION=${PNPM_VERSION} \
    AIKEN_VERSION=${AIKEN_VERSION} \
    COMPACT_VERSION=${COMPACT_VERSION}

# Use one Corepack cache for root at build time and node in the dev container.
RUN mkdir -p "${COREPACK_HOME}" \
    && corepack enable \
    && corepack install --global "pnpm@${PNPM_VERSION}" \
    && chown -R node:node "${COREPACK_HOME}"

# Create the workspace folder owned by node (must match workspaceFolder in
# devcontainer.json).
RUN mkdir -p /workspaces/invoice-financing \
    && chown node:node /workspaces/invoice-financing

USER node
WORKDIR /home/node

# Official Aiken installer bootstraps aikup; install selects the exact release.
# Do not use `aikup --version <tag>`: --version prints aikup's own version.
RUN curl --proto '=https' --tlsv1.2 -LsSf https://install.aiken-lang.org | sh \
    && aikup install "${AIKEN_VERSION}" \
    && aiken --version

# Pin the Compact manager independently from P4's compiler/toolchain version.
RUN curl --proto '=https' --tlsv1.2 -LsSf \
        "https://github.com/midnightntwrk/compact/releases/download/compact-v${COMPACT_CLI_VERSION}/compact-installer.sh" | sh \
    && compact update "${COMPACT_VERSION}" \
    && compact --version \
    && compact compile --version

WORKDIR /workspaces/invoice-financing

EXPOSE 5173 4000 8000
CMD ["sleep", "infinity"]