#!/usr/bin/env bash

set -euo pipefail

export PATH="/opt/homebrew/opt/ruby/bin:/opt/homebrew/bin:${PATH}"

node -e 'const major=Number(process.versions.node.split(".")[0]); if (major < 20) { throw new Error("Node 20+ is required") }'
bundle check
bundle exec fastlane android production
