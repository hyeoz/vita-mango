fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Local build → upload to TestFlight with release notes

### ios production

```sh
[bundle exec] fastlane ios production
```

One command after initial ASC app creation: local archive → upload → submit for App Review

### ios submit

```sh
[bundle exec] fastlane ios submit
```

Submit the already-uploaded current iOS build for App Review

### ios screenshots

```sh
[bundle exec] fastlane ios screenshots
```

Replace App Store screenshots and resubmit the same build for review

### ios resubmit

```sh
[bundle exec] fastlane ios resubmit
```

Resubmit the current iOS build without modifying screenshots

### ios upload

```sh
[bundle exec] fastlane ios upload
```

Upload the already-built .ipa to TestFlight (no rebuild)

----


## Android

### android bundle

```sh
[bundle exec] fastlane android bundle
```

Build a signed Play-ready Android App Bundle without uploading it

### android beta

```sh
[bundle exec] fastlane android beta
```

Local build → upload to Play internal track with release notes

### android production

```sh
[bundle exec] fastlane android production
```

One command: local Android bundle → upload to Play production

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
