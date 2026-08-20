import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Answers } from "../logic/recommend";

// ── On-device persistence ────────────────────────────────────────────────────
// Everything the app knows lives here. No account, no network, no sync — which
// also means no server to pay for and nothing to leak. The tradeoff is stated
// plainly in the UI: uninstalling the app clears the data.
//
// One key per concern rather than a single blob, so a corrupt value in one area
// can't take the whole profile down with it.

const KEYS = {
  supplements: "vm.supplements",
  diaries: "vm.diaries",
  survey: "vm.survey",
  doseLog: "vm.doseLog",
  lastActive: "vm.lastActiveDate",
  onboarded: "vm.onboarded",
  createdAt: "vm.createdAt",
  notifyEnabled: "vm.notifyEnabled",
} as const;

export type StoredSupplement = {
  /** Master-data id when the name is one we know, else undefined. */
  id?: string;
  name: string;
  time: string;
  color: string;
  taken: boolean;
  /** Per-supplement reminder time. */
  hour: number;
  minute: number;
  notify: boolean;
  dose?: string;
};

export type StoredSurvey = {
  answers: Answers;
  freeText: string;
  /** ISO date the survey was taken, for "N일 전에 받은 결과" */
  takenAt: number;
};

/** Reads and parses a JSON key, falling back rather than throwing. */
async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // A single unreadable key should degrade that one feature, not the app.
    console.warn(`[storage] unreadable key ${key}, using fallback`);
    return fallback;
  }
}

async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[storage] write failed for ${key}`, e);
  }
}

export type LocalProfile = {
  supplements: StoredSupplement[];
  diaries: string[];
  survey: StoredSurvey | null;
  doseLog: string[];
  lastActiveDate: string;
  onboarded: boolean;
  createdAt: number;
  notifyEnabled: boolean;
};

export async function loadProfile(): Promise<LocalProfile> {
  const [
    supplements,
    diaries,
    survey,
    doseLog,
    lastActiveDate,
    onboarded,
    createdAt,
    notifyEnabled,
  ] = await Promise.all([
    readJSON<StoredSupplement[]>(KEYS.supplements, []),
    readJSON<string[]>(KEYS.diaries, []),
    readJSON<StoredSurvey | null>(KEYS.survey, null),
    readJSON<string[]>(KEYS.doseLog, []),
    readJSON<string>(KEYS.lastActive, ""),
    readJSON<boolean>(KEYS.onboarded, false),
    readJSON<number>(KEYS.createdAt, 0),
    readJSON<boolean>(KEYS.notifyEnabled, false),
  ]);

  return {
    supplements: Array.isArray(supplements) ? supplements : [],
    diaries: Array.isArray(diaries) ? diaries : [],
    survey: survey ?? null,
    doseLog: Array.isArray(doseLog) ? doseLog : [],
    lastActiveDate: typeof lastActiveDate === "string" ? lastActiveDate : "",
    onboarded: !!onboarded,
    // Stamp on first run so "함께한 지 N일째" has an origin.
    createdAt: typeof createdAt === "number" && createdAt > 0 ? createdAt : Date.now(),
    notifyEnabled: !!notifyEnabled,
  };
}

export async function saveProfile(p: Partial<LocalProfile>): Promise<void> {
  const writes: Promise<void>[] = [];
  if (p.supplements !== undefined) writes.push(writeJSON(KEYS.supplements, p.supplements));
  if (p.diaries !== undefined) writes.push(writeJSON(KEYS.diaries, p.diaries));
  if (p.survey !== undefined) writes.push(writeJSON(KEYS.survey, p.survey));
  if (p.doseLog !== undefined) writes.push(writeJSON(KEYS.doseLog, p.doseLog));
  if (p.lastActiveDate !== undefined) writes.push(writeJSON(KEYS.lastActive, p.lastActiveDate));
  if (p.onboarded !== undefined) writes.push(writeJSON(KEYS.onboarded, p.onboarded));
  if (p.createdAt !== undefined) writes.push(writeJSON(KEYS.createdAt, p.createdAt));
  if (p.notifyEnabled !== undefined) writes.push(writeJSON(KEYS.notifyEnabled, p.notifyEnabled));
  await Promise.all(writes);
}

/** Wipes everything — backs the "데이터 전체 삭제" button on the my page. */
export async function clearProfile(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch (e) {
    console.warn("[storage] clear failed", e);
  }
}
