const { withAppBuildGradle } = require("@expo/config-plugins");

const RELEASE_SIGNING = `
        release {
            def keystorePath = System.getenv("VM_ANDROID_KEYSTORE_PATH")
            def keystorePassword = System.getenv("VM_ANDROID_KEYSTORE_PASSWORD")
            def keyAliasValue = System.getenv("VM_ANDROID_KEY_ALIAS")
            def keyPasswordValue = System.getenv("VM_ANDROID_KEY_PASSWORD")
            if (keystorePath && keystorePassword && keyAliasValue && keyPasswordValue) {
                storeFile file(keystorePath)
                storePassword keystorePassword
                keyAlias keyAliasValue
                keyPassword keyPasswordValue
            }
        }
`;

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== "groovy") {
      throw new Error("withAndroidReleaseSigning only supports Groovy build.gradle files");
    }

    let source = mod.modResults.contents;
    if (!source.includes("VM_ANDROID_KEYSTORE_PATH")) {
      const anchor = /(^\s*signingConfigs\s*\{[\s\S]*?^\s*debug\s*\{[\s\S]*?^\s*\}\s*$)/m;
      if (!anchor.test(source)) {
        throw new Error("Could not find Android signingConfigs.debug block");
      }
      source = source.replace(anchor, `$1${RELEASE_SIGNING}`);
    }

    const debugReleaseSigning = "signingConfig signingConfigs.debug";
    const signingIndex = source.lastIndexOf(debugReleaseSigning);
    if (signingIndex >= 0) {
      source =
        source.slice(0, signingIndex) +
        "signingConfig signingConfigs.release" +
        source.slice(signingIndex + debugReleaseSigning.length);
    } else if (!source.includes("signingConfig signingConfigs.release")) {
      throw new Error(`Could not replace ${debugReleaseSigning} for the release build`);
    }

    mod.modResults.contents = source;
    return mod;
  });
};
