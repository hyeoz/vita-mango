#!/usr/bin/env bash

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${ASC_VERSION:-3.4.1}"
ASSET="asc_${VERSION}_macOS_arm64"
BASE_URL="https://github.com/rorkai/App-Store-Connect-CLI/releases/download/${VERSION}"
TMP_DIR="$(mktemp -d)"

curl -fsSL "${BASE_URL}/${ASSET}" -o "${TMP_DIR}/${ASSET}"
curl -fsSL "${BASE_URL}/asc_${VERSION}_checksums.txt" -o "${TMP_DIR}/checksums.txt"

EXPECTED="$(awk -v asset="${ASSET}" '$2 == asset || $2 == "*" asset { print $1 }' "${TMP_DIR}/checksums.txt")"
if [[ -z "${EXPECTED}" ]]; then
  echo "Checksum for ${ASSET} was not found." >&2
  exit 1
fi

ACTUAL="$(shasum -a 256 "${TMP_DIR}/${ASSET}" | awk '{print $1}')"
if [[ "${EXPECTED}" != "${ACTUAL}" ]]; then
  echo "Checksum verification failed for ${ASSET}." >&2
  exit 1
fi

mkdir -p "${APP_DIR}/bin"
install -m 755 "${TMP_DIR}/${ASSET}" "${APP_DIR}/bin/asc"
echo "Installed asc ${VERSION} to ${APP_DIR}/bin/asc"
