import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { hardShadow } from "../theme/ui";
import Jelly from "../components/Jelly";
import { PillSwatch } from "../components/Pill";
import { useApp } from "../state/AppContext";
import { useAuth } from "../state/AuthContext";
import { COLLECTIBLES } from "../state/gamification";

export default function MyScreen() {
  const {
    supps,
    takenCount,
    createdAt,
    level,
    streak,
    levelInfo,
    nextUnlock,
    reRegister,
  } = useApp();
  const { user, signOut } = useAuth();
  const nickname = user?.displayName?.split(" ")[0] || "젤리";

  // collection = unique supplement names (their 도감 swatches)
  const catalog = supps.map((s) => ({ name: s.name, color: s.color }));
  const insets = useSafeAreaInsets();

  // Real stats — all derived from actual activity.
  const achievement = supps.length
    ? Math.round((takenCount / supps.length) * 100)
    : 0;
  const daysTogether = createdAt
    ? Math.max(1, Math.floor((Date.now() - createdAt) / 86_400_000) + 1)
    : null;
  const STATS = [
    { value: String(streak), label: "연속일 🔥", color: colors.pink },
    { value: String(supps.length), label: "영양제 💊", color: colors.cyan },
    { value: `${achievement}%`, label: "달성률 ✨", color: colors.mango },
  ];
  const gaugePct = `${Math.round(levelInfo.ratio * 100)}%` as `${number}%`;

  return (
    <LinearGradient colors={["#fff3e6", colors.cream]} locations={[0, 0.6]} style={styles.fill}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.jellyWrap}>
            <Jelly mood="love" width={142} />
          </View>
        </View>
        <Text style={styles.name}>젤리 · Lv.{level}</Text>
        <Text style={styles.sub}>
          {daysTogether
            ? `${nickname}님과 함께한 지 ${daysTogether}일째 🎉`
            : `${nickname}님, 반가워요 🎉`}
        </Text>

        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>영양제 도감 📒</Text>
        <View style={styles.grid}>
          {catalog.map((c) => (
            <View key={c.name} style={styles.gridItem}>
              <PillSwatch color={c.color} width={42} height={21} style={{ alignSelf: "center" }} />
              <Text style={styles.gridName}>{c.name}</Text>
            </View>
          ))}
          <View style={[styles.gridItem, styles.gridLocked]}>
            <View style={styles.lockedPill} />
            <Text style={styles.lockedMark}>?</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>표정 도감 😄</Text>
        <View style={styles.grid}>
          {COLLECTIBLES.map((c) => {
            const unlocked = level >= c.minLevel;
            return (
              <View
                key={c.key}
                style={[styles.gridItem, !unlocked && styles.gridLocked]}
              >
                {unlocked ? (
                  <>
                    <View style={styles.faceWrap}>
                      <Jelly
                        mood={c.key}
                        width={46}
                        interactive={false}
                        animated={false}
                      />
                    </View>
                    <Text style={styles.gridName}>{c.label}</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.lockedFace}>🔒</Text>
                    <Text style={styles.lockedLevel}>Lv.{c.minLevel}</Text>
                  </>
                )}
              </View>
            );
          })}
        </View>

        <LinearGradient
          colors={["#f4f1ff", "#ffeef7"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.growth}
        >
          <Text style={{ fontSize: 30 }}>{nextUnlock ? "🎁" : "🏆"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.growthTitle}>
              {nextUnlock
                ? `Lv.${nextUnlock.minLevel} 달성하면 '${nextUnlock.label}' 표정 해금!`
                : "모든 표정을 모았어! 최고야 🎉"}
            </Text>
            <View style={styles.gauge}>
              <View style={[styles.gaugeFill, { width: gaugePct }]} />
            </View>
            {nextUnlock ? (
              <Text style={styles.growthHint}>
                다음 레벨까지 XP {levelInfo.toNext}
              </Text>
            ) : null}
          </View>
        </LinearGradient>

        <Pressable style={styles.reset} onPress={reRegister}>
          <Text style={styles.resetText}>＋ 영양제 다시 등록하기</Text>
        </Pressable>

        <Pressable style={styles.logout} onPress={signOut}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  hero: { height: 170 },
  jellyWrap: { position: "absolute", left: "50%", top: 6, marginLeft: -71 },
  name: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, textAlign: "center" },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: "center",
    ...hardShadow(3, 4),
  },
  statValue: { fontFamily: fonts.display, fontSize: 23 },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.ink,
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridItem: {
    width: "31.5%",
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 12,
    ...hardShadow(3, 3, 0.08),
  },
  gridName: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.ink,
    textAlign: "center",
    marginTop: 8,
  },
  gridLocked: {
    backgroundColor: "#faf7ff",
    borderColor: "#c9bce8",
    borderStyle: "dashed",
    alignItems: "center",
  },
  lockedPill: {
    width: 42,
    height: 21,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: "#c9bce8",
    borderStyle: "dashed",
  },
  lockedMark: { fontSize: 18, color: "#c0b4dc", marginTop: 4 },
  faceWrap: { height: 46, alignItems: "center", justifyContent: "center" },
  lockedFace: { fontSize: 20, textAlign: "center", opacity: 0.5 },
  lockedLevel: {
    fontFamily: fonts.display,
    fontSize: 12,
    color: "#a99cc9",
    textAlign: "center",
    marginTop: 6,
  },
  growth: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 20,
    padding: 14,
    marginTop: 18,
    ...hardShadow(),
  },
  growthTitle: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  growthHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 5,
  },
  gauge: {
    height: 10,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 6,
    marginTop: 7,
    overflow: "hidden",
  },
  gaugeFill: { height: "100%", backgroundColor: colors.mango },
  reset: {
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
  resetText: { fontFamily: fonts.display, fontSize: 14, color: colors.ink },
  logout: { marginTop: 14, alignItems: "center", paddingVertical: 6 },
  logoutText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
});
