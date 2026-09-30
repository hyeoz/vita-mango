# 1.2.0 release — 2026-09-30

Both platforms use 1.2.0, following the user's corrected release instruction.

## iOS

- Version/build: **1.2.0 (27)**; app and `VMIntakeWidget` extension verified in the exported IPA.
- Archive source: `ade2b03` on `main` (subsequent changes were documentation only).
- IPA SHA-256: `69f7a88de7bf1dab1f6d182b31b01d8e72ee67a24a9a60ef450a19837f05c2ff`.
- App Store Connect build: `6bebc5ea-a689-48d1-89fa-b11f009f15d7`, processing **VALID**.
- TestFlight: **IN_BETA_TESTING**, membership in existing internal `tester` group verified.
- App Store version: `fd0991d4-9732-45e5-bd8e-c09d3b5e8b19`, **WAITING_FOR_REVIEW** after submission at 19:21 KST.
- Release type verified remotely: **AFTER_APPROVAL**. Public store rollout awaits Apple review.
- Five localized release notes and review instructions updated; existing store screenshots retained.
- Korean localization, Live Activity support flag, matching extension version and separate distribution profiles verified. Review-preview files excluded from the app bundle.

## Android

- Version/code: **1.2.0 (13)**, replacing the earlier 1.1.0 internal release.
- Build source: `3006876` on `main`; subsequent app change only fixed the iOS project-generation plugin.
- Signed AAB SHA-256: `8527b71af21f8a383217adb81214d302b70c4a7f23a4e01ac8f41c77a9b10a54`.
- Play Console: latest internal release **1.2.0 (13)**, **available to internal testers** at 19:16 KST. No Android production rollout.

## Validation

- TypeScript type check passed; Live Activity TypeScript and Swift recovery checks: 22 assertions passed; advertising workflow checks: 17 passed.
- Native app and widget simulator interactions were verified in the implementation task; signed iOS release archive/export and Android release bundle succeeded.
- Fixed CocoaPods project serialization by giving shared Swift source references separate PBXBuildFile objects for the app and widget. Idempotence and CocoaPods serialization checks passed before the successful archive.
- Physical-device Live Activity behavior remains a TestFlight verification item; no physical-device pass is claimed.
