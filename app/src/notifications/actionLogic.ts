export type PendingTakenAction = {
  eventId: string;
  name: string;
  supplementId?: string;
  /** Unix milliseconds from UNNotification.date (the actual delivery time). */
  deliveredAt: number;
};

type ActionSupplement = {
  id?: string;
  name: string;
  taken: boolean;
};

function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Applies only actions delivered today. A notification left in Notification
 * Center overnight must never mark the next day's dose as taken.
 */
export function applyPendingTakenActions<T extends ActionSupplement>(
  supplements: T[],
  actions: PendingTakenAction[],
  now: Date = new Date()
): T[] {
  if (!actions.length) return supplements;

  const today = localDayKey(now);
  const fresh = actions.filter(
    (action) => localDayKey(new Date(action.deliveredAt)) === today
  );
  if (!fresh.length) return supplements;

  let changed = false;
  const next = supplements.map((supplement) => {
    if (supplement.taken) return supplement;
    const matched = fresh.some((action) =>
      action.supplementId && supplement.id
        ? action.supplementId === supplement.id
        : action.name === supplement.name
    );
    if (!matched) return supplement;
    changed = true;
    return { ...supplement, taken: true };
  });

  return changed ? next : supplements;
}
