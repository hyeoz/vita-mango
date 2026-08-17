import { API_URL } from "./config";
import { getAppCheckToken } from "../firebase/appCheck";
import auth from "@react-native-firebase/auth";

// Hard cap on how long an AI request may run before we give up. Without this a
// flaky/offline connection leaves the AI screen and onboarding spinner hanging
// forever with no way out but killing the app.
const DEFAULT_TIMEOUT_MS = 20_000;

// POST JSON to the backend with a timeout. Throws on timeout (AbortError),
// network error, or non-2xx response so callers can show an error/fallback.
export async function postJSON<T>(
  path: string,
  body: unknown,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Attest this is a genuine app build so the backend can reject direct/scripted
  // calls. Null if App Check isn't ready — the backend decides whether to allow.
  const appCheckToken = await getAppCheckToken();
  const idToken = await auth().currentUser?.getIdToken();
  if (!idToken) throw new Error("로그인이 필요한 기능이에요.");
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
        ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`${path} failed (${res.status}) ${detail}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
