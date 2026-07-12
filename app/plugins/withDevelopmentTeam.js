// Expo config plugin — pins the iOS code-signing Development Team.
//
// `expo prebuild` regenerates the Xcode project on every run, wiping any team
// selected manually in Xcode. This sets DEVELOPMENT_TEAM on every build config
// so `expo run:ios --device` signs non-interactively.
//
// The team ID is read from the APPLE_TEAM_ID env var (put it in app/.env, which
// is git-ignored) — it is machine/developer-specific, so it must NOT be
// hard-coded here. If APPLE_TEAM_ID is unset, the plugin is a no-op and signing
// falls back to whatever Xcode/expo resolves.
const { withXcodeProject } = require("@expo/config-plugins");

module.exports = function withDevelopmentTeam(config) {
  const teamId = process.env.APPLE_TEAM_ID;
  if (!teamId) return config;

  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const buildConfigs = project.pbxXCBuildConfigurationSection();
    for (const key in buildConfigs) {
      const entry = buildConfigs[key];
      if (entry && typeof entry === "object" && entry.buildSettings) {
        entry.buildSettings.DEVELOPMENT_TEAM = teamId;
      }
    }
    return cfg;
  });
};
