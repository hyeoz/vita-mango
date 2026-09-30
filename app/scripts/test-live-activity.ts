import assert from 'node:assert/strict';
import { acknowledgedEvents, intakeId, mergeCompletionDays, mergeIntakeEvents, type IntakeEvent } from '../src/liveActivity/logic';
import type { StoredSupplement } from '../src/storage/local';
const day = '2026-09-30';
const items: StoredSupplement[] = [
  { id: 'omega3', name: '오메가-3', time: '', color: 'mixed', taken: false, hour: 8, minute: 0, notify: true },
  { name: '직접 추가', time: '', color: 'cyan', taken: false, hour: 8, minute: 0, notify: true },
];
const event: IntakeEvent = { eventId: 'tap-1', itemId: intakeId(items[0]), day, completed: false };
assert.equal(mergeIntakeEvents(items, [event], day)[0].taken, true);
assert.equal(mergeIntakeEvents(items, [event], '2026-10-01'), items, 'old card cannot mark tomorrow');
const merged = mergeIntakeEvents(items, [event, event], day);
assert.equal(mergeIntakeEvents(merged, [event], day), merged, 'replayed journal is idempotent');
assert.equal(mergeIntakeEvents([items[1]], [event], day)[0].taken, false, 'removed item cannot mark another item');
assert.deepEqual(acknowledgedEvents([event], items, [], day), [], 'never acknowledge an unapplied tap');
assert.deepEqual(acknowledgedEvents([event], merged, [], day), ['tap-1']);
const complete = { ...event, eventId: 'finish', completed: true };
assert.deepEqual(acknowledgedEvents([complete], merged, [], day), [], 'completion history must also be saved');
const history = mergeCompletionDays([], [complete, complete]);
assert.deepEqual(history, [day]);
assert.deepEqual(acknowledgedEvents([complete], items, history, '2026-10-01'), ['finish']);
assert.equal(mergeCompletionDays(history, [complete]), history);
const custom = { ...event, itemId: intakeId(items[1]) };
assert.equal(mergeIntakeEvents(items, [custom], day)[1].taken, true);
console.log('Live Activity recovery: 11 assertions passed');
