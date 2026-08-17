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

After the initial App Store Connect app is created: local archive → upload → submit for App Review

### ios upload

```sh
[bundle exec] fastlane ios upload
```

Upload the already-built .ipa to TestFlight (no rebuild)

----


## Android

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
