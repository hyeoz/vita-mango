import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../i18n/components";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, pillColor } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { hardShadow } from "../theme/ui";
import Jelly from "../components/Jelly";
import { FloatingPill, PillSwatch } from "../components/Pill";
import Bouncy from "../components/Bouncy";
import RadarChart from "../components/RadarChart";
import Disclaimer from "../components/Disclaimer";
import SourceLink from "../components/SourceLink";
import { sourcesFor, NO_FACTSHEET_NOTE } from "../data/sources";
import { useApp, suppFromRecommendation } from "../state/AppContext";
import { DOMAIN_LABELS, EVIDENCE_LABELS } from "../data/types";
import { AXIS_SHORT, type Axis } from "../data/axes";
import type { Recommendation } from "../logic/recommend";
import { formatList, useI18n } from "../i18n";

// The recommendation tab. Everything shown here is computed on the device from
// the saved survey answers — no network call, no cost, no spinner. The result
// recomputes whenever the supplement list or recent diaries change, so adding
// something makes it drop off the list immediately.

function daysSince(ms: number): number {
  return Math.max(0, Math.floor((Date.now() - ms) / 86_400_000));
}

export default function AiScreen() {
  const { t, m } = useI18n();
  const { survey, result, supps, addByName, startSurvey, unlockedExprs } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={["#f1ecff", "#fbf7ff"]} locations={[0, 0.6]} style={styles.fill}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🔮 젤리의 맞춤 분석</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <FloatingPill
            color="yellow"
            size={34}
            rotate={0}
            delay={0}
            style={{ position: "absolute", top: 18, left: 46 }}
          />
          <FloatingPill
            color="cyan"
            size={34}
            rotate={0}
            delay={400}
            style={{ position: "absolute", top: 24, right: 50 }}
          />
          <View style={styles.jellyWrap}>
            <Jelly mood="excited" width={124} expressions={unlockedExprs} />
          </View>
        </View>

        {!survey || !result ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>아직 분석 결과가 없어</Text>
            <Text style={styles.emptyBody}>
              50개 질문에 답하면 컨디션 신호를 읽어서 딱 맞는 영양제를 골라줄게. 2~3분이면 끝나!
            </Text>
            <Bouncy style={styles.cta} haptic="medium" onPress={startSurvey}>
              <Text style={styles.ctaText}>영양제 추천받기</Text>
            </Bouncy>
          </View>
        ) : (
          <>
            <View style={styles.profile}>
              <Text style={styles.profileEmoji}>{result.profileEmoji}</Text>
              <Text style={styles.profileLabel}>{result.profileLabel}</Text>
              <Text style={styles.profileMeta}>
                {daysSince(survey.takenAt) === 0
                  ? t("오늘 받은 결과")
                  : m("daysAgo", { count: daysSince(survey.takenAt) })}
              </Text>
            </View>

            <Text style={styles.blurb}>{result.profileBlurb}</Text>

            <View style={styles.radarCard}>
              <Text style={styles.radarTitle}>내 컨디션 능력치</Text>
              <RadarChart
                scores={result.axisScores}
                projected={result.projectedAxisScores}
                size={262}
              />
              <Text style={styles.radarNote}>
                점선은 아래 추천을 모두 챙겼을 때예요. 점수가 높을수록 그 영역에 부족한
                신호가 적어요.
              </Text>
            </View>

            <View style={styles.chips}>
              {result.topDomains.map((d) => (
                <View key={d} style={styles.chip}>
                  <Text style={styles.chipText}>#{DOMAIN_LABELS[d]}</Text>
                </View>
              ))}
              {result.freeTextSignals.map((s) => (
                <View key={s} style={[styles.chip, styles.chipSoft]}>
                  <Text style={styles.chipText}>#{s}</Text>
                </View>
              ))}
            </View>

            {result.recommendations.length === 0 ? (
              <Text style={styles.allSet}>
                지금 챙기는 걸로 충분해 보여! 잘 유지하고 있어 🥭
              </Text>
            ) : (
              <>
                <Text style={styles.sectionHead}>이건 어때?</Text>
                {result.recommendations.map((rec) => (
                  <RecCard
                    key={rec.supplement.id}
                    rec={rec}
                    added={supps.some((s) => s.name === rec.supplement.name)}
                    onAdd={() => addByName(rec.supplement.name)}
                  />
                ))}
              </>
            )}

            <Disclaimer variant="short" style={styles.disclaimerBlock} />

            <Bouncy style={styles.secondary} haptic="medium" onPress={startSurvey}>
              <Text style={styles.secondaryText}>다시 추천받기</Text>
            </Bouncy>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function RecCard({
  rec,
  added,
  onAdd,
}: {
  rec: Recommendation;
  added: boolean;
  onAdd: () => void;
}) {
  const { t, m } = useI18n();
  const s = rec.supplement;
  const lifts = Object.entries(rec.axisLift) as [Axis, number][];
  const sourceInfo = sourcesFor(s.id);
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <PillSwatch color={pillColor[s.color] ?? colors.purple} width={44} height={22} />
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardName}>{s.name}</Text>
          <Text style={styles.cardIntake}>{rec.intake}</Text>
        </View>
        <Text style={styles.matchNum}>{rec.match}%</Text>
      </View>

      <Text style={styles.cardBenefit}>{s.benefit}</Text>

      {!!lifts.length && (
        <View style={styles.lifts}>
          {lifts
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([axis, delta]) => (
              <View key={axis} style={styles.liftRow}>
                <Text style={styles.liftLabel}>{AXIS_SHORT[axis]}</Text>
                <View style={styles.liftTrack}>
                  <View style={[styles.liftFill, { width: `${Math.min(100, delta * 3)}%` }]} />
                </View>
                <Text style={styles.liftValue}>+{delta}</Text>
              </View>
            ))}
        </View>
      )}

      <View style={styles.metaRow}>
        <Text style={styles.metaTag}>🔬 {EVIDENCE_LABELS[s.evidence]}</Text>
        <Text style={styles.metaTag}>💊 {s.dose}</Text>
      </View>

      {!!rec.reasons.length && (
        <Text style={styles.cardReason}>
          이유: {formatList(rec.reasons.map((d) => t(DOMAIN_LABELS[d])))}
        </Text>
      )}

      {!!rec.overlapsWith.length && (
        <Text style={styles.overlap}>
          {m("overlap", {
            names: formatList(rec.overlapsWith.map(t)),
            match: rec.soloMatch,
          })}
        </Text>
      )}

      {s.cautions.slice(0, 1).map((c) => (
        <Text key={c} style={styles.caution}>• {c}</Text>
      ))}
      {rec.warnings.map((w) => (
        <Text key={w} style={styles.warning}>⚠️ {w}</Text>
      ))}

      {/* Guideline 1.4.1: the claim and its citation belong on the same card,
          not one screen away. */}
      <View style={styles.sourceBox}>
        <Text style={styles.sourceTitle}>📚 이 성분의 출처</Text>
        {!sourceInfo.hasOwn && <Text style={styles.sourceNote}>{NO_FACTSHEET_NOTE}</Text>}
        {sourceInfo.sources.map((src) => (
          <SourceLink key={src.url + src.label} source={src} />
        ))}
      </View>

      <Bouncy
        scaleTo={0.97}
        style={[styles.addBtn, added && styles.addBtnOff]}
        onPress={onAdd}
        disabled={added}
      >
        <Text style={styles.addBtnText}>{added ? "담겼어 ✓" : "내 영양제에 담기"}</Text>
      </Bouncy>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 30, gap: 8 },
  badgeRow: { alignItems: "center" },
  badge: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    ...hardShadow(3, 3, 0.1),
  },
  badgeText: { fontFamily: fonts.display, fontSize: 13, color: colors.ink },
  hero: { height: 150 },
  jellyWrap: { position: "absolute", left: "50%", top: 10, marginLeft: -62 },

  emptyCard: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 20,
    padding: 20,
    gap: 10,
    alignItems: "center",
    ...hardShadow(4, 5, 0.12),
  },
  emptyTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.muted3,
    textAlign: "center",
  },

  profile: { alignItems: "center", gap: 2, marginTop: 4 },
  profileEmoji: { fontSize: 30 },
  profileLabel: { fontFamily: fonts.display, fontSize: 21, color: colors.ink },
  profileMeta: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted4 },
  blurb: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.muted3,
    textAlign: "center",
    paddingHorizontal: 6,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 4 },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chipSoft: { backgroundColor: "#efe9ff" },
  chipText: { fontFamily: fonts.display, fontSize: 11.5, color: colors.ink },

  radarCard: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginTop: 10,
    alignItems: "center",
    gap: 8,
    ...hardShadow(4, 5, 0.12),
  },
  radarTitle: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
  radarNote: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 17,
    color: colors.muted4,
    textAlign: "center",
    paddingHorizontal: 6,
  },
  lifts: { gap: 5, marginTop: 2 },
  liftRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  liftLabel: { fontFamily: fonts.display, fontSize: 11, color: colors.muted2, width: 44 },
  liftTrack: {
    flex: 1,
    height: 8,
    borderRadius: 5,
    backgroundColor: "#eef1f4",
    borderWidth: 1.5,
    borderColor: colors.ink,
    overflow: "hidden",
  },
  liftFill: { height: "100%", backgroundColor: colors.mango },
  liftValue: { fontFamily: fonts.display, fontSize: 11.5, color: colors.mangoDeep, width: 26 },
  overlap: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 18, color: colors.muted2 },
  sectionHead: { fontFamily: fonts.display, fontSize: 15, color: colors.ink, marginTop: 14 },
  allSet: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted3,
    textAlign: "center",
    marginVertical: 22,
  },

  card: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 18,
    padding: 14,
    gap: 6,
    marginTop: 8,
    ...hardShadow(3, 4, 0.1),
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitleWrap: { flex: 1 },
  cardName: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  cardIntake: { fontFamily: fonts.body, fontSize: 12, color: colors.muted2, marginTop: 1 },
  matchNum: { fontFamily: fonts.display, fontSize: 15, color: colors.purpleDeep },
  cardBenefit: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.muted3 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaTag: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.muted2,
    backgroundColor: "#f5f2fb",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  cardReason: { fontFamily: fonts.body, fontSize: 12, color: colors.purpleDeep },
  caution: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 18, color: colors.muted2 },
  warning: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.pinkText },
  addBtn: {
    marginTop: 6,
    height: 44,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 14,
    backgroundColor: colors.cyan,
    alignItems: "center",
    justifyContent: "center",
    ...hardShadow(3, 3, 0.15),
  },
  addBtnOff: { backgroundColor: "#e9eef0", opacity: 0.7 },
  addBtnText: { fontFamily: fonts.display, fontSize: 14, color: colors.ink },

  disclaimerBlock: { marginTop: 18 },
  sourceBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: colors.muted4,
    gap: 2,
  },
  sourceTitle: { fontFamily: fonts.display, fontSize: 13, color: colors.ink },
  sourceNote: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted2,
  },
  cta: {
    alignSelf: "stretch",
    marginTop: 6,
    height: 50,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 18,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
    ...hardShadow(4, 5, 0.22),
  },
  ctaText: { fontFamily: fonts.display, fontSize: 16, color: colors.white },
  secondary: {
    marginTop: 12,
    height: 50,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 18,
    backgroundColor: colors.mangoLight,
    alignItems: "center",
    justifyContent: "center",
    ...hardShadow(4, 4, 0.16),
  },
  secondaryText: { fontFamily: fonts.display, fontSize: 15, color: colors.ink },
});
