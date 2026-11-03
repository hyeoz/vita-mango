// iOS 앱을 UIScene 생명주기로 띄운다.
//
// iOS 27 SDK(Xcode 27)로 빌드한 앱은 Info.plist에 UIApplicationSceneManifest가 없으면
// iOS 27에서 실행 즉시 종료된다("UIScene life cycle is required for apps built with this
// SDK", Apple TN3187). CI는 macos 러너의 latest-stable Xcode로 빌드하므로 이 조건에 걸린다.
//
// Expo 54에는 ExpoAppSceneDelegate가 없어서 SceneDelegate를 직접 둔다. React Native 시작
// 방식은 바꾸지 않는다: AppDelegate가 didFinishLaunching에서 만든 window(RN 루트 포함)를
// 씬이 연결될 때 그 씬에 붙인다. 씬 생명주기에서는 UIKit이 앱 델리게이트의 활성/백그라운드·
// openURL·userActivity·빠른 동작 메서드를 부르지 않으므로, SceneDelegate가 이를 앱
// 델리게이트로 다시 전달한다(ExpoAppDelegate가 subscriber와 RCTLinkingManager로 넘긴다).
//
// 앱 확장(Live Activity 위젯)은 별도 Info.plist를 쓰므로 여기서 건드리지 않는다.
const { withAppDelegate, withInfoPlist } = require("@expo/config-plugins");

const MARKER = "class SceneDelegate: UIResponder, UIWindowSceneDelegate";

const SCENE_DELEGATE = `
// MARK: - UIScene 생명주기 (plugins/withSceneLifecycle.js)

/// iOS 27 SDK가 요구하는 UIScene 진입점. AppDelegate가 만든 RN window를 씬에 붙이고,
/// 씬 이벤트를 앱 델리게이트로 전달한다.
${MARKER} {
  var window: UIWindow?

  private var appDelegate: AppDelegate? {
    UIApplication.shared.delegate as? AppDelegate
  }

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }

    let window: UIWindow
    if let existing = appDelegate?.window {
      window = existing
      window.windowScene = windowScene
      window.frame = windowScene.coordinateSpace.bounds
    } else {
      window = UIWindow(windowScene: windowScene)
      appDelegate?.window = window
    }
    window.makeKeyAndVisible()
    self.window = window

    // 콜드 스타트로 들어온 링크·활동·빠른 동작은 connectionOptions로 온다.
    connectionOptions.urlContexts.forEach { open($0) }
    connectionOptions.userActivities.forEach { continueActivity($0) }
    if let shortcutItem = connectionOptions.shortcutItem {
      appDelegate?.application(UIApplication.shared, performActionFor: shortcutItem) { _ in }
    }
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    window = nil
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    URLContexts.forEach { open($0) }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    continueActivity(userActivity)
  }

  func windowScene(
    _ windowScene: UIWindowScene,
    performActionFor shortcutItem: UIApplicationShortcutItem,
    completionHandler: @escaping (Bool) -> Void
  ) {
    guard let appDelegate else {
      completionHandler(false)
      return
    }
    appDelegate.application(UIApplication.shared, performActionFor: shortcutItem, completionHandler: completionHandler)
  }

  private func open(_ context: UIOpenURLContext) {
    var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    if let sourceApplication = context.options.sourceApplication {
      options[.sourceApplication] = sourceApplication
    }
    if let annotation = context.options.annotation {
      options[.annotation] = annotation
    }
    options[.openInPlace] = context.options.openInPlace
    _ = appDelegate?.application(UIApplication.shared, open: context.url, options: options)
  }

  private func continueActivity(_ userActivity: NSUserActivity) {
    _ = appDelegate?.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

// Expo 54 템플릿에서 SceneDelegate가 기대하는 부분. 다르면 조용히 넘어가지 않고 실패시킨다.
const REQUIRED_SNIPPETS = [
  "class AppDelegate: ExpoAppDelegate {",
  "var window: UIWindow?",
  "window = UIWindow(frame: UIScreen.main.bounds)",
  "factory.startReactNative(",
];

function patchAppDelegate(contents) {
  if (contents.includes(MARKER)) return contents;
  const missing = REQUIRED_SNIPPETS.filter((snippet) => !contents.includes(snippet));
  if (missing.length > 0) {
    throw new Error(
      `withSceneLifecycle: AppDelegate.swift 템플릿이 예상과 달라 UIScene 패치를 적용할 수 없습니다 (없음: ${missing.join(", ")})`
    );
  }
  return contents.replace(/\s*$/, "\n") + SCENE_DELEGATE;
}

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return cfg;
  });

  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== "swift") {
      throw new Error("withSceneLifecycle: Swift AppDelegate만 지원합니다.");
    }
    cfg.modResults.contents = patchAppDelegate(cfg.modResults.contents);
    return cfg;
  });
};
module.exports.patchAppDelegate = patchAppDelegate;
