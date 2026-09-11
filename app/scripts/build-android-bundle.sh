#!/usr/bin/env bash

set -euo pipefail

export PATH="/opt/homebrew/opt/ruby/bin:/opt/homebrew/bin:${PATH}"

if [[ -d /opt/homebrew/opt/node@22/bin ]]; then
  export PATH="/opt/homebrew/opt/node@22/bin:${PATH}"
elif [[ -d /opt/homebrew/opt/node@20/bin ]]; then
  export PATH="/opt/homebrew/opt/node@20/bin:${PATH}"
fi

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:${PATH}"

KEYCHAIN_SERVICE="com.vitamango.app.upload-keystore"
KEYCHAIN_ACCOUNT="vitamango-release"
export VM_ANDROID_KEYSTORE_PATH="${VM_ANDROID_KEYSTORE_PATH:-$PWD/secrets/vita-mango-upload.jks}"
export VM_ANDROID_KEY_ALIAS="${VM_ANDROID_KEY_ALIAS:-vitamango-upload}"
export VM_ANDROID_KEYSTORE_PASSWORD="${VM_ANDROID_KEYSTORE_PASSWORD:-$(security find-generic-password -w -s "$KEYCHAIN_SERVICE" -a "$KEYCHAIN_ACCOUNT")}"
export VM_ANDROID_KEY_PASSWORD="${VM_ANDROID_KEY_PASSWORD:-$VM_ANDROID_KEYSTORE_PASSWORD}"

node -e 'const major=Number(process.versions.node.split(".")[0]); if (major < 20) { throw new Error("Node 20+ is required") }'
bundle check
bundle exec fastlane android bundle
