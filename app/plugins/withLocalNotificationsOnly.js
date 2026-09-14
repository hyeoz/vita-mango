// 비타망고 schedules local reminders only; it has no push server or device
// tokens. expo-notifications adds the APNs entitlement unconditionally, which
// makes App Store signing require a push-enabled provisioning profile. Remove
// that entitlement after the notifications plugin has finished configuring the
// native project. Local notifications do not require it.
const fs = require("fs");
const path = require("path");
const {
  IOSConfig,
  withAppDelegate,
  withEntitlementsPlist,
  withXcodeProject,
} = require("@expo/config-plugins");
const { mergeContents } = require("@expo/config-plugins/build/utils/generateCode");

const ACTION_STORE_SOURCE = `#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

static NSString *const VMPendingTakenActionsKey = @"vm.pendingTakenNotificationActions";

@interface VMNotificationActionStore : NSObject <RCTBridgeModule>
@end

@implementation VMNotificationActionStore

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

RCT_REMAP_METHOD(consumePendingActions,
                 consumePendingActionsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSUserDefaults *defaults = NSUserDefaults.standardUserDefaults;
  NSArray *actions = [defaults arrayForKey:VMPendingTakenActionsKey] ?: @[];
  [defaults removeObjectForKey:VMPendingTakenActionsKey];
  resolve(actions);
}

@end
`;

const APP_DELEGATE_SUPPORT = `import EXNotifications
import UserNotifications

private let intakeCategoryIdentifier = "VM_INTAKE"
private let markTakenActionIdentifier = "VM_MARK_TAKEN"
private let pendingTakenActionsKey = "vm.pendingTakenNotificationActions"

private final class IntakeNotificationActionHandler: NotificationDelegate {
  func didReceive(
    _ response: UNNotificationResponse,
    completionHandler: @escaping () -> Void
  ) -> Bool {
    guard response.notification.request.content.categoryIdentifier == intakeCategoryIdentifier,
          response.actionIdentifier == markTakenActionIdentifier,
          let name = response.notification.request.content.userInfo["name"] as? String,
          !name.isEmpty else {
      return false
    }

    let notification = response.notification
    var action: [String: Any] = [
      "eventId": "\\(notification.request.identifier)|\\(notification.date.timeIntervalSince1970)",
      "name": name,
      "deliveredAt": notification.date.timeIntervalSince1970 * 1000,
    ]
    if let supplementId = notification.request.content.userInfo["supplementId"] as? String,
       !supplementId.isEmpty {
      action["supplementId"] = supplementId
    }

    let defaults = UserDefaults.standard
    var pending = defaults.array(forKey: pendingTakenActionsKey) as? [[String: Any]] ?? []
    let eventId = action["eventId"] as? String
    if !pending.contains(where: { $0["eventId"] as? String == eventId }) {
      pending.append(action)
      defaults.set(Array(pending.suffix(100)), forKey: pendingTakenActionsKey)
    }
    return true
  }
}

private let intakeActionHandler = IntakeNotificationActionHandler()

private func localizedMarkTakenTitle() -> String {
  switch Bundle.main.preferredLocalizations.first {
  case "en": return "Taken"
  case "ja": return "飲みました"
  case "fr": return "Pris"
  case "es": return "Tomado"
  default: return "먹었어요"
  }
}`;

const APP_DELEGATE_SETUP = `    let notificationCenterManager = NotificationCenterManager.shared
    notificationCenterManager.addDelegate(intakeActionHandler)

    let markTakenAction = UNNotificationAction(
      identifier: markTakenActionIdentifier,
      title: localizedMarkTakenTitle(),
      options: []
    )
    let intakeCategory = UNNotificationCategory(
      identifier: intakeCategoryIdentifier,
      actions: [markTakenAction],
      intentIdentifiers: [],
      options: []
    )
    let notificationCenter = UNUserNotificationCenter.current()
    notificationCenter.getNotificationCategories { existing in
      let updated = Set(existing.filter { $0.identifier != intakeCategoryIdentifier })
        .union([intakeCategory])
      notificationCenter.setNotificationCategories(updated)
    }`;

function withNotificationActionAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== "swift") {
      throw new Error("Vita Mango notification actions require a Swift AppDelegate");
    }

    let contents = mergeContents({
      src: cfg.modResults.contents,
      newSrc: APP_DELEGATE_SUPPORT,
      tag: "vita-mango-notification-action-support",
      anchor: /@UIApplicationMain/,
      offset: 0,
      comment: "//",
    }).contents;
    contents = mergeContents({
      src: contents,
      newSrc: APP_DELEGATE_SETUP,
      tag: "vita-mango-notification-action-setup",
      anchor: /let delegate = ReactNativeDelegate\(\)/,
      offset: 0,
      comment: "//",
    }).contents;
    cfg.modResults.contents = contents;
    return cfg;
  });
}

function withNotificationActionStore(config) {
  return withXcodeProject(config, (cfg) => {
    const projectName = cfg.modRequest.projectName;
    if (!projectName) throw new Error("Could not determine the iOS project name");

    const relativePath = `${projectName}/VMNotificationActionStore.m`;
    const absolutePath = path.join(cfg.modRequest.platformProjectRoot, relativePath);
    fs.writeFileSync(absolutePath, ACTION_STORE_SOURCE, "utf8");

    if (!cfg.modResults.hasFile(relativePath)) {
      cfg.modResults = IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: relativePath,
        groupName: projectName,
        project: cfg.modResults,
      });
    }
    return cfg;
  });
}

module.exports = function withLocalNotificationsOnly(config) {
  config = withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults["aps-environment"];
    return cfg;
  });
  config = withNotificationActionAppDelegate(config);
  config = withNotificationActionStore(config);
  return config;
};
