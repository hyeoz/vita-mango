import React from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { hardShadow } from "../theme/ui";
import Jelly from "../components/Jelly";
import { PillSwatch } from "../components/Pill";
import Bouncy from "../components/Bouncy";
import SupplementPickerModal from "../components/SupplementPickerModal";
import Disclaimer from "../components/Disclaimer";
import { useApp } from "../state/AppContext";
import { COLLECTIBLES } from "../state/gamification";
import { useAds } from "../ads/AdsContext";

export default function MyScreen() {
  const {
    supps,
    takenCount,
    createdAt,
    level,
    streak,
    levelInfo,
    nextUnlock,
    unlockedExprs,
    startSurvey,
    addByName,
    updateSupp,
    notifyEnabled,
    toggleNotify,
    resetEverything,
    setScreen,
  } = useApp();
  const { privacyOptionsRequired, showPrivacyOptions } = useAds();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  // No account means no profile name to greet with — the mascot's name it is.
  const nickname = "젤리";

  // collection = unique supplement names (their 도감 swatches)
  const catalog = supps.map((s) => ({ name: s.name, color: s.color }));
  const insets = useSafeAreaInsets();

  const confirmReset = () => {
    Alert.alert(
      "모든 데이터를 삭제할까요?",
      "영양제, 복용 기록, 일기, 설문 결과와 젤리 성장 기록이 이 기기에서 지워져요. 서버에 사본이 없어서 되돌릴 수 없어요.",
      [
        { text: "취소", style: "cancel" },
        { text: "영구 삭제", style: "destructive", onPress: () => { resetEverything(); } },
      ]
    );
  };

  // Nudge the reminder time in half-hour steps. A stepper keeps this free of a
  // date-picker dependency and is quick for the one adjustment people actually
  // make — shifting a reminder to when they really eat.
  const nudgeTime = (i: number, deltaMin: number) => {
    const s = supps[i];
    const total = (s.hour * 60 + s.minute + deltaMin + 1440) % 1440;
    updateSupp(i, { hour: Math.floor(total / 60), minute: total % 60 });
  };

  const onToggleNotify = async (on: boolean) => {
    const granted = await toggleNotify(on);
    if (on && !granted) {
      Alert.alert(
        "알림 권한이 꺼져 있어요",
        "설정 앱에서 비타망고 알림을 켜주면 복용 시간에 젤리가 알려줄게요.",
        [
          { text: "나중에", style: "cancel" },
          { text: "설정 열기", onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

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
            <Jelly mood="love" width={142} expressions={unlockedExprs} />
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

        {/* Kept directly under the stats, above the collections, so the
            citations App Review asked for are visible without scrolling. */}
        <Bouncy
          scaleTo={0.97}
          haptic="medium"
          style={styles.refsCard}
          onPress={() => setScreen("references")}
          accessibilityRole="button"
          accessibilityLabel="근거 및 출처 화면 열기"
        >
          <Text style={styles.refsIcon}>📚</Text>
          <View style={styles.refsBody}>
            <Text style={styles.refsTitle}>근거 및 출처</Text>
            <Text style={styles.refsSub}>
              추천에 참고한 기관 자료와 성분별 출처 링크를 볼 수 있어요.
            </Text>
          </View>
          <Text style={styles.refsChevron}>›</Text>
        </Bouncy>

        <Text style={styles.sectionTitle}>영양제 도감 📒</Text>
        <View style={styles.grid}>
          {catalog.map((c) => (
            <View key={c.name} style={styles.gridItem}>
              <PillSwatch color={c.color} width={42} height={21} style={{ alignSelf: "center" }} />
              <Text style={styles.gridName} numberOfLines={1}>{c.name}</Text>
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
                    <Text style={styles.gridName} numberOfLines={1}>{c.label}</Text>
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

        <View style={styles.notifyCard}>
          <View style={styles.notifyHead}>
            <Text style={styles.notifyTitle}>🔔 복용 알림</Text>
            <Bouncy
              scaleTo={0.92}
              haptic="medium"
              style={[styles.switch, notifyEnabled && styles.switchOn]}
              onPress={() => onToggleNotify(!notifyEnabled)}
              accessibilityRole="switch"
              accessibilityState={{ checked: notifyEnabled }}
            >
              <View style={[styles.knob, notifyEnabled && styles.knobOn]} />
            </Bouncy>
          </View>
          <Text style={styles.notifyHint}>
            기기 안에서만 울리는 알림이에요. 영양제마다 시간을 따로 정할 수 있어요.
          </Text>

          {supps.length === 0 ? (
            <Text style={styles.notifyEmpty}>등록한 영양제가 아직 없어요.</Text>
          ) : (
            supps.map((s, i) => (
              <View key={`${s.name}-${i}`} style={styles.notifyRow}>
                <Bouncy
                  scaleTo={0.9}
                  haptic="selection"
                  style={[styles.rowCheck, s.notify && styles.rowCheckOn]}
                  onPress={() => updateSupp(i, { notify: !s.notify })}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: s.notify }}
                >
                  {s.notify ? <Text style={styles.rowCheckMark}>✓</Text> : null}
                </Bouncy>
                <Text style={styles.rowName} numberOfLines={1}>
                  {s.name}
                </Text>
                <View style={styles.stepper}>
                  <Bouncy
                    scaleTo={0.88}
                    haptic="selection"
                    style={styles.stepBtn}
                    onPress={() => nudgeTime(i, -30)}
                    disabled={!notifyEnabled || !s.notify}
                    hitSlop={6}
                  >
                    <Text style={styles.stepText}>−</Text>
                  </Bouncy>
                  <Text
                    style={[
                      styles.timeText,
                      (!notifyEnabled || !s.notify) && styles.timeOff,
                    ]}
                  >
                    {String(s.hour).padStart(2, "0")}:{String(s.minute).padStart(2, "0")}
                  </Text>
                  <Bouncy
                    scaleTo={0.88}
                    haptic="selection"
                    style={styles.stepBtn}
                    onPress={() => nudgeTime(i, 30)}
                    disabled={!notifyEnabled || !s.notify}
                    hitSlop={6}
                  >
                    <Text style={styles.stepText}>＋</Text>
                  </Bouncy>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.actionRow}>
          <Bouncy style={styles.actionButton} haptic="medium" onPress={startSurvey}>
            <Text style={styles.actionIcon}>🔮</Text>
            <Text
              style={styles.actionText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.88}
            >
              영양제 추천 다시 받기
            </Text>
          </Bouncy>
          <Bouncy
            style={[styles.actionButton, styles.actionButtonAdd]}
            haptic="medium"
            onPress={() => setPickerOpen(true)}
          >
            <Text style={styles.actionIcon}>💊</Text>
            <Text
              style={styles.actionText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.88}
            >
              영양제 직접 추가하기
            </Text>
          </Bouncy>
        </View>

        <Pressable
          style={styles.privacy}
          onPress={() => Linking.openURL("https://hyeoz.github.io/privacy/vitamango/")}
          accessibilityRole="link"
        >
          <Text style={styles.privacyText}>개인정보처리방침</Text>
        </Pressable>

        {privacyOptionsRequired ? (
          <Pressable
            style={styles.privacy}
            onPress={() => {
              showPrivacyOptions().catch(() => {
                Alert.alert(
                  "광고 설정을 열지 못했어요",
                  "잠시 후 다시 시도해 주세요."
                );
              });
            }}
            accessibilityRole="button"
          >
            <Text style={styles.privacyText}>광고 개인정보 설정</Text>
          </Pressable>
        ) : null}

        <Text style={styles.localNote}>
          모든 기록은 이 기기 안에만 저장돼요. 계정이 없어서 서버로 전송되지 않지만,
          앱을 삭제하면 함께 지워져요.
        </Text>

        <Disclaimer style={styles.disclaimerBlock} />

        <Pressable style={styles.deleteAccount} onPress={confirmReset}>
          <Text style={styles.deleteAccountText}>모든 데이터 삭제</Text>
        </Pressable>
      </ScrollView>

      <SupplementPickerModal
        visible={pickerOpen}
        existingNames={supps.map((s) => s.name)}
        onAdd={addByName}
        onClose={() => setPickerOpen(false)}
      />
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gridItem: {
    // 3 across: 3×31% + 2×8px gap fits within the content width on every phone
    // size (31.5% overflowed and wrapped to 2 columns).
    width: "31%",
    minHeight: 88,
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 16,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
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
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  refsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginTop: 14,
    padding: 14,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    ...hardShadow(),
  },
  refsIcon: { fontSize: 24 },
  refsBody: { flex: 1, gap: 2 },
  refsTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  refsSub: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 17, color: colors.muted3 },
  refsChevron: { fontFamily: fonts.display, fontSize: 22, color: colors.muted4 },
  disclaimerBlock: { marginTop: 14 },
  actionButton: {
    flex: 1,
    minHeight: 70,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 6,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...hardShadow(3, 4),
  },
  actionButtonAdd: { backgroundColor: "#eafcff" },
  actionIcon: { fontSize: 16 },
  actionText: {
    flexShrink: 1,
    fontFamily: fonts.display,
    fontSize: 12,
    lineHeight: 16,
    color: colors.ink,
  },
  logout: { marginTop: 14, alignItems: "center", paddingVertical: 6 },
  logoutText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  privacy: { alignItems: "center", paddingVertical: 7 },
  privacyText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted3,
    textDecorationLine: "underline",
  },
  deleteAccount: { alignItems: "center", paddingVertical: 8 },
  deleteAccountText: { fontFamily: fonts.body, fontSize: 12, color: "#b24355" },
  notifyCard: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 18,
    padding: 14,
    marginTop: 18,
    gap: 8,
    ...hardShadow(3, 4, 0.1),
  },
  notifyHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  notifyTitle: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  notifyHint: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 18, color: colors.muted2 },
  notifyEmpty: { fontFamily: fonts.body, fontSize: 12.5, color: colors.muted4, paddingVertical: 8 },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: colors.ink,
    backgroundColor: "#e9eef0",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  switchOn: { backgroundColor: colors.cyan },
  knob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    alignSelf: "flex-start",
  },
  knobOn: { alignSelf: "flex-end" },
  notifyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: "#eef2f4",
  },
  rowCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  rowCheckOn: { backgroundColor: colors.cyan },
  rowCheckMark: { fontFamily: fonts.display, fontSize: 12, color: colors.ink },
  rowName: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  stepper: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { fontFamily: fonts.display, fontSize: 13, color: colors.ink },
  timeText: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.ink,
    minWidth: 46,
    textAlign: "center",
  },
  timeOff: { color: colors.muted4 },
  localNote: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 17,
    color: colors.muted4,
    marginTop: 18,
    textAlign: "center",
  },
});
