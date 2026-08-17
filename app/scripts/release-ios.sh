#!/usr/bin/env bash

set -euo pipefail

# This Mac also has an older /usr/local Node and the system Ruby. Expo 54 needs
# modern JavaScript methods, and Gemfile.lock is resolved with Homebrew Ruby.
export PATH="/opt/homebrew/opt/ruby/bin:/opt/homebrew/bin:${PATH}"

node -e 'const major=Number(process.versions.node.split(".")[0]); if (major < 20) { throw new Error("Node 20+ is required") }'
bundle check
bundle exec fastlane ios production
