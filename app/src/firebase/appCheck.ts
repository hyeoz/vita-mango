import appCheck from "@react-native-firebase/app-check";

// Firebase App Check attests that requests come from a genuine build of THIS
// app, so the backend can reject calls from scripts/scrapers hitting the AI
// endpoints directly. In dev we use the debug provider (register the printed
// debug token in Firebase Console → App Check); release builds use the real
// device-attestation providers.
let initPromise: Promise<void> | null = null;

export function initAppCheck(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
      provider.configure({
        android: { provider: __DEV__ ? "debug" : "playIntegrity" },
        apple: { provider: __DEV__ ? "debug" : "appAttest" },
      });
      await appCheck().initializeAppCheck({
        provider,
        isTokenAutoRefreshEnabled: true,
      });
    })().catch((e) => {
      console.warn("[appcheck] init failed", e);
      initPromise = null; // allow a later retry
    });
  }
  return initPromise;
}

// Returns a fresh App Check token to attach to backend requests, or null if
// App Check isn't ready (backend then decides whether to allow it).
export async function getAppCheckToken(): Promise<string | null> {
  try {
    await initAppCheck();
    const { token } = await appCheck().getToken();
    return token || null;
  } catch (e) {
    console.warn("[appcheck] getToken failed", e);
    return null;
  }
}
