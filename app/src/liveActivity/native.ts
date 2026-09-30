import { NativeModules, Platform } from 'react-native';
import type { StoredSupplement } from '../storage/local';
import { pillColor } from '../theme/colors';
import { liveCopy } from './copy';
import { intakeId, type IntakeEvent } from './logic';
import type { RuntimeLanguage } from '../i18n/runtime';

export type LiveStatus = { supported: boolean; allowed: boolean; enabled: boolean; active: boolean };
export const unavailable: LiveStatus = { supported: false, allowed: false, enabled: false, active: false };
const native = Platform.OS === 'ios' ? NativeModules.VMLiveActivity as
  { execute(command: string, payload: string): Promise<string> } | undefined : undefined;

export async function liveCommand(command: string, payload = ''): Promise<LiveStatus> {
  return native ? JSON.parse(await native.execute(command, payload)) : unavailable;
}
export async function readLiveEvents(): Promise<IntakeEvent[]> {
  if (!native) return [];
  const events: unknown = JSON.parse(await native.execute('pending', ''));
  return Array.isArray(events) ? events.filter(e => e && typeof e.eventId === 'string' &&
    typeof e.itemId === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.day) && typeof e.completed === 'boolean') : [];
}
export function livePayload(supps: StoredSupplement[], day: string, language: RuntimeLanguage,
  translate: (text: string) => string, acknowledged: string[]): string {
  const copy = liveCopy(language);
  // The full list stays in the app's private journal. Native code only puts
  // three remaining items and two completed names into ActivityKit's 4 KB state.
  return JSON.stringify({ snapshot: { day, items: supps.map(s => ({
    id: intakeId(s), name: s.name, title: Array.from(translate(s.name)).slice(0, 40).join(''),
    taken: s.taken, color: s.color === 'mixed' ? '#ff7eb6' : pillColor[s.color] ?? s.color,
  })), copy: { brand: copy.brand, title: copy.title, hint: copy.hint, complete: copy.complete,
    completeSubtitle: copy.completeSubtitle, expired: copy.expired, openApp: copy.openApp, taken: copy.taken } }, acknowledged });
}
