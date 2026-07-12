// Expo config plugin — fixes non-modular header errors from @react-native-firebase
// when building with `useFrameworks: "static"` on newer Xcode toolchains.
//
// RNFB's Obj-C framework targets `#import <React/RCTBridgeModule.h>` etc. Under
// static frameworks + strict Clang modules (Xcode 16/26), those imports are
// rejected with "must be imported from module ... before it is required".
// Allowing non-modular includes in these framework module targets resolves it.
// See https://github.com/expo/expo/issues/39607
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const INJECT = `
    installer.pods_project.targets.each do |target|
      if target.name.start_with?('RNFB')
        target.build_configurations.each do |config|
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
      end
    end`;

module.exports = function withFirebaseStaticFrameworkFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfile = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile"
      );
      let contents = fs.readFileSync(podfile, "utf8");
      if (
        !contents.includes(
          "CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"
        )
      ) {
        contents = contents.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|${INJECT}`
        );
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
