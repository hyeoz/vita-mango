import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { StoredSupplement } from "../storage/local";

// ── Local reminders ──────────────────────────────────────────────────────────
// Every reminder is a local daily-repeating notification scheduled on the
// device. Nothing is sent from a server, so there is no push infrastructure,
// no device tokens, and no way for this to fire when the app is uninstalled.
//
// Scheduling is always "cancel everything, then re-add": reconciling individual
// notification ids against an edited supplement list is far more code and one
// stale id silently means a reminder that never fires (or fires forever).

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ANDROID_CHANNEL = "vm-reminders";

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: "영양제 알림",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
}

/**
 * Asks for permission. Returns whether we may post notifications — the caller
 * flips its own toggle off when this is false, so the UI never claims reminders
 * are on while the OS is silently dropping them.
 */
export async function requestPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
      await ensureAndroidChannel();
      return true;
    }
    // iOS reports `granted: false` for provisional authorisation too, so trust
    // the explicit status rather than only the boolean.
    const asked = await Notifications.requestPermissionsAsync();
    const ok =
      asked.granted ||
      asked.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (ok) await ensureAndroidChannel();
    return !!ok;
  } catch (e) {
    console.warn("[notify] permission request failed", e);
    return false;
  }
}

export async function cancelAll(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn("[notify] cancel failed", e);
  }
}

/**
 * Rebuilds the whole schedule from the current supplement list. Safe to call on
 * every change — it cancels first, so it can never double-book.
 */
export async function syncReminders(
  supplements: StoredSupplement[],
  enabled: boolean
): Promise<number> {
  await cancelAll();
  if (!enabled) return 0;

  const due = supplements.filter((s) => s.notify);
  if (!due.length) return 0;

  await ensureAndroidChannel();

  let scheduled = 0;
  for (const s of due) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "젤리가 알려줄게 🥭",
          body: `${s.name} 먹을 시간이야! (${s.time})`,
          data: { name: s.name },
          ...(Platform.OS === "android" ? { channelId: ANDROID_CHANNEL } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: s.hour,
          minute: s.minute,
        },
      });
      scheduled += 1;
    } catch (e) {
      // One bad entry must not stop the rest of the schedule.
      console.warn(`[notify] schedule failed for ${s.name}`, e);
    }
  }
  return scheduled;
}

/** Debug helper used by the my page to show what's actually queued. */
export async function scheduledCount(): Promise<number> {
  try {
    return (await Notifications.getAllScheduledNotificationsAsync()).length;
  } catch {
    return 0;
  }
}
