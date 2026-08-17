#!/usr/bin/env bash

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "${APP_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${APP_DIR}/.env"
  set +a
fi

ASC_BIN="${APP_DIR}/bin/asc"
if [[ ! -x "${ASC_BIN}" ]]; then
  ASC_BIN="$(command -v asc || true)"
fi
if [[ -z "${ASC_BIN}" ]]; then
  echo "asc is not installed. Run: yarn asc:install" >&2
  exit 1
fi

: "${ASC_KEY_ID:?ASC_KEY_ID is required}"
: "${ASC_ISSUER_ID:?ASC_ISSUER_ID is required}"
: "${ASC_KEY_PATH:?ASC_KEY_PATH is required}"

if [[ "${ASC_KEY_PATH}" = /* && -f "${ASC_KEY_PATH}" ]]; then
  export ASC_PRIVATE_KEY_PATH="${ASC_KEY_PATH}"
elif [[ -f "${APP_DIR}/${ASC_KEY_PATH#./}" ]]; then
  export ASC_PRIVATE_KEY_PATH="${APP_DIR}/${ASC_KEY_PATH#./}"
elif [[ -f "${APP_DIR}/../${ASC_KEY_PATH#./}" ]]; then
  export ASC_PRIVATE_KEY_PATH="${APP_DIR}/../${ASC_KEY_PATH#./}"
else
  echo "ASC private key not found at ASC_KEY_PATH." >&2
  exit 1
fi
export ASC_BYPASS_KEYCHAIN=1
export ASC_STRICT_AUTH=true
export ASC_TELEMETRY_DISABLED=1

# app/.env also contains runtime and backend settings. Keep the App Store
# Connect subprocess scoped to only the credentials and options it needs.
unset APPLE_TEAM_ID
unset EXPO_PUBLIC_API_URL
unset EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
unset GEMINI_API_KEY
unset PLAY_JSON_KEY_PATH

exec "${ASC_BIN}" "$@"
