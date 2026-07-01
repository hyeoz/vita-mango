import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";
import { loadUserData, saveUserData, seedUserData } from "../firebase/db";

export type Supplement = {
  name: string;
  time: string;
  color: string; // colour key or hex (see theme/colors.ts suppColor / pillColor)
  taken: boolean;
};

export type Screen = "onboarding" | "home" | "record" | "ai" | "my";

export type JellyMood = "happy" | "sleepy" | "excited" | "love" | "wink";

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
  addRec: (name: string) => void;

  onbSelected: string[];
  toggleOnb: (name: string) => void;
  completeOnboarding: () => void;

  jellyMood: JellyMood;
  speech: string;
  progress: string;
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

  // ── hydrate from Firestore for this user ──
  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    (async () => {
      try {
        const data = await loadUserData(uid);
        if (cancelled) return;
        if (data) {
          setSupps(data.supplements.length ? data.supplements : DEFAULT_SUPPS);
          setDiaries(data.diaries);
          setOnbSelected(data.onbSelected);
          setAddedRecs(data.addedRecs);
          setOnboarded(data.onboarded);
          setScreen(data.onboarded ? "home" : "onboarding");
        } else {
          // new account → seed defaults and start onboarding
          const seed = {
            supplements: DEFAULT_SUPPS,
            diaries: DEFAULT_DIARIES,
            onbSelected: DEFAULT_ONB,
            addedRecs: [],
            onboarded: false,
          };
          await seedUserData(uid, seed);
          if (cancelled) return;
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
      saveUserData(uid, { supplements: supps, diaries, onbSelected, addedRecs, onboarded }).catch(
        (e) => console.warn("[app] save failed", e)
      );
    }, 400);
    return () => clearTimeout(t);
  }, [hydrated, uid, supps, diaries, onbSelected, addedRecs, onboarded]);

  const takenCount = useMemo(() => supps.filter((s) => s.taken).length, [supps]);

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

  const addRec = (name: string) =>
    setAddedRecs((prev) => (prev.includes(name) ? prev : [...prev, name]));

  const toggleOnb = (name: string) =>
    setOnbSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

  const completeOnboarding = () => {
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
    completeOnboarding,
    jellyMood,
    speech,
    progress: `${takenCount}/${supps.length}`,
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
