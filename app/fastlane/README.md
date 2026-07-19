# Release with fastlane (local build, no EAS cloud)

Builds 비타망고 **on your Mac** (free — no EAS build minutes) and uploads to the
stores with release notes pulled from [`../release-notes.json`](../release-notes.json).

- `fastlane ios beta` → build .ipa, upload to **TestFlight**
- `fastlane android beta` → build .aab, upload to **Play internal track**

Each lane bumps the build number in `app.json`, runs `expo prebuild`, builds
locally, and uploads the binary + the localized changelog for the current
version (falling back to the generic `default` note).

## One-time setup

1. **Native toolchains**: Xcode (iOS) and JDK 17 + Android SDK (Android).
2. **Ruby + fastlane**:
   ```bash
   cd app
   gem install bundler
   bundle install          # installs fastlane from the Gemfile
   ```
   (Run lanes as `bundle exec fastlane …` to pin the version.)
3. **App Store Connect API key** (iOS) — App Store Connect → Users and Access →
   Integrations → App Store Connect API → generate a key, download the `.p8`.
4. **Play service account** (Android) — Play Console → API access → create a
   service account with the `.json` key, grant it release permissions.
5. Keep the keys **outside git** (e.g. `app/secrets/`, which is gitignored).

## Env vars the lanes read

```bash
# iOS (App Store Connect API key)
export ASC_KEY_ID="XXXXXXXXXX"
export ASC_ISSUER_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
export ASC_KEY_PATH="$PWD/secrets/AuthKey_XXXXXXXXXX.p8"

# Android (Play service account)
export PLAY_JSON_KEY_PATH="$PWD/secrets/play-service-account.json"
```

## Run

```bash
cd app
bundle exec fastlane ios beta       # → TestFlight
bundle exec fastlane android beta   # → Play internal track
```

Then promote to the public App Store / Play production track in the respective
console when you're happy with the build.

## Editing release notes

Edit [`../release-notes.json`](../release-notes.json). Add a block keyed by the
`app.json` version for version-specific notes, or just rely on `default` (the
generic "안정성 개선 및 버그 수정" note) for routine updates — it's always used
when there's no version-specific entry.

## First-run notes / things to verify

- The iOS **scheme** is auto-detected from the generated `.xcworkspace`
  (`expo prebuild` names it after the app). If `build_app` can't find the
  scheme, open `app/ios/*.xcworkspace` in Xcode once and mark the scheme
  "Shared".
- iOS signing: first run may prompt for signing setup — use `match` or let Xcode
  manage automatic signing with the `236GF8Y83H` team.
- The `.aab` path assumes the standard Gradle output
  (`android/app/build/outputs/bundle/release/app-release.aab`).
- App Store **production** release (not just TestFlight) needs the store listing
  filled in App Store Connect; TestFlight upload works without it.
