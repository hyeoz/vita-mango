// 비타망고 schedules local reminders only; it has no push server or device
// tokens. expo-notifications adds the APNs entitlement unconditionally, which
// makes App Store signing require a push-enabled provisioning profile. Remove
// that entitlement after the notifications plugin has finished configuring the
// native project. Local notifications do not require it.
const { withEntitlementsPlist } = require("@expo/config-plugins");

module.exports = function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults["aps-environment"];
    return cfg;
  });
};
