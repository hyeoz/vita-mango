import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, suppColor } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { hardShadow } from "../theme/ui";
import Jelly from "../components/Jelly";
import { PillSwatch } from "../components/Pill";
import { useApp } from "../state/AppContext";
import { fetchTimings, Timing } from "../api/timing";

const CATALOG = [
  "비타민 C",
  "오메가-3",
  "비타민 D",
  "마그네슘",
  "유산균",
  "아연",
];

// Fallback colours for user-typed supplements, which aren't in suppColor.
const CUSTOM_PALETTE = [colors.pink, colors.cyan, colors.mango, colors.purple];

export default function OnboardingScreen() {
  const { supps, onbSelected, toggleOnb, completeOnboarding } = useApp();

  // Names the user typed in this session. Kept in local state so a custom card
  // stays visible (and re-selectable) even after being toggled off.
  const [customOptions, setCustomOptions] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const insets = useSafeAreaInsets();

  // AI-decided intake time + colour per supplement name. Seed from the user's
  // already-registered supplements so re-registration keeps their stored times
  // (and doesn't re-hit the API for them). Custom entries are timed on add;
  // catalog picks are timed in one batch on finish.
  const [timings, setTimings] = useState<Record<string, Timing>>(() => {
    const seed: Record<string, Timing> = {};
    for (const s of supps) seed[s.name] = { time: s.time, color: s.color };
    return seed;
  });
  const [loadingNames, setLoadingNames] = useState<string[]>([]);
  const [finishing, setFinishing] = useState(false);

  // The selectable list = catalog + everything the user has already registered
  // (incl. custom-typed supplements from previous sessions, which live in
  // `supps`/`onbSelected`) + anything typed this session. Deduped, catalog first.
  const options = useMemo(() => {
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const n of [
      ...CATALOG,
      ...supps.map((s) => s.name),
      ...onbSelected,
      ...customOptions,
    ]) {
      const t = n.trim();
      if (t && !seen.has(t)) {
        seen.add(t);
        merged.push(t);
      }
    }
    return merged;
  }, [supps, onbSelected, customOptions]);

  const addCustom = async () => {
    const name = draft.trim();
    if (!name) return;
    // Ignore duplicates (case-insensitive) against catalog + already-added.
    const exists = options.some((o) => o.toLowerCase() === name.toLowerCase());
    if (!exists) setCustomOptions((prev) => [...prev, name]);
    if (!onbSelected.includes(name)) toggleOnb(name); // auto-select
    setDraft("");

    // Per-add: let the AI decide this supplement's intake time right away.
    if (timings[name]) return;
    setLoadingNames((prev) => [...prev, name]);
    try {
      const map = await fetchTimings([name]);
      setTimings((prev) => ({ ...prev, ...map }));
    } catch (e) {
      console.warn("[timing] add failed", e);
    } finally {
      setLoadingNames((prev) => prev.filter((n) => n !== name));
    }
  };

  const onFinish = async () => {
    if (finishing) return;
    // Run the AI timing pass for EVERY selected supplement so each gets its own
    // recommended time + dosage (not just the ones not previewed yet). Never
    // block completion on failure — completeOnboarding falls back to defaults.
    let merged = timings;
    if (onbSelected.length) {
      setFinishing(true);
      try {
        const map = await fetchTimings(onbSelected);
        merged = { ...timings, ...map };
        setTimings(merged);
      } catch (e) {
        console.warn("[timing] finish failed", e);
      } finally {
        setFinishing(false);
      }
    }
    completeOnboarding(merged);
  };

  return (
    <LinearGradient colors={["#e7f8ff", "#f6fcff"]} locations={[0, 0.6]} style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.hero}>
          <View style={styles.jellyWrap}>
            <Jelly mood="happy" width={120} />
          </View>
        </View>

        <View style={styles.speech}>
          <View style={styles.speechTipWrap} pointerEvents="none">
            <View style={styles.speechTip} />
          </View>
          <Text style={styles.greet}>안녕! 나는 젤리야 🫧</Text>
          <Text style={styles.greetSub}>지금 챙겨 먹는 영양제를 골라줘</Text>
        </View>

        <View style={styles.grid}>
          {options.map((name, i) => {
            const selected = onbSelected.includes(name);
            const timing = timings[name];
            const swatch =
              timing?.color ??
              suppColor[name] ??
              CUSTOM_PALETTE[i % CUSTOM_PALETTE.length];
            const sub = loadingNames.includes(name)
              ? "시간 정하는 중…"
              : timing?.time;
            return (
              <Pressable
                key={name}
                onPress={() => toggleOnb(name)}
                style={[
                  styles.card,
                  { backgroundColor: selected ? "#fff3f8" : colors.white },
                ]}
              >
                <PillSwatch color={swatch} width={36} height={18} border={2} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {name}
                  </Text>
                  {sub ? (
                    <Text style={styles.cardTime} numberOfLines={1}>
                      {sub}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.check,
                    { backgroundColor: selected ? colors.purple : colors.white },
                  ]}
                >
                  <Text style={{ color: selected ? colors.white : "#cfc6da", fontSize: 13 }}>
                    {selected ? "✓" : "+"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* direct entry — type a supplement that isn't in the list */}
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={addCustom}
            placeholder="직접 입력 (예: 비타민 B)"
            placeholderTextColor="#b7c7ce"
            maxLength={20}
            returnKeyType="done"
          />
          <Pressable
            style={[styles.addBtn, !draft.trim() && styles.addBtnOff]}
            onPress={addCustom}
            disabled={!draft.trim()}
          >
            <Text style={styles.addBtnText}>추가</Text>
          </Pressable>
        </View>

        <Text style={styles.note}>
          💊 처방약(전문의약품)은 등록하지 마세요. 젤리는 영양제·건강기능식품을
          챙기는 앱이에요.
        </Text>

        <Pressable
          style={[styles.finish, finishing && styles.finishBusy]}
          onPress={onFinish}
          disabled={finishing}
        >
          {finishing ? (
            <View style={styles.finishRow}>
              <ActivityIndicator color={colors.white} />
              <Text style={styles.finishText}>젤리가 시간 정하는 중…</Text>
            </View>
          ) : (
            <Text style={styles.finishText}>다 골랐어!  ({onbSelected.length}개)</Text>
          )}
        </Pressable>
        <Text style={styles.footer}>언제든 마이페이지에서 추가할 수 있어요</Text>
      </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 30, flexGrow: 1 },
  hero: { height: 140, marginTop: 6 },
  jellyWrap: { position: "absolute", left: "50%", top: 6, marginLeft: -60 },
  speech: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    ...hardShadow(),
  },
  // Full-width row that flex-centres the tip — no %/transform maths, so it's
  // pixel-perfect centred regardless of device width.
  speechTipWrap: {
    position: "absolute",
    top: -9,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  speechTip: {
    width: 15,
    height: 15,
    backgroundColor: colors.white,
    borderLeftWidth: 2.5,
    borderTopWidth: 2.5,
    borderColor: colors.ink,
    transform: [{ rotate: "45deg" }],
  },
  greet: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  greetSub: { fontFamily: fonts.body, fontSize: 14, color: colors.muted3, marginTop: 4 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginTop: 20,
  },
  card: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 16,
    padding: 12,
    ...hardShadow(3, 3, 0.08),
  },
  cardBody: { flex: 1 },
  cardName: { fontFamily: fonts.display, fontSize: 13.5, color: colors.ink },
  cardTime: { fontFamily: fonts.body, fontSize: 10.5, color: colors.muted2, marginTop: 1 },
  addRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 16,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    ...hardShadow(3, 3, 0.08),
  },
  addBtn: {
    width: 64,
    height: 48,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 16,
    backgroundColor: colors.cyan,
    alignItems: "center",
    justifyContent: "center",
    ...hardShadow(3, 3, 0.15),
  },
  addBtnOff: { opacity: 0.45 },
  addBtnText: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  note: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted3,
    lineHeight: 18,
    marginTop: 16,
    paddingHorizontal: 2,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  finish: {
    marginTop: 28,
    height: 52,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 18,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
    ...hardShadow(4, 5, 0.22),
  },
  finishBusy: { opacity: 0.7 },
  finishRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  finishText: { fontFamily: fonts.display, fontSize: 17, color: colors.white },
  footer: {
    textAlign: "center",
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#9bb6c0",
    marginTop: 10,
  },
});
