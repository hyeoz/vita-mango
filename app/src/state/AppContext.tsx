import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors, suppColor } from "../theme/colors";
import { loadUserData, saveUserData, seedUserData } from "../firebase/db";
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

export type Supplement = {
  name: string;
  time: string;
  color: string; // colour key or hex (see theme/colors.ts suppColor / pillColor)
  taken: boolean;
};

export type Screen = "onboarding" | "home" | "record" | "ai" | "my";

export type JellyMood =
  | "happy"
  | "sleepy"
  | "excited"
  | "love"
  | "wink"
  // Lv.6–9 unlockables (placeholder art until the Claude Design faces land).
  | "wow"
  | "cool"
  | "proud"
  | "party";

// ── defaults for a brand-new account ──
const DEFAULT_SUPPS: Supplement[] = [
  { name: "오메가-3", time: "아침 식후 · 1정", color: "mixed", taken: true },
  { name: "비타민 C", time: "아침 식후 · 1정", color: "#ffb43d", taken: true },
  { name: "비타민 D", time: "아침 식후 · 1정", color: "#ffd23f", taken: true },
  { name: "마그네슘", time: "자기 전 · 1정", color: "#7c5cff", taken: false },
  { name: "유산균", time: "자기 전 · 1정", color: "#3bc9db", taken: false },
];
const DEFAULT_DIARIES = ["어젯밤 잠을 설쳤어", "점심 먹고 졸렸어"];
const DEFAULT_ONB = ["비타민 C", "오메가-3"];

// Condition keywords → emoji, mirroring the prototype's moodFor().
export function moodFor(t: string): string {
  if (/피곤|졸|설|피로|아프|힘들|지친|스트레스/.test(t)) return "😮‍💨";
  if (/좋|개운|상쾌|괜찮|행복|활기|든든/.test(t)) return "😊";
  return "🙂";
}

const TIRED_RE = /피곤|졸|설|피로|아프|힘들|지친|스트레스/;

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
  takenCount: number;

  addedRecs: string[];
  addRec: (rec: { name: string; time: string; color: string }) => void;

  onbSelected: string[];
  toggleOnb: (name: string) => void;
  reRegister: () => void;
  completeOnboarding: (
    timings?: Record<string, { time: string; color?: string }>
  ) => void;

  jellyMood: JellyMood;
  speech: string;
  progress: string;

  subscribed: boolean;
  createdAt: number | null;

  // gamification (all derived from real events)
  level: number;
  xp: number;
  levelInfo: LevelProgress;
  streak: number;
  unlockedExprs: JellyMood[];
  nextUnlock: Collectible | null;
};

const Ctx = createContext<AppState | null>(null);

