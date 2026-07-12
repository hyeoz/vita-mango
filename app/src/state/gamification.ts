// Gamification engine — pure, deterministic helpers so level/XP/streak can't
// desync: they are derived from real events (days fully dosed + diary count),
// never stored as a mutable score.
//
// Adding a new Jelly expression later is a two-line change:
//   1. add the mood to JellyMood + a case in Jelly.tsx (renderExpr)
//   2. append it to COLLECTIBLES below with the level it unlocks at
import type { JellyMood } from "./AppContext";

// XP awarded per real event.
export const DOSE_XP = 12; // one day where every supplement was taken
export const DIARY_XP = 4; // one diary entry

// Cumulative XP required to *reach* each level (index 0 = Lv.1).
export const LEVEL_XP = [0, 20, 50, 100, 170, 260, 380, 520, 700, 900];

export function xpFrom(doseDays: number, diaryCount: number): number {
  return doseDays * DOSE_XP + diaryCount * DIARY_XP;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) {
    if (xp >= LEVEL_XP[i]) level = i + 1;
  }
  return level;
}

export type LevelProgress = {
  level: number;
  xp: number;
  intoLevel: number; // XP earned past the current level's threshold
  span: number; // XP between this level and the next
  ratio: number; // 0..1 toward next level
  isMax: boolean;
  toNext: number; // XP remaining to next level (0 at max)
};

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const isMax = level >= LEVEL_XP.length;
  const prev = LEVEL_XP[level - 1];
  const next = isMax ? prev : LEVEL_XP[level];
  const span = isMax ? 1 : next - prev;
  const intoLevel = xp - prev;
  return {
    level,
    xp,
    intoLevel,
    span,
    ratio: isMax ? 1 : Math.min(1, intoLevel / span),
    isMax,
    toNext: isMax ? 0 : next - xp,
  };
}

// ── expression collection ──
export type Collectible = {
  key: JellyMood;
  label: string;
  minLevel: number;
};

// The order here is the 도감 order. The first entry should unlock at Lv.1 so a
// brand-new user always has at least one face.
export const COLLECTIBLES: Collectible[] = [
  { key: "happy", label: "방긋", minLevel: 1 },
  { key: "wink", label: "윙크", minLevel: 2 },
  { key: "excited", label: "신남", minLevel: 3 },
  { key: "love", label: "하트뿅", minLevel: 4 },
  { key: "sleepy", label: "노곤", minLevel: 5 },
  // 새 표정은 여기에 추가 (minLevel 6+)
];

export function unlockedKeys(level: number): JellyMood[] {
  return COLLECTIBLES.filter((c) => c.minLevel <= level).map((c) => c.key);
}

// The next still-locked collectible (what the growth gauge points at), or null
// when everything is unlocked.
export function nextLocked(level: number): Collectible | null {
  return COLLECTIBLES.find((c) => c.minLevel > level) ?? null;
}

// ── dates (local, so day boundaries match the user's clock) ──
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Consecutive days of full dosing ending today (or yesterday, so the streak
// stays "alive" until a whole day is missed).
export function computeStreak(doseLog: string[], today: string = dayKey()): number {
  if (doseLog.length === 0) return 0;
  const set = new Set(doseLog);
  const cursor = new Date(`${today}T00:00:00`); // local midnight
  if (!set.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (set.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
