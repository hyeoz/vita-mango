#!/usr/bin/env bash

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="/opt/homebrew/bin:${PATH}"

BASE_IPA="${BASE_IPA:-${APP_DIR}/build/app.ipa}"
OUTPUT_IPA="${OUTPUT_IPA:-${APP_DIR}/build/vita-mango.ipa}"
PRIVATE_KEY="$(find "${APP_DIR}/build/certs" -maxdepth 1 -type f -name '*.p12' | head -n 1)"
CERTIFICATE="$(find "${APP_DIR}/build/certs" -maxdepth 1 -type f -name '*.cer' | head -n 1)"

if [[ ! -f "${BASE_IPA}" || -z "${PRIVATE_KEY}" || -z "${CERTIFICATE}" ]]; then
  echo "A previously signed base IPA and its cached certificate/private key are required." >&2
  exit 1
fi

BUNDLE_DIR="$(mktemp -d /private/tmp/vita-mango-bundle.XXXXXX)"
npx expo export:embed \
  --platform ios \
  --dev false \
  --bytecode \
  --bundle-output "${BUNDLE_DIR}/main.jsbundle" \
  --assets-dest "${BUNDLE_DIR}/assets" \
  --reset-cache

python3 "${APP_DIR}/scripts/resign_ios_ipa.py" \
  --base-ipa "${BASE_IPA}" \
  --bundle "${BUNDLE_DIR}/main.jsbundle" \
  --assets "${BUNDLE_DIR}/assets/assets" \
  --private-key "${PRIVATE_KEY}" \
  --certificate "${CERTIFICATE}" \
  --app-json "${APP_DIR}/app.json" \
  --output "${OUTPUT_IPA}"
