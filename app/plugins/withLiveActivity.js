const fs = require('fs');
const path = require('path');
const { withInfoPlist, withXcodeProject, IOSConfig } = require('@expo/config-plugins');
const extensionName = 'VMIntakeWidget';

function configureProject(project, iosRoot, projectName, config) {
  const sourceRoot = path.join(__dirname, '../native/live-activity');
  const folder = 'VMLiveActivity';
  fs.mkdirSync(path.join(iosRoot, folder), { recursive: true });
  const files = fs.readdirSync(sourceRoot).filter(f => /\.(swift|m)$/.test(f));
  for (const file of files) {
    const source = fs.readFileSync(path.join(sourceRoot, file));
    const destination = path.join(iosRoot, folder, file);
    if (!fs.existsSync(destination) || !source.equals(fs.readFileSync(destination))) fs.writeFileSync(destination, source);
  }
  const appFiles = ['VMIntakeModels.swift', 'VMIntakeActivity.swift', 'VMLiveActivityModule.swift', 'VMLiveActivityBridge.m'];
  for (const file of appFiles) {
    const filepath = `${folder}/${file}`;
    if (!project.hasFile(filepath)) IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath, groupName: projectName, project });
  }
  let target = Object.entries(project.pbxNativeTargetSection()).find(([key, value]) =>
    !key.endsWith('_comment') && String(value.name).replaceAll('"', '') === extensionName);
  if (!target) {
    const added = project.addTarget(extensionName, 'app_extension', folder, `${config.ios.bundleIdentifier}.intake`);
    target = [added.uuid, added.pbxNativeTarget];
    project.addBuildPhase(['VMIntakeModels.swift', 'VMIntakeActivity.swift', 'VMIntakeWidget.swift'].map(f => `${folder}/${f}`),
      'PBXSourcesBuildPhase', 'Sources', added.uuid);
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', added.uuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', added.uuid);
  }
  const list = project.pbxXCConfigurationList()[target[1].buildConfigurationList];
  const first = project.getFirstTarget().firstTarget;
  const appList = project.pbxXCConfigurationList()[first.buildConfigurationList];
  for (const { value } of list.buildConfigurations) {
    const build = project.pbxXCBuildConfigurationSection()[value];
    const appBuild = project.pbxXCBuildConfigurationSection()[appList.buildConfigurations.find(c => c.comment === build.name)?.value || appList.buildConfigurations[0].value];
    Object.assign(build.buildSettings, {
      INFOPLIST_FILE: '"VMLiveActivity/Info.plist"',
      PRODUCT_BUNDLE_IDENTIFIER: `"${config.ios.bundleIdentifier}.intake"`,
      PRODUCT_NAME: '"$(TARGET_NAME)"', SWIFT_VERSION: '5.0',
      SWIFT_ACTIVE_COMPILATION_CONDITIONS: '"$(inherited) WIDGET_EXTENSION"',
      IPHONEOS_DEPLOYMENT_TARGET: '17.0', TARGETED_DEVICE_FAMILY: '"1,2"',
      APPLICATION_EXTENSION_API_ONLY: 'YES', SKIP_INSTALL: 'YES',
      CODE_SIGN_STYLE: 'Automatic', GENERATE_INFOPLIST_FILE: 'NO',
      CURRENT_PROJECT_VERSION: `"${config.ios.buildNumber || '1'}"`,
      MARKETING_VERSION: `"${config.version}"`,
      ...(appBuild.buildSettings.DEVELOPMENT_TEAM ? { DEVELOPMENT_TEAM: appBuild.buildSettings.DEVELOPMENT_TEAM } : {}),
    });
  }
  // Embed before React Native's script phase; prevents the usual extension copy cycle.
  const copy = first.buildPhases.find(p => p.comment === 'Copy Files');
  if (copy) first.buildPhases = [copy, ...first.buildPhases.filter(p => p !== copy)];
  fs.writeFileSync(path.join(iosRoot, folder, 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleDisplayName</key><string>Vita Mango</string>
<key>CFBundleIdentifier</key><string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
<key>CFBundleExecutable</key><string>$(EXECUTABLE_NAME)</string>
<key>CFBundleName</key><string>$(PRODUCT_NAME)</string>
<key>CFBundlePackageType</key><string>XPC!</string>
<key>CFBundleShortVersionString</key><string>$(MARKETING_VERSION)</string>
<key>CFBundleVersion</key><string>$(CURRENT_PROJECT_VERSION)</string>
<key>NSExtension</key><dict><key>NSExtensionPointIdentifier</key><string>com.apple.widgetkit-extension</string></dict>
</dict></plist>`);
  return project;
}

module.exports = function withLiveActivity(config) {
  config = withInfoPlist(config, cfg => { cfg.modResults.NSSupportsLiveActivities = true; return cfg; });
  return withXcodeProject(config, cfg => {
    configureProject(cfg.modResults, cfg.modRequest.platformProjectRoot, cfg.modRequest.projectName, cfg);
    return cfg;
  });
};
module.exports.configureProject = configureProject;
