# Android release handoff

Last verified: 2026-09-30

## Build identity

- Package: `com.vitamango.app`
- Play Console app ID: `4972105788129966297`
- Version: `1.2.0`
- Version code: `13`
- Minimum SDK: 24
- Compile / target SDK: 36 (Android 16)
- Output: `app/build/android/vita-mango.aab`
- Upload signing key: `app/secrets/vita-mango-upload.jks` (gitignored)
- Upload-key password: macOS Keychain service `com.vitamango.app.upload-keystore`, account `vitamango-release`

Build a signed bundle without uploading:

```bash
cd app
npm run build:android-bundle
```

Set the next `android.versionCode` and version in `app/app.json`, run `bundle exec fastlane android prepare_notes`, and commit the release changes to `main` first. The build command verifies the committed app source, regenerates the native Android project, signs the release with the upload key, and copies the result into `app/build/android/`. It does not increment versions during the build.

## Play Console answers

- App name: 비타망고
- Default language: Korean – ko-KR
- App or game: App
- Free or paid: Free
- Category: Health & Fitness
- Contact email: use the public support email already shown on the shared support page
- Privacy policy: `https://hyeoz.github.io/privacy/vitamango/`
- Contains ads: Yes
- App access: All functionality is available without an account or special access
- Target audience: Adults; do not target children
- News app: No
- Government app: No
- Financial features: None

### Data safety draft

The app's supplement list, questionnaire answers, wellness journal, reminders, and Jelly progress remain on the device and are not collected by the developer. The app has no account or backend.

Google Mobile Ads may collect or share the following for advertising, analytics, fraud prevention, security, and compliance. Confirm the final checkboxes against the Google Mobile Ads SDK disclosure shown by Play Console when submitting:

- Approximate location
- App interactions
- Diagnostics
- Device or other identifiers

Data is encrypted in transit. The health questionnaire and journal are not transmitted to AdMob or the developer. Users can delete all locally stored app data from My Jelly.

### Health apps declaration draft

- The app provides health features: Yes
- Health and fitness: Nutrition and Weight Management
- Medical device app: No
- The app provides general wellness information and supplement-routine reminders; it does not diagnose, prescribe, or claim to treat disease
- The in-app disclaimer and Evidence and Sources screen identify the informational purpose, supporting sources, risks, and the need to consult a qualified professional when appropriate

## Assets and listing

Fastlane-compatible Play metadata lives under `app/fastlane/metadata/android/`. The production lane uploads a **draft** release, including listing text and graphics; it never rolls the release out automatically.

This personal developer account requires a closed test with at least 12 opted-in testers for at least 14 continuous days before production access can be requested. The Play Console app record was created on 2026-09-11. Internal testing is active; version 1.1.0 (12) was confirmed available to internal testers on 2026-09-30 at 19:11 KST. Closed-test enrollment status was not checked during this release.

Before review submission, verify in Play Console:

- Store listing has app icon, 1024×500 feature graphic, and six opaque 1080×2160 Android phone screenshots
- Data safety and Health apps declarations match the final AAB
- Ads declaration is Yes and privacy URL opens publicly
- Content rating questionnaire is complete
- Countries/regions and pricing are selected
- Testers can complete onboarding without credentials
- The release remains draft until the installed Play build has been smoke-tested

## Key backup

The first Play upload establishes this upload key. Back up the `.jks` in a secure private location before publishing. Never commit the key or its password.

## Known dependency audit

`npm audit --omit=dev` currently reports 21 moderate/high findings through Expo CLI and Metro build-time dependencies. Expo Doctor passes all checks, and the signed release installs and runs normally. The available aggregate fix upgrades to Expo SDK 57, so do not run `npm audit fix --force` during this release; handle that SDK migration as a separate tested upgrade.

## 2026-09-30 internal release

- Source commit: `21046d0` on `main` (subsequent commits only updated release documentation).
- Signed AAB built successfully; JAR signature verification passed.
- SHA-256: `fd096e87d7308c71f5a8e558b6a98f077d3537eda76bdb87bd4ff12ebd1cf33d`.
- Play Console: internal track active, latest release `1.1.0 (12)`, available to internal testers. No production release was made.
- Play reported no newly unsupported devices. The only warning was the absence of an R8/ProGuard deobfuscation mapping file.
- Includes intake postcard sharing and the current consent-gated advertising flow. Live Activities are iOS-only.
- iOS release pending a replacement version number: App Store Connect already lists 1.1.0 (26) as READY_FOR_DISTRIBUTION. The new iOS build has not been uploaded or submitted.

## 2026-09-30 corrected 1.2.0 internal release

- Replaces the earlier 1.1.0 internal rollout following the explicit instruction to use 1.2.0 on both platforms.
- Source commit: `3006876`; signed build and JAR signature verification passed.
- SHA-256: `8527b71af21f8a383217adb81214d302b70c4a7f23a4e01ac8f41c77a9b10a54`.
- Play Console confirmed `1.2.0 (13)` as the active latest internal release, available to internal testers at 19:16 KST.
