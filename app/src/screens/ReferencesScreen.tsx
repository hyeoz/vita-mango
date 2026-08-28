import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, pillColor } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { hardShadow } from "../theme/ui";
import Bouncy from "../components/Bouncy";
import { PillSwatch } from "../components/Pill";
import SourceLink from "../components/SourceLink";
import { useApp } from "../state/AppContext";
import { SUPPLEMENTS } from "../data/supplements";
import { EVIDENCE_LABELS, EVIDENCE_WEIGHT, type Evidence } from "../data/types";
import {
  INTRO_TEXT,
  NO_FACTSHEET_NOTE,
  PRIMARY_SOURCES,
  SELF_CLASSIFICATION_NOTICE,
  SOURCES_CHECKED_ON,
  sourcesFor,
} from "../data/sources";

// The citations screen App Review asked for. Reachable from the 마이 tab and
// from every disclaimer block, so "easy for the user to find" holds no matter
// which screen the reviewer starts on.

const GRADE_TEXT: Record<Evidence, string> = {
  A: "사람 대상 무작위배정 임상시험·메타분석에서 일관된 결과가 보고된 성분이에요.",
  B: "사람 대상 연구는 있지만 결과가 엇갈리거나 적용 범위가 좁은 성분이에요.",
  C: "연구가 초기 단계이거나 전통적으로 사용해 온 근거가 주된 성분이에요.",
};

const GRADES: Evidence[] = ["A", "B", "C"];

export default function ReferencesScreen() {
  const { setScreen } = useApp();
  const insets = useSafeAreaInsets();

  const counts = GRADES.reduce<Record<Evidence, number>>(
    (acc, g) => {
      acc[g] = SUPPLEMENTS.filter((s) => s.evidence === g).length;
      return acc;
    },
    { A: 0, B: 0, C: 0 }
  );

  return (
    <LinearGradient colors={["#f1ecff", colors.cream]} locations={[0, 0.5]} style={styles.fill}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headRow}>
          <Bouncy scaleTo={0.9} haptic="selection" style={styles.back} onPress={() => setScreen("my")}>
            <Text style={styles.backText}>‹ 뒤로</Text>
          </Bouncy>
        </View>

        <Text style={styles.title}>📚 근거 및 출처</Text>
        <Text style={styles.intro}>{INTRO_TEXT}</Text>

        {/* ── 참고한 기관 ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>참고한 자료</Text>
          {PRIMARY_SOURCES.map((s) => (
            <SourceLink key={s.url + s.label} source={s} />
          ))}
        </View>

        {/* ── 등급 기준 ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>근거 등급 기준</Text>
          {GRADES.map((g) => (
            <View key={g} style={styles.gradeRow}>
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeBadgeText}>{g}</Text>
              </View>
              <View style={styles.gradeBody}>
                <Text style={styles.gradeLabel}>
                  {EVIDENCE_LABELS[g]} · {counts[g]}종
                </Text>
                <Text style={styles.gradeDesc}>{GRADE_TEXT[g]}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.weightNote}>
            등급은 추천 점수에 가중치로만 반영돼요 (A {EVIDENCE_WEIGHT.A} · B {EVIDENCE_WEIGHT.B} · C{" "}
            {EVIDENCE_WEIGHT.C}).
          </Text>
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{SELF_CLASSIFICATION_NOTICE}</Text>
          </View>
        </View>

        {/* ── 성분별 출처 ── */}
        <Text style={styles.sectionTitle}>성분별 출처 ({SUPPLEMENTS.length}종)</Text>
        {SUPPLEMENTS.map((s) => {
          const { sources, hasOwn } = sourcesFor(s.id);
          return (
            <View key={s.id} style={styles.card}>
              <View style={styles.suppHead}>
                <PillSwatch color={pillColor[s.color] ?? colors.purple} width={38} height={19} />
                <Text style={styles.suppName}>{s.name}</Text>
                <Text style={styles.suppGrade}>{EVIDENCE_LABELS[s.evidence]}</Text>
              </View>
              {!hasOwn && <Text style={styles.noFactsheet}>{NO_FACTSHEET_NOTE}</Text>}
              {sources.map((src) => (
                <SourceLink key={s.id + src.url + src.label} source={src} />
              ))}
            </View>
          );
        })}

        <Text style={styles.checked}>링크 최종 확인일 · {SOURCES_CHECKED_ON}</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 12 },
  headRow: { flexDirection: "row" },
  back: {
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.white,
    ...hardShadow(2, 3),
  },
  backText: { fontFamily: fonts.display, fontSize: 13, color: colors.ink },
  title: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  intro: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.muted3 },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.ink,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 20,
    padding: 15,
    gap: 2,
    ...hardShadow(),
  },
  cardTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.ink, marginBottom: 4 },
  gradeRow: { flexDirection: "row", gap: 10, paddingVertical: 7, alignItems: "flex-start" },
  gradeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.mangoLight,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeBadgeText: { fontFamily: fonts.display, fontSize: 13, color: colors.ink },
  gradeBody: { flex: 1, gap: 2 },
  gradeLabel: { fontFamily: fonts.display, fontSize: 14, color: colors.ink },
  gradeDesc: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted3 },
  weightNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted3,
    marginTop: 4,
  },
  noticeBox: {
    marginTop: 10,
    padding: 11,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.mango,
    backgroundColor: "#fff6e4",
  },
  noticeText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted3 },
  suppHead: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 4 },
  suppName: { flex: 1, fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  suppGrade: { fontFamily: fonts.body, fontSize: 11, color: colors.muted2 },
  noFactsheet: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.muted2,
    marginBottom: 2,
  },
  checked: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    textAlign: "center",
    marginTop: 6,
  },
});
