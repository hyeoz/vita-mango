import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
// Aliased: `AppState` is already this file's own context-value type.
import { ActivityIndicator, AppState as RNAppState, StyleSheet, View } from "react-native";
import { colors, suppColor } from "../theme/colors";
import {
  clearProfile,
  loadProfile,
  saveProfile,
  type StoredSupplement,
  type StoredSurvey,
} from "../storage/local";
import { syncReminders, requestPermission, setTakenToday } from "../notifications/reminders";
import { recommend, type Answers, type Recommendation, type SurveyResult } from "../logic/recommend";
import { findSupplement } from "../data/supplements";
import { TIME_SLOTS } from "../data/types";
import { useInterstitial } from "../ads/useInterstitial";
import {
  dayKey,
  computeStreak,
  xpFrom,
  levelProgress,
  unlockedKeys,
  nextLocked,
  LevelProgress,
  Collectible,
} from "./gamification";
import { msg, useI18n } from "../i18n";

export type Supplement = StoredSupplement;

export type Screen = "survey" | "home" | "record" | "ai" | "my" | "references";

export type JellyMood =
  | "happy"
  | "sleepy"
  | "excited"
  | "love"
  | "wink"
  | "surprised"
  | "curious"
  | "proud"
  | "sad";

// Condition keywords → emoji, used for the diary mood stamp.
export function moodFor(t: string): string {
  if (/피곤|졸|설|피로|아프|힘들|지친|스트레스|tired|fatigue|sick|stress|疲|だる|ストレス|fatigu|malade/i.test(t)) return "😮‍💨";
  if (/좋|개운|상쾌|괜찮|행복|활기|든든|good|great|happy|energ|元気|調子.*いい|bien|heureu|énergi/i.test(t)) return "😊";
  return "🙂";
}

const TIRED_RE = /피곤|졸|설|피로|아프|힘들|지친|스트레스|tired|fatigue|sick|stress|疲|だる|ストレス|fatigu|malade/i;

const FALLBACK_COLORS = [colors.pink, colors.cyan, colors.mango, colors.purple, colors.yellow];

/**
 * Turns a recommendation into a list entry, carrying over the master data's
 * intake time and dose so the reminder and the "권장 섭취량" line need no
 * lookup later.
 */
export function suppFromRecommendation(rec: Recommendation, i = 0): Supplement {
  const slot = TIME_SLOTS[rec.supplement.slot];
  return {
    id: rec.supplement.id,
    name: rec.supplement.name,
    time: rec.intake,
    color: rec.supplement.color,
    taken: false,
    hour: slot.hour,
    minute: slot.minute,
    notify: true,
    dose: rec.supplement.dose,
  };
}