export function AppProvider({
  uid,
  children,
}: {
  uid: string;
  children: React.ReactNode;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<Screen>("onboarding");
  const [diary, setDiary] = useState("");
  const [diaries, setDiaries] = useState<string[]>(DEFAULT_DIARIES);
  const [justLogged, setJustLogged] = useState(false);
  const [addedRecs, setAddedRecs] = useState<string[]>([]);
  const [onbSelected, setOnbSelected] = useState<string[]>(DEFAULT_ONB);
  const [onboarded, setOnboarded] = useState(false);
  const [supps, setSupps] = useState<Supplement[]>(DEFAULT_SUPPS);
  // Server-controlled; read-only on the client. Drives whether ads show.
  const [subscribed, setSubscribed] = useState(false);
  // Account creation time (ms). Drives "함께한 지 N일째" on the my page.
  const [createdAt, setCreatedAt] = useState<number | null>(null);
  // Gamification: dates fully dosed, and the last day we reset daily `taken`.
  const [doseLog, setDoseLog] = useState<string[]>([]);
  const [lastActiveDate, setLastActiveDate] = useState<string>("");

  // ── hydrate from Firestore for this user ──
  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    (async () => {
      try {
        const data = await loadUserData(uid);
        if (cancelled) return;
        if (data) {
          const today = dayKey();
          const base = data.supplements.length ? data.supplements : DEFAULT_SUPPS;
          // New day since last open → clear the daily "taken" checkmarks.
          const fresh =
            data.lastActiveDate !== today
              ? base.map((s) => ({ ...s, taken: false }))
              : base;
          setSupps(fresh);
          setDiaries(data.diaries);
          setOnbSelected(data.onbSelected);
          setAddedRecs(data.addedRecs);
          setOnboarded(data.onboarded);
          setSubscribed(data.subscribed);
          setCreatedAt(data.createdAt);
          setDoseLog(data.doseLog);
          setLastActiveDate(today);
          setScreen(data.onboarded ? "home" : "onboarding");
        } else {
          // new account → seed defaults and start onboarding
          const seed = {
            supplements: DEFAULT_SUPPS,
            diaries: DEFAULT_DIARIES,
            onbSelected: DEFAULT_ONB,
            addedRecs: [],
            onboarded: false,
            doseLog: [],
            lastActiveDate: dayKey(),
          };
          await seedUserData(uid, seed);
          if (cancelled) return;
          setCreatedAt(Date.now());
          setLastActiveDate(dayKey());
          setScreen("onboarding");
        }
      } catch (e) {
        console.warn("[app] hydrate failed", e);
        // fall back to local defaults so the app still works offline
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // ── persist on change (debounced), only after hydration ──
  const firstWrite = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (firstWrite.current) {
      firstWrite.current = false;
      return; // skip the write triggered by hydration itself
    }
    const t = setTimeout(() => {
      saveUserData(uid, {
        supplements: supps,
        diaries,
        onbSelected,
        addedRecs,
        onboarded,
        doseLog,
        lastActiveDate,
      }).catch((e) => console.warn("[app] save failed", e));
    }, 400);
    return () => clearTimeout(t);
  }, [
    hydrated,
    uid,
    supps,
    diaries,
    onbSelected,
    addedRecs,
    onboarded,
    doseLog,
    lastActiveDate,
  ]);

  const takenCount = useMemo(() => supps.filter((s) => s.taken).length, [supps]);

  // When every supplement is checked off today, log today's date once — this is
  // what feeds the streak and dosing XP.
  useEffect(() => {
    if (!hydrated) return;
    if (supps.length > 0 && takenCount === supps.length) {
      const today = dayKey();
      setDoseLog((prev) => (prev.includes(today) ? prev : [...prev, today]));
    }
  }, [hydrated, takenCount, supps.length]);

  // Derived gamification state (pure functions of real events).
  const xp = useMemo(() => xpFrom(doseLog.length), [doseLog.length]);
  const levelInfo = useMemo(() => levelProgress(xp), [xp]);
  const streak = useMemo(() => computeStreak(doseLog), [doseLog]);
  const unlockedExprs = useMemo(
    () => unlockedKeys(levelInfo.level),
    [levelInfo.level]
  );
  const nextUnlock = useMemo(
    () => nextLocked(levelInfo.level),
    [levelInfo.level]
  );

  const submitDiary = () => {
    // Clamp length as a safety net even if the input's maxLength is bypassed.
    const t = diary.trim().slice(0, 200);
    if (!t) return;
    setDiaries((prev) => [t, ...prev]);
    setDiary("");
    setJustLogged(true);
  };

  const toggleSupp = (i: number) =>
    setSupps((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, taken: !s.taken } : s))
    );

  // Adds a recommended supplement to the actual list (with the AI's suggested
  // time + colour) and marks it added. Idempotent — ignores duplicates by name.
  const addRec = (rec: { name: string; time: string; color: string }) => {
    setAddedRecs((prev) =>
      prev.includes(rec.name) ? prev : [...prev, rec.name]
    );
    setSupps((prev) =>
      prev.some((s) => s.name === rec.name)
        ? prev
        : [
            ...prev,
            { name: rec.name, time: rec.time, color: rec.color, taken: false },
          ]
    );
  };

  const toggleOnb = (name: string) =>
    setOnbSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

  // Re-open onboarding to edit the list, starting with every currently-taken
  // supplement pre-selected (so re-registration reflects the real state).
  const reRegister = () => {
    setOnbSelected(supps.map((s) => s.name));
    setScreen("onboarding");
  };

  // Fallback pill colours for user-typed supplements (not in suppColor).
  const FALLBACK_COLORS = [
    colors.pink,
    colors.cyan,
    colors.mango,
    colors.purple,
    colors.yellow,
  ];

  const completeOnboarding = (
    timings?: Record<string, { time: string; color?: string }>
  ) => {
    // Turn the onboarding picks into the user's actual supplement list. Intake
    // time + colour come from the AI timing pass when available, else fall back
    // to sensible defaults. Only replace when something was chosen so we never
    // wipe the list down to empty.
    if (onbSelected.length) {
      setSupps(
        onbSelected.map((name, i) => {
          const t = timings?.[name];
          return {
            name,
            time: t?.time ?? "아침 식후 · 1정",
            color:
              t?.color ??
              suppColor[name] ??
              FALLBACK_COLORS[i % FALLBACK_COLORS.length],
            taken: false,
          };
        })
      );
    }
    setOnboarded(true);
    setScreen("home");
  };

  const lastDiary = diaries[0] || "";
  const jellyMood: JellyMood = justLogged
    ? "love"
    : takenCount === supps.length && supps.length > 0
    ? "excited"
    : TIRED_RE.test(lastDiary)
    ? "sleepy"
    : "happy";

  const speech = justLogged
    ? "기록 고마워! 잘 기억해둘게 🥭"
    : takenCount < supps.length
    ? `자기 전 영양제 ${supps.length - takenCount}개 남았어 🌙 잊지마!`
    : "오늘 영양제 다 챙겼어! 최고야 🎉";

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
    takenCount,
    addedRecs,
    addRec,
    onbSelected,
    toggleOnb,
    reRegister,
    completeOnboarding,
    jellyMood,
    speech,
    progress: `${takenCount}/${supps.length}`,
    subscribed,
    createdAt,
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
