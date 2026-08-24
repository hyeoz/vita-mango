// ── What to schedule for one supplement ──────────────────────────────────────
// Pure and dependency-free (no react-native, no expo-notifications) so the
// regression script can exercise it in plain node — the interesting logic here
// is calendar arithmetic, which is exactly the kind of thing that quietly rots.
//
// The problem: a local notification's content and fire time are frozen when it
// is scheduled. There is no "and skip it if the user already checked this off"
// hook at delivery time. So "don't remind me about what I already took" has to
// be decided at *scheduling* time, and the schedule has to be rebuilt whenever
// the answer could have changed.
//
// The catch is that today's answer must not leak into tomorrow: skipping a
// taken supplement can't mean dropping its daily reminder forever.

export type ReminderInput = {
  name: string;
  taken: boolean;
  notify: boolean;
  hour: number;
  minute: number;
};

export type ReminderPlan =
  /** Repeats every day at hour:minute, forever — the steady state. */
  | { kind: "daily"; hour: number; minute: number }
  /** A single fire at `at`, used to skip today without losing tomorrow. */
  | { kind: "once"; at: Date; hour: number; minute: number };

const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** Stored times come from a stepper that already wraps, but storage can rot. */
function normalizeTime(hour: number, minute: number): { hour: number; minute: number } {
  const h = isNum(hour) ? Math.trunc(hour) : 8;
  const m = isNum(minute) ? Math.trunc(minute) : 30;
  const total = (((h * 60 + m) % 1440) + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

/** Tomorrow, local, at hour:minute. The Date constructor rolls the month over. */
export function nextDayAt(now: Date, hour: number, minute: number): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, minute, 0, 0);
}

/**
 * Decides what (if anything) to queue for one supplement.
 *
 * Three cases, and only the third costs us anything:
 *
 *  1. Not taken → `daily`. Unchanged behaviour, self-sustaining.
 *  2. Taken, but its time already passed today → `daily` as well. A daily
 *     trigger's *next* fire is tomorrow anyway, so skipping today is free —
 *     no reason to give up the repeat. This is the common case, because people
 *     usually tick a supplement off around or after the time they take it.
 *  3. Taken while its time is still ahead today → `once`, at tomorrow's slot.
 *     A repeating trigger would fire later today, and expo/iOS/Android have no
 *     "start repeating from tomorrow" trigger, so the repeat has to be given up
 *     for one hop and restored by the next resync (foreground / day rollover).
 *
 * Case 3 deliberately costs exactly one queued notification. The alternative
 * that keeps a repeat — six WEEKLY triggers, every weekday but today — burns 6
 * slots per supplement against iOS's hard 64-pending cap, so a user with a
 * dozen supplements would silently lose reminders entirely. One missed day for
 * someone who stopped opening the app is the smaller failure.
 *
 * Equality (now == the slot minute) counts as "still ahead": a daily trigger
 * registered in the same minute can fire immediately on some platforms, which
 * is the exact duplicate this feature exists to prevent.
 */
export function planReminder(s: ReminderInput, now: Date = new Date()): ReminderPlan | null {
  if (!s.notify) return null;
  const { hour, minute } = normalizeTime(s.hour, s.minute);
  if (!s.taken) return { kind: "daily", hour, minute };

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const slotMinutes = hour * 60 + minute;
  if (nowMinutes > slotMinutes) return { kind: "daily", hour, minute };

  return { kind: "once", at: nextDayAt(now, hour, minute), hour, minute };
}

/**
 * The whole queue for a supplement list, in list order. Generic so the caller
 * keeps its own richer type (and can read fields like `time` off the result).
 */
export function planReminders<T extends ReminderInput>(
  supplements: T[],
  now: Date = new Date()
): { supplement: T; plan: ReminderPlan }[] {
  const out: { supplement: T; plan: ReminderPlan }[] = [];
  for (const s of supplements) {
    const plan = planReminder(s, now);
    if (plan) out.push({ supplement: s, plan });
  }
  return out;
}