/** Builds an entry for a name the user typed themselves. */
export function suppFromName(name: string, i = 0): Supplement {
  const known = findSupplement(name);
  if (known) {
    const slot = TIME_SLOTS[known.slot];
    return {
      id: known.id,
      name: known.name,
      time: `${slot.label} · ${known.unitsPerTake}${known.unitNoun}`,
      color: known.color,
      taken: false,
      hour: slot.hour,
      minute: slot.minute,
      notify: true,
      dose: known.dose,
    };
  }
  return {
    name,
    time: "아침 식후 · 1정",
    color: suppColor[name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    taken: false,
    hour: 8,
    minute: 30,
    notify: true,
  };
}

type AppState = {
  screen: Screen;
  setScreen: (s: Screen) => void;

  diary: string;
  setDiary: (s: string) => void;
  diaries: string[];
  submitDiary: () => void;
  justLogged: boolean;

  supps: Supplement[];
  toggleSupp: (i: number) => void;
  removeSupp: (i: number) => void;
  updateSupp: (i: number, patch: Partial<Supplement>) => void;
  addByName: (name: string) => void;
  takenCount: number;

  /** Saved answers, or null if the survey was never completed. */
  survey: StoredSurvey | null;
  /** Result recomputed from the saved answers — never persisted, always fresh. */
  result: SurveyResult | null;
  completeSurvey: (answers: Answers, freeText: string, picks: Recommendation[]) => void;
  startSurvey: () => void;

  notifyEnabled: boolean;
  toggleNotify: (on: boolean) => Promise<boolean>;

  jellyMood: JellyMood;
  speech: string;
  progress: string;

  subscribed: boolean;
  createdAt: number | null;
  resetEverything: () => Promise<void>;

  level: number;
  xp: number;
  levelInfo: LevelProgress;
  streak: number;
  unlockedExprs: JellyMood[];
  nextUnlock: Collectible | null;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { language, t } = useI18n();
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<Screen>("survey");
  const [diary, setDiary] = useState("");
  const [diaries, setDiaries] = useState<string[]>([]);
  const [justLogged, setJustLogged] = useState(false);
  const [supps, setSupps] = useState<Supplement[]>([]);
  const [survey, setSurvey] = useState<StoredSurvey | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [createdAt, setCreatedAt] = useState<number | null>(null);
  const [doseLog, setDoseLog] = useState<string[]>([]);
  const [lastActiveDate, setLastActiveDate] = useState<string>("");
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  // Bumped to force a reminder rebuild when nothing in the list changed but the
  // *clock* did — see the foreground effect below.
  const [resyncTick, setResyncTick] = useState(0);
  // Mirrors `lastActiveDate` so the rollover check can read it without making
  // every listener re-subscribe on each state change.
  const lastActiveRef = useRef("");

  // No server means no verified purchase, so nothing can grant ad-free yet.
  // Kept as a field so the ad gating below stays a single, obvious switch.
  const subscribed = false;

  const { show: showLevelUpAd } = useInterstitial();
  const prevLevelRef = useRef<number | null>(null);

  // ── hydrate from device storage ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await loadProfile();
      if (cancelled) return;
      const today = dayKey();
      setSupps(
        // New day since last open → clear the daily "taken" checkmarks.
        p.lastActiveDate !== today
          ? p.supplements.map((s) => ({ ...s, taken: false }))
          : p.supplements
      );
      setDiaries(p.diaries);
      setSurvey(p.survey);
      setDoseLog(p.doseLog);
      setLastActiveDate(today);
      lastActiveRef.current = today;
      setOnboarded(p.onboarded);
      setCreatedAt(p.createdAt);
      setNotifyEnabled(p.notifyEnabled);
      setScreen(p.onboarded ? "home" : "survey");
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── persist on change (debounced), only after hydration ──
  const firstWrite = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (firstWrite.current) {
      firstWrite.current = false;
      return; // skip the write triggered by hydration itself
    }
    const t = setTimeout(() => {
      saveProfile({
        supplements: supps,
        diaries,
        survey,
        doseLog,
        lastActiveDate,
        onboarded,
        createdAt: createdAt ?? Date.now(),
        notifyEnabled,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [hydrated, supps, diaries, survey, doseLog, lastActiveDate, onboarded, createdAt, notifyEnabled]);

  // ── day rollover ──
  // Today's checkmarks are what suppress today's reminders, so they have to be
  // cleared the moment the date changes — otherwise yesterday's "다 먹었어"
  // would silence today's reminders too. Cold start handles this during
  // hydration; this covers an app that was merely backgrounded, or left open
  // across midnight.
  const rollOverIfNeeded = useCallback(() => {
    const today = dayKey();
    if (lastActiveRef.current === today) return;
    lastActiveRef.current = today;
    setLastActiveDate(today);
    setSupps((prev) =>
      prev.some((s) => s.taken) ? prev.map((s) => ({ ...s, taken: false })) : prev
    );
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const sub = RNAppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      rollOverIfNeeded();
      // Even with an unchanged list the right schedule may have changed: a
      // supplement taken before its time got a one-off for tomorrow, and once
      // that time passes it can go back to a self-sustaining daily trigger.
      setResyncTick((t) => t + 1);
    });
    // A minute-granular heartbeat catches midnight while the app is open. It is
    // a string compare on a no-op day, and iOS suspends JS in the background, so
    // this costs nothing when it has nothing to do.
    const midnight = setInterval(rollOverIfNeeded, 60_000);
    return () => {
      sub.remove();
      clearInterval(midnight);
    };
  }, [hydrated, rollOverIfNeeded]);

  // Reminders mirror the supplement list *and* today's checkmarks — rebuild
  // whenever either changes. Debounced because `taken` now feeds the schedule,
  // and ticking several supplements off in a row would otherwise mean several
  // full cancel-and-rebuild passes through the native module.
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      syncReminders(supps, notifyEnabled);
    }, 400);
    return () => clearTimeout(t);
  }, [hydrated, supps, notifyEnabled, resyncTick, language]);

  // Keep the foreground handler's view of "already taken" current.
  useEffect(() => {
    setTakenToday(supps.filter((s) => s.taken).map((s) => s.name));
  }, [supps]);

  const takenCount = useMemo(() => supps.filter((s) => s.taken).length, [supps]);

  useEffect(() => {
    if (!hydrated) return;
    if (supps.length > 0 && takenCount === supps.length) {
      const today = dayKey();
      setDoseLog((prev) => (prev.includes(today) ? prev : [...prev, today]));
    }
  }, [hydrated, takenCount, supps.length]);

  const xp = useMemo(() => xpFrom(doseLog.length), [doseLog.length]);
  const levelInfo = useMemo(() => levelProgress(xp), [xp]);
  const streak = useMemo(() => computeStreak(doseLog), [doseLog]);
  const unlockedExprs = useMemo(() => unlockedKeys(levelInfo.level), [levelInfo.level]);
  const nextUnlock = useMemo(() => nextLocked(levelInfo.level), [levelInfo.level]);

  // Recomputed from stored answers rather than stored itself: the engine is
  // deterministic, so persisting the output would only risk it going stale
  // against an updated supplement table.
  const result = useMemo<SurveyResult | null>(() => {
    if (!survey) return null;
    // Recent diary entries ride along with the survey's own free text. They
    // only nudge (see logic/freeText.ts), but it means the recommendation tab shifts a
    // little as the user journals instead of being frozen at survey time.
    const recentDiaries = diaries.slice(0, 7).join(" ");
    return recommend(survey.answers, {
      alreadyTaking: supps.map((s) => s.name),
      freeText: `${survey.freeText} ${recentDiaries}`.trim(),
    });
  }, [survey, supps, diaries, language]);

  useEffect(() => {
    if (!hydrated) return;
    const lvl = levelInfo.level;
    if (prevLevelRef.current === null) {
      prevLevelRef.current = lvl;
      return;
    }
    if (lvl > prevLevelRef.current && !subscribed) showLevelUpAd();
    prevLevelRef.current = lvl;
  }, [hydrated, levelInfo.level, subscribed, showLevelUpAd]);

  const submitDiary = () => {
    const t = diary.trim().slice(0, 200);
    if (!t) return;
    setDiaries((prev) => [t, ...prev]);
    setDiary("");
    setJustLogged(true);
  };

  const toggleSupp = (i: number) =>
    setSupps((prev) => prev.map((s, idx) => (idx === i ? { ...s, taken: !s.taken } : s)));

  const removeSupp = (i: number) => setSupps((prev) => prev.filter((_, idx) => idx !== i));

  const updateSupp = (i: number, patch: Partial<Supplement>) =>
    setSupps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const addByName = (name: string) => {
    const trimmed = name.trim().slice(0, 40);
    if (!trimmed) return;
    setSupps((prev) =>
      prev.some((s) => s.name === trimmed) ? prev : [...prev, suppFromName(trimmed, prev.length)]
    );
  };

  const completeSurvey = useCallback(
    (answers: Answers, freeText: string, picks: Recommendation[]) => {
      setSurvey({ answers, freeText, takenAt: Date.now() });
      if (picks.length) {
        setSupps((prev) => {
          const have = new Set(prev.map((s) => s.name));
          const added = picks
            .filter((r) => !have.has(r.supplement.name))
            .map((r, i) => suppFromRecommendation(r, prev.length + i));
          return [...prev, ...added];
        });
      }
      setOnboarded(true);
      setScreen("home");
    },
    []
  );

  const startSurvey = useCallback(() => setScreen("survey"), []);

  const toggleNotify = useCallback(
    async (on: boolean) => {
      if (!on) {
        setNotifyEnabled(false);
        return false;
      }
      // Only claim reminders are on once the OS actually agreed.
      const granted = await requestPermission();
      setNotifyEnabled(granted);
      return granted;
    },
    []
  );

  const resetEverything = useCallback(async () => {
    await clearProfile();
    await syncReminders([], false);
    setSupps([]);
    setDiaries([]);
    setSurvey(null);
    setDoseLog([]);
    setNotifyEnabled(false);
    setOnboarded(false);
    setCreatedAt(Date.now());
    setScreen("survey");
  }, []);

  const lastDiary = diaries[0] || "";
  const jellyMood: JellyMood = justLogged
    ? "love"
    : takenCount === supps.length && supps.length > 0
    ? "excited"
    : TIRED_RE.test(lastDiary)
    ? "sleepy"
    : "happy";

  const speech = justLogged
    ? t("기록 고마워! 잘 기억해둘게 🥭")
    : takenCount < supps.length
    ? msg("remaining", { count: supps.length - takenCount })
    : t("오늘 영양제 다 챙겼어! 최고야 🎉");

  const value: AppState = {
    screen,
    setScreen,
    diary,
    setDiary,
    diaries,
    submitDiary,
    justLogged,
    supps,
    toggleSupp,
    removeSupp,
    updateSupp,
    addByName,
    takenCount,
    survey,
    result,
    completeSurvey,
    startSurvey,
    notifyEnabled,
    toggleNotify,
    jellyMood,
    speech,
    progress: `${takenCount}/${supps.length}`,
    subscribed,
    createdAt,
    resetEverything,
    level: levelInfo.level,
    xp,
    levelInfo,
    streak,
    unlockedExprs,
    nextUnlock,
  };

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.purple} />
      </View>
    );
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream,
  },
});
