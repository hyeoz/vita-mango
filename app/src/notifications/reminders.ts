import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { StoredSupplement } from "../storage/local";
import { planReminders } from "./schedule";
import { msg, tx } from "../i18n";

// ── Local reminders ──────────────────────────────────────────────────────────
// Every reminder is a local notification scheduled on the device. Nothing is
// sent from a server, so there is no push infrastructure, no device tokens, and
// no way for this to fire when the app is uninstalled.
//
// Scheduling is always "cancel everything, then re-add": reconciling individual
// notification ids against an edited supplement list is far more code and one
// stale id silently means a reminder that never fires (or fires forever).
//
// A supplement already ticked off for today is skipped — see ./schedule.ts for
// which trigger each case gets and why.

// Names ticked off today, mirrored from app state. A scheduled notification's
// content is frozen at scheduling time, but the foreground handler still runs
// at delivery, so this closes the small window where a reminder was already in
// flight when the user checked it off (the sync below is debounced, and the OS
// cancel is not instantaneous).
let takenToday = new Set<string>();

/** Called by AppContext whenever the taken set changes. */
export function setTakenToday(names: string[]): void {
  takenToday = new Set(names);
}

const SILENT = {
  shouldShowBanner: false,
  shouldShowList: false,
  shouldPlaySound: false,
  shouldSetBadge: false,
};

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const name = notification.request.content.data?.name;
    if (typeof name === "string" && takenToday.has(name)) return SILENT;
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

const ANDROID_CHANNEL = "vm-reminders";

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: tx("영양제 알림"),
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
 *
 * Because a taken supplement is skipped for the rest of today, this is no longer
 * only a function of the list: it also depends on the wall clock and on today's
 * checkmarks. Callers must therefore re-run it when `taken` changes, when the
 * app returns to the foreground, and when the day rolls over — AppContext does
 * all three.
 */
export async function syncReminders(
  supplements: StoredSupplement[],
  enabled: boolean,
  now: Date = new Date()
): Promise<number> {
  await cancelAll();
  if (!enabled) return 0;

  const planned = planReminders(supplements, now);
  if (!planned.length) return 0;

  await ensureAndroidChannel();

  let scheduled = 0;
  for (const { supplement: s, plan } of planned) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: tx("젤리가 알려줄게 🥭"),
          body: msg("notificationBody", { name: tx(s.name), time: tx(s.time) }),
          data: { name: s.name },
          ...(Platform.OS === "android" ? { channelId: ANDROID_CHANNEL } : {}),
        },
        trigger:
          plan.kind === "daily"
            ? {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: plan.hour,
                minute: plan.minute,
              }
            : {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: plan.at,
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
