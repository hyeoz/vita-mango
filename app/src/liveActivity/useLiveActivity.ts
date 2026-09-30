import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { liveCommand, livePayload, unavailable } from './native';
import { acknowledgedEvents, type IntakeEvent } from './logic';
import { saveIntakeState, type StoredSupplement } from '../storage/local';
import type { RuntimeLanguage } from '../i18n/runtime';
import { dayKey } from '../state/gamification';

export function useLiveActivity({ hydrated, supps, doseLog, day, language, translate, events, tick }: {
  hydrated: boolean; supps: StoredSupplement[]; doseLog: string[]; day: string;
  language: RuntimeLanguage; translate: (s: string) => string;
  events: React.MutableRefObject<IntakeEvent[]>; tick: number;
}) {
  const [status, setStatus] = useState(unavailable);
  const [busy, setBusy] = useState(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = useCallback(<T,>(work: () => Promise<T>): Promise<T> => {
    const next = queue.current.catch(() => undefined).then(work);
    queue.current = next;
    return next;
  }, []);
  const sync = useCallback(async () => {
    if (!hydrated || day !== dayKey()) return;
    const current = await liveCommand('status');
    if (!current.supported) return setStatus(current);
    const acknowledged = acknowledgedEvents(events.current, supps, doseLog, day);
    // Never remove the native recovery journal until AsyncStorage confirms save.
    await saveIntakeState(supps, doseLog, day);
    const next = await liveCommand('sync', livePayload(supps, day, language, translate, acknowledged));
    events.current = events.current.filter(e => !acknowledged.includes(e.eventId));
    setStatus(next);
  }, [hydrated, supps, doseLog, day, language, translate, events]);
  useEffect(() => {
    if (!hydrated || AppState.currentState !== 'active') return;
    let cancelled = false;
    void enqueue(async () => { if (!cancelled) await sync(); }).catch(() => {
      // Keep native events for retry on the next foreground, never acknowledge failure.
      console.warn('[live-activity] sync deferred');
    });
    return () => { cancelled = true; };
  }, [hydrated, sync, tick, enqueue]);

  const control = useCallback(async (command: 'start' | 'stop') => {
    setBusy(true);
    try { await enqueue(async () => {
      await sync();
      setStatus(await liveCommand(command));
    }); } finally { setBusy(false); }
  }, [sync, enqueue]);
  const reset = useCallback(async () => {
    await enqueue(async () => { setStatus(await liveCommand('reset')); events.current = []; });
  }, [enqueue, events]);
  return { status, busy, control, reset };
}
