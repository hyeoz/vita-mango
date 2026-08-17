#!/usr/bin/env bash

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# asc.sh sources app/.env, but this wrapper does not. Pick up ASC_APP_ID from
# there so the bundle-id lookup can be skipped when the app record is known.
if [[ -z "${ASC_APP_ID:-}" && -f "${APP_DIR}/.env" ]]; then
  ASC_APP_ID="$(sed -n 's/^ASC_APP_ID=//p' "${APP_DIR}/.env" | tail -n 1)"
fi
NODE_BIN="/opt/homebrew/bin/node"
if [[ ! -x "${NODE_BIN}" ]]; then
  NODE_BIN="$(command -v node)"
fi
VERSION="$(${NODE_BIN} -p "require('${APP_DIR}/app.json').expo.version")"
EXPECTED_BUILD="$(${NODE_BIN} -p "require('${APP_DIR}/app.json').expo.ios.buildNumber")"
BUNDLE_ID="$(${NODE_BIN} -p "require('${APP_DIR}/app.json').expo.ios.bundleIdentifier")"

if [[ $# -gt 0 ]]; then
  IPA_PATH="$1"
elif [[ -f "${APP_DIR}/build/vita-mango.ipa" ]]; then
  IPA_PATH="${APP_DIR}/build/vita-mango.ipa"
else
  IPA_PATH="${APP_DIR}/build/app.ipa"
fi

if [[ ! -f "${IPA_PATH}" ]]; then
  echo "IPA not found. Build it first with: yarn build:ios-prod" >&2
  exit 1
fi

IPA_VERSION="$(unzip -p "${IPA_PATH}" 'Payload/*.app/Info.plist' | plutil -extract CFBundleShortVersionString raw -o - -)"
IPA_BUILD="$(unzip -p "${IPA_PATH}" 'Payload/*.app/Info.plist' | plutil -extract CFBundleVersion raw -o - -)"
if [[ "${IPA_VERSION}" != "${VERSION}" || "${IPA_BUILD}" != "${EXPECTED_BUILD}" ]]; then
  echo "IPA version/build does not match app.json (${VERSION} (${EXPECTED_BUILD})). Rebuild before publishing." >&2
  exit 1
fi

"${APP_DIR}/scripts/asc.sh" auth status --validate

APP_ID="${ASC_APP_ID:-}"
if [[ -z "${APP_ID}" ]]; then
  APP_ID="$(
    "${APP_DIR}/scripts/asc.sh" apps list --bundle-id "${BUNDLE_ID}" --output json |
      "${NODE_BIN}" -e '
        let input = "";
        process.stdin.on("data", chunk => { input += chunk; });
        process.stdin.on("end", () => {
          const apps = JSON.parse(input).data || [];
          if (apps.length === 1) process.stdout.write(apps[0].id);
        });
      '
  )"
fi
if [[ -z "${APP_ID}" ]]; then
  echo "No App Store Connect app exists for ${BUNDLE_ID}." >&2
  echo "Create it once in App Store Connect, then rerun this command." >&2
  exit 1
fi

"${APP_DIR}/scripts/asc.sh" validate --app "${APP_ID}" --version "${VERSION}"
"${APP_DIR}/scripts/asc.sh" publish appstore \
  --app "${APP_ID}" \
  --ipa "${IPA_PATH}" \
  --version "${VERSION}" \
  --submit \
  --confirm
