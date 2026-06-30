import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { hardShadow } from "../theme/ui";
import Jelly from "../components/Jelly";
import { FloatingPill, PillSwatch } from "../components/Pill";
import { useApp } from "../state/AppContext";
import { fetchRecommendation, RecommendResult } from "../api/recommend";
import { suppColor } from "../theme/colors";

export default function AiScreen() {
  const { diaries, supps, addedRecs, addRec } = useApp();
  const [state, setState] = useState<"loading" | "done" | "error">("loading");
  const [result, setResult] = useState<RecommendResult | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const data = await fetchRecommendation(
        diaries,
        supps.map((s) => ({ name: s.name, time: s.time }))
      );
      setResult(data);
      setState("done");
    } catch (e) {
      console.warn("[ai] recommend error", e);
      setState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <LinearGradient colors={["#f1ecff", "#fbf7ff"]} locations={[0, 0.6]} style={styles.fill}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🔮 젤리의 AI 분석</Text>
          </View>
        </View>

        {/* jelly thinking */}
        <View style={styles.hero}>
          <FloatingPill color="yellow" size={34} rotate={0} delay={0} style={{ position: "absolute", top: 18, left: 46 }} />
          <FloatingPill color="cyan" size={34} rotate={0} delay={400} style={{ position: "absolute", top: 24, right: 50 }} />
          <View style={styles.jellyWrap}>
            <Jelly mood="excited" width={124} />
          </View>
        </View>

        {state === "loading" && (
          <View style={[styles.summary, styles.center]}>
            <ActivityIndicator color={colors.purple} />
            <Text style={styles.loadingText}>최근 일기를 읽으며 분석 중이야… 🥭</Text>
          </View>
        )}

        {state === "error" && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>앗, 분석을 못 했어 😢</Text>
            <Text style={styles.summaryBody}>
              서버에 연결하지 못했어. 백엔드가 켜져 있는지 확인하고 다시 시도해줘.
            </Text>
            <Pressable style={styles.retry} onPress={load}>
              <Text style={styles.retryText}>다시 분석하기</Text>
            </Pressable>
          </View>
        )}

        {state === "done" && result && (
          <>
            {/* analysis summary */}
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>최근 일기를 읽어봤어 👀</Text>
              <Text style={styles.summaryBody}>{result.analysis}</Text>
              {result.signals.length > 0 && (
                <View style={styles.signalRow}>
                  {result.signals.map((s, i) => (
                    <View
                      key={i}
                      style={[
                        styles.signal,
                        i % 2 === 0 ? styles.signalA : styles.signalB,
                      ]}
                    >
                      <Text
                        style={[
                          styles.signalText,
                          { color: i % 2 === 0 ? colors.purpleDeep : colors.pinkText },
                        ]}
                      >
                        {s.emoji} {s.label}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <Text style={styles.recHeading}>너에게 맞는 추천 💊</Text>

            <View style={{ gap: 14 }}>
              {result.recommendations.map((r) => {
                const added = addedRecs.includes(r.name);
                const colorKey = r.color || suppColor[r.name] || "purple";
                return (
                  <View key={r.name} style={styles.recCard}>
                    <View style={styles.recHead}>
                      <PillSwatch color={colorKey} width={54} height={27} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recName}>{r.name}</Text>
                        <Text style={styles.recTime}>{r.time}</Text>
                      </View>
                      <View style={{ alignItems: "center" }}>
                        <Text style={styles.recScore}>{r.score}%</Text>
                        <Text style={styles.recScoreLabel}>추천도</Text>
                      </View>
                    </View>
                    {r.tags.length > 0 && (
                      <View style={styles.tagRow}>
                        {r.tags.map((t, i) => (
                          <View key={i} style={styles.tag}>
                            <Text style={styles.tagText}>{t}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <Pressable
                      onPress={() => addRec(r.name)}
                      style={[
                        styles.addBtn,
                        { backgroundColor: added ? colors.cyan : colors.purple },
                      ]}
                    >
                      <Text style={styles.addText}>
                        {added ? "내 영양제에 추가됨 ✓" : "+ 내 영양제에 추가"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <Pressable style={styles.refresh} onPress={load}>
              <Text style={styles.refreshText}>🔄 다시 분석하기</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  badgeRow: { alignItems: "center" },
  badge: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    ...hardShadow(3, 3, 1),
    shadowColor: "#ffce4d",
    shadowOpacity: 1,
  },
  badgeText: { fontFamily: fonts.display, fontSize: 13, color: colors.purple },
  hero: { height: 150, marginTop: 6 },
  jellyWrap: { position: "absolute", left: "50%", top: 18, marginLeft: -62 },
  summary: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 22,
    padding: 16,
    ...hardShadow(),
  },
  center: { alignItems: "center", gap: 12, paddingVertical: 24 },
  loadingText: { fontFamily: fonts.body, fontSize: 14, color: colors.muted3 },
  summaryTitle: { fontFamily: fonts.display, fontSize: 15, color: colors.ink, marginBottom: 6 },
  summaryBody: { fontFamily: fonts.body, fontSize: 14, color: colors.muted3, lineHeight: 22 },
  signalRow: { flexDirection: "row", gap: 7, marginTop: 12, flexWrap: "wrap" },
  signal: { borderWidth: 1.8, borderRadius: 16, paddingVertical: 4, paddingHorizontal: 11 },
  signalA: { backgroundColor: "#f1ecff", borderColor: colors.purple },
  signalB: { backgroundColor: "#fff3f8", borderColor: colors.pink },
  signalText: { fontFamily: fonts.body, fontSize: 12 },
  recHeading: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.ink,
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  recCard: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 22,
    padding: 16,
    ...hardShadow(),
  },
  recHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  recName: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  recTime: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted2, marginTop: 1 },
  recScore: { fontFamily: fonts.display, fontSize: 19, color: colors.purple },
  recScoreLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.muted4 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  tag: {
    backgroundColor: "#f7f5ff",
    borderWidth: 1.6,
    borderColor: "#d9cffb",
    borderRadius: 14,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  tagText: { fontFamily: fonts.body, fontSize: 11.5, color: "#6a5acb" },
  addBtn: {
    marginTop: 14,
    height: 44,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    ...hardShadow(3, 3, 0.18),
  },
  addText: { fontFamily: fonts.display, fontSize: 15, color: colors.white },
  retry: {
    marginTop: 14,
    height: 44,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 14,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: { fontFamily: fonts.display, fontSize: 15, color: colors.white },
  refresh: {
    marginTop: 16,
    height: 46,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...hardShadow(3, 4),
  },
  refreshText: { fontFamily: fonts.display, fontSize: 14, color: colors.ink },
});
