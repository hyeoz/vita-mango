import type { StoredSupplement } from '../storage/local';

export type IntakeEvent = { eventId: string; itemId: string; day: string; completed: boolean };
export const intakeId = (s: Pick<StoredSupplement, 'id' | 'name'>): string => s.id ? `id:${s.id}` : `name:${s.name}`;

export function mergeIntakeEvents<T extends StoredSupplement>(supps: T[], events: IntakeEvent[], today: string): T[] {
  const taken = new Set(events.filter(e => e.day === today).map(e => e.itemId));
  if (!supps.some(s => !s.taken && taken.has(intakeId(s)))) return supps;
  return supps.map(s => taken.has(intakeId(s)) && !s.taken ? { ...s, taken: true } : s);
}

export function mergeCompletionDays(days: string[], events: IntakeEvent[]): string[] {
  const missing = events.filter(e => e.completed && !days.includes(e.day)).map(e => e.day);
  return missing.length ? [...new Set([...days, ...missing])].sort() : days;
}

/** Events are acknowledged only after their effects exist in the saved profile. */
export function acknowledgedEvents(events: IntakeEvent[], supps: StoredSupplement[], days: string[], today: string): string[] {
  return events.filter(e => {
    if (e.completed && !days.includes(e.day)) return false;
    const item = supps.find(s => intakeId(s) === e.itemId);
    return e.day !== today || !item || item.taken;
  }).map(e => e.eventId);
}
