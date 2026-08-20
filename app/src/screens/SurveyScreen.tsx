import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
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
import * as Haptics from "expo-haptics";
import { colors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { hardShadow } from "../theme/ui";
import Jelly from "../components/Jelly";
import { PillSwatch } from "../components/Pill";
import { QUESTIONS } from "../data/survey";
import { DOMAIN_LABELS, EVIDENCE_LABELS, type Answer } from "../data/types";
import { recommend, type Answers, type Recommendation, type SurveyResult } from "../logic/recommend";
import { useApp } from "../state/AppContext";
import { pillColor } from "../theme/colors";

type Step = "intro" | "quiz" | "freetext" | "loading" | "result";

const CHOICES: { key: Answer; label: string; emoji: string; tint: string }[] = [
  { key: "yes", label: "그렇다", emoji: "⭕️", tint: colors.cyan },
  { key: "unsure", label: "모르겠다", emoji: "🤔", tint: colors.yellow },
  { key: "no", label: "아니다", emoji: "❌", tint: colors.pink },
];

// The wait is theatre — the engine finishes in under a millisecond. It buys the
// result a beat of anticipation and keeps the reveal from feeling like a form
// submit. Kept short enough that repeat runs don't become a chore.
const LOADING_MS = 3000;
const LOADING_LINES = [
  "답변 꼼꼼히 읽는 중…",
  "컨디션 신호 맞춰보는 중…",
  "너한테 맞는 조합 고르는 중…",
];

export default function SurveyScreen() {
  const { supps, survey, completeSurvey, unlockedExprs, setScreen } = useApp();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>("intro");
  const [index, setIndex] = useState(0);
  // Seeded from the last run so retaking is a review, not a blank slate.
  const [answers, setAnswers] = useState<Answers>(() => survey?.answers ?? {});
  const [freeText, setFreeText] = useState(() => survey?.freeText ?? "");
  const [result, setResult] = useState<SurveyResult | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [line, setLine] = useState(0);

  const progress = useRef(new Animated.Value(0)).current;
  const question = QUESTIONS[index];
  const answeredCount = Object.keys(answers).length;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: (index + 1) / QUESTIONS.length,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [index, progress]);

  const answer = useCallback(
    (choice: Answer) => {
      Haptics.selectionAsync().catch(() => {});
      setAnswers((prev) => ({ ...prev, [question.id]: choice }));
      if (index + 1 < QUESTIONS.length) setIndex((i) => i + 1);
      else setStep("freetext");
    },
    [index, question]
  );

  // Run the engine, then hold the reveal for the theatrical beat above.
  const runAnalysis = useCallback(() => {
    setStep("loading");
    setLine(0);
    const computed = recommend(answers, {
      alreadyTaking: supps.map((s) => s.name),
      freeText,
    });
    const ticker = setInterval(
      () => setLine((l) => Math.min(l + 1, LOADING_LINES.length - 1)),
      LOADING_MS / LOADING_LINES.length
    );
    const timer = setTimeout(() => {
      clearInterval(ticker);
      setResult(computed);
      // Everything is pre-selected: the common case is "yes, add these".
      setPicked(new Set(computed.recommendations.map((r) => r.supplement.id)));
      setStep("result");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, LOADING_MS);
    return () => {
      clearInterval(ticker);
      clearTimeout(timer);
    };
  }, [answers, freeText, supps]);

  const finish = useCallback(() => {
    const picks = (result?.recommendations ?? []).filter((r) => picked.has(r.supplement.id));
    completeSurvey(answers, freeText, picks);
  }, [result, picked, answers, freeText, completeSurvey]);

  // ── intro ──
  if (step === "intro") {
    return (
      <Shell insets={insets}>
        <View style={styles.introWrap}>
          <Jelly mood="excited" width={128} expressions={unlockedExprs} />
          <Text style={styles.introTitle}>나에게 맞는 영양제 찾기</Text>
          <Text style={styles.introBody}>
            {QUESTIONS.length}개 질문에 <Text style={styles.bold}>그렇다 · 모르겠다 · 아니다</Text>로
            답하면, 컨디션 신호를 읽어서 딱 맞는 조합을 골라줄게.{"\n\n"}
            2~3분이면 끝나! 모르겠으면 <Text style={styles.bold}>모르겠다</Text>를 눌러도 괜찮아.
          </Text>
          <View style={styles.introFacts}>
            <Fact emoji="🔬" text="임상 근거 등급이 높은 성분을 우선 추천해요" />
            <Fact emoji="🔒" text="답변은 기기 안에만 저장되고 서버로 전송되지 않아요" />
            <Fact emoji="🩺" text="임신·복약 중이라면 결과에서 자동으로 제외해요" />
          </View>
          <Pressable style={styles.cta} onPress={() => setStep("quiz")}>
            <Text style={styles.ctaText}>시작하기</Text>
          </Pressable>
          {survey && (
            <Pressable onPress={() => setScreen("home")} hitSlop={10}>
              <Text style={styles.skipLink}>나중에 할래</Text>
            </Pressable>
          )}
        </View>
      </Shell>
    );
  }

  // ── quiz ──
  if (step === "quiz") {
    const current = answers[question.id];
    return (
      <Shell insets={insets}>
        <View style={styles.quizHeader}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {index + 1} / {QUESTIONS.length}
          </Text>
        </View>

        <View style={styles.quizBody}>
          <Text style={styles.sectionTag}>{question.section}</Text>
          <Text style={styles.questionText}>{question.text}</Text>
          {question.safetyFlag && (
            <Text style={styles.safetyHint}>
              안전을 위해 확인하는 질문이에요. 해당하면 관련 성분을 빼고 추천할게.
            </Text>
          )}
        </View>

        <View style={styles.choices}>
          {CHOICES.map((c) => {
            const active = current === c.key;
            return (
              <Pressable
                key={c.key}
                style={[
                  styles.choice,
                  { backgroundColor: active ? c.tint : colors.white },
                  active && styles.choiceActive,
                ]}
                onPress={() => answer(c.key)}
              >
                <Text style={styles.choiceEmoji}>{c.emoji}</Text>
                <Text style={styles.choiceLabel}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.quizNav}>
          <Pressable
            onPress={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            hitSlop={10}
          >
            <Text style={[styles.navLink, index === 0 && styles.navLinkOff]}>← 이전</Text>
          </Pressable>
          <Pressable onPress={() => setStep("freetext")} hitSlop={10}>
            <Text style={styles.navLink}>여기까지만 답할래 →</Text>
          </Pressable>
        </View>
      </Shell>
    );
  }

  // ── free text ──
  if (step === "freetext") {
    return (
      <Shell insets={insets}>
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.freeWrap} keyboardShouldPersistTaps="handled">
            <Jelly mood="curious" width={96} expressions={unlockedExprs} />
            <Text style={styles.introTitle}>더 하고 싶은 얘기 있어?</Text>
            <Text style={styles.introBody}>
              요즘 컨디션이나 신경 쓰이는 점을 편하게 적어줘.{"\n"}안 써도 결과는 나와!
            </Text>
            <TextInput
              style={styles.textarea}
              value={freeText}
              onChangeText={setFreeText}
              placeholder="예: 요즘 야근이 많아서 잠을 잘 못 자고 늘 피곤해요"
              placeholderTextColor="#b7c7ce"
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{freeText.length} / 300</Text>
            <Text style={styles.answeredNote}>
              {answeredCount}개 문항에 답했어 · 답하지 않은 문항은 계산에서 빠져
            </Text>
            <Pressable style={styles.cta} onPress={runAnalysis}>
              <Text style={styles.ctaText}>결과 보기</Text>
            </Pressable>
            <Pressable onPress={() => setStep("quiz")} hitSlop={10}>
              <Text style={styles.skipLink}>← 질문으로 돌아가기</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Shell>
    );
  }

  // ── loading (theatrical) ──
  if (step === "loading") {
    return (
      <Shell insets={insets}>
        <View style={styles.introWrap}>
          <Jelly mood="curious" width={132} interactive={false} expressions={unlockedExprs} />
          <Text style={styles.loadingText}>{LOADING_LINES[line]}</Text>
          <View style={styles.dots}>
            {LOADING_LINES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i <= line && { backgroundColor: colors.purple }]}
              />
            ))}
          </View>
        </View>
      </Shell>
    );
  }

  // ── result ──
  const r = result!;
  return (
    <Shell insets={insets}>
      <ScrollView contentContainerStyle={styles.resultWrap} showsVerticalScrollIndicator={false}>
        <View style={styles.badge}>
          <Text style={styles.badgeEmoji}>{r.profileEmoji}</Text>
          <Text style={styles.badgeLabel}>{r.profileLabel}</Text>
        </View>
        <Text style={styles.blurb}>{r.profileBlurb}</Text>

        {!!r.topDomains.length && (
          <View style={styles.chips}>
            {r.topDomains.map((d) => (
              <View key={d} style={styles.chip}>
                <Text style={styles.chipText}>#{DOMAIN_LABELS[d]}</Text>
              </View>
            ))}
            {r.freeTextSignals.map((s) => (
              <View key={s} style={[styles.chip, styles.chipSoft]}>
                <Text style={styles.chipText}>#{s}</Text>
              </View>
            ))}
          </View>
        )}

        {r.recommendations.length === 0 ? (
          <Text style={styles.emptyNote}>
            지금은 특별히 더할 게 안 보여! 이미 챙기고 있는 걸 잘 유지해보자 🥭
          </Text>
        ) : (
          <>
            <Text style={styles.sectionHead}>추천 조합 {r.recommendations.length}가지</Text>
            {r.recommendations.map((rec) => (
              <RecCard
                key={rec.supplement.id}
                rec={rec}
                checked={picked.has(rec.supplement.id)}
                onToggle={() =>
                  setPicked((prev) => {
                    const next = new Set(prev);
                    next.has(rec.supplement.id)
                      ? next.delete(rec.supplement.id)
                      : next.add(rec.supplement.id);
                    return next;
                  })
                }
              />
            ))}
          </>
        )}

        {!!r.excluded.length && (
          <View style={styles.excluded}>
            <Text style={styles.excludedHead}>🩺 안전을 위해 뺀 성분</Text>
            {r.excluded.slice(0, 6).map((e) => (
              <Text key={e.name} style={styles.excludedItem}>
                • {e.name} — {e.reason}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.disclaimer}>
          이 결과는 일반적인 영양 정보를 바탕으로 한 참고용 안내예요. 질병의 진단·치료·예방을
          목적으로 하지 않아요. 임신·수유 중이거나 약을 복용 중이라면 복용 전에 의사·약사와
          상의하세요.
        </Text>

        <Pressable style={styles.cta} onPress={finish}>
          <Text style={styles.ctaText}>
            {picked.size > 0 ? `${picked.size}개 담고 시작하기` : "그냥 시작하기"}
          </Text>
        </Pressable>
        <Pressable onPress={() => { setStep("intro"); setIndex(0); }} hitSlop={10}>
          <Text style={styles.skipLink}>다시 답해볼래</Text>
        </Pressable>
      </ScrollView>
    </Shell>
  );
}

function Shell({
  children,
  insets,
}: {
  children: React.ReactNode;
  insets: { top: number; bottom: number };
}) {
  return (
    <LinearGradient colors={["#e7f8ff", "#f6fcff"]} locations={[0, 0.6]} style={styles.fill}>
      <View style={[styles.fill, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
        {children}
      </View>
    </LinearGradient>
  );
}

function Fact({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.factRow}>
      <Text style={styles.factEmoji}>{emoji}</Text>
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

function RecCard({
  rec,
  checked,
  onToggle,
}: {
  rec: Recommendation;
  checked: boolean;
  onToggle: () => void;
}) {
  const s = rec.supplement;
  return (
    <Pressable style={[styles.card, checked && styles.cardOn]} onPress={onToggle}>
      <View style={styles.cardTop}>
        <PillSwatch color={pillColor[s.color] ?? colors.purple} width={44} height={22} />
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardName}>{s.name}</Text>
          <Text style={styles.cardIntake}>{rec.intake}</Text>
        </View>
        <View style={styles.matchWrap}>
          <Text style={styles.matchNum}>{rec.match}%</Text>
          <View style={[styles.check, checked && styles.checkOn]}>
            {checked && <Text style={styles.checkMark}>✓</Text>}
          </View>
        </View>
      </View>

      <Text style={styles.cardBenefit}>{s.benefit}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaTag}>🔬 {EVIDENCE_LABELS[s.evidence]}</Text>
        <Text style={styles.metaTag}>💊 {s.dose}</Text>
      </View>

      {!!rec.reasons.length && (
        <Text style={styles.cardReason}>
          이유: {rec.reasons.map((d) => DOMAIN_LABELS[d]).join(" · ")}
        </Text>
      )}

      {!!s.upperLimit && <Text style={styles.cardLimit}>상한 {s.upperLimit}</Text>}

      {s.cautions.slice(0, 2).map((c) => (
        <Text key={c} style={styles.caution}>• {c}</Text>
      ))}
      {rec.warnings.map((w) => (
        <Text key={w} style={styles.warning}>⚠️ {w}</Text>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },

  introWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 26, gap: 14 },
  introTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, textAlign: "center" },
  introBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted3,
    textAlign: "center",
  },
  bold: { fontFamily: fonts.display, color: colors.ink },
  introFacts: { alignSelf: "stretch", gap: 8, marginTop: 4 },
  factRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  factEmoji: { fontSize: 14 },
  factText: { flex: 1, fontFamily: fonts.body, fontSize: 12.5, lineHeight: 19, color: colors.muted2 },

  quizHeader: { paddingHorizontal: 22, gap: 8 },
  progressTrack: {
    height: 12,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.mango },
  progressText: { fontFamily: fonts.display, fontSize: 12, color: colors.muted2, textAlign: "right" },

  quizBody: { flex: 1, justifyContent: "center", paddingHorizontal: 26, gap: 12 },
  sectionTag: {
    alignSelf: "flex-start",
    fontFamily: fonts.display,
    fontSize: 12,
    color: colors.purpleDeep,
    backgroundColor: "#efe9ff",
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
  },
  questionText: { fontFamily: fonts.display, fontSize: 22, lineHeight: 32, color: colors.ink },
  safetyHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted2 },

  choices: { paddingHorizontal: 22, gap: 10 },
  choice: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 18,
    ...hardShadow(3, 4, 0.12),
  },
  choiceActive: { ...hardShadow(2, 2, 0.2) },
  choiceEmoji: { fontSize: 17 },
  choiceLabel: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },

  quizNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  navLink: { fontFamily: fonts.body, fontSize: 13, color: colors.muted2 },
  navLinkOff: { opacity: 0.3 },

  freeWrap: { alignItems: "center", paddingHorizontal: 26, paddingVertical: 20, gap: 12 },
  textarea: {
    alignSelf: "stretch",
    minHeight: 130,
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 18,
    padding: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.ink,
    ...hardShadow(3, 3, 0.08),
  },
  counter: { alignSelf: "flex-end", fontFamily: fonts.body, fontSize: 11, color: colors.muted4 },
  answeredNote: { fontFamily: fonts.body, fontSize: 12, color: colors.muted2, textAlign: "center" },

  loadingText: { fontFamily: fonts.display, fontSize: 17, color: colors.ink, marginTop: 8 },
  dots: { flexDirection: "row", gap: 7 },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },

  resultWrap: { paddingHorizontal: 20, paddingBottom: 34, gap: 10 },
  badge: {
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: colors.mangoLight,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 6,
    ...hardShadow(4, 5, 0.18),
  },
  badgeEmoji: { fontSize: 30 },
  badgeLabel: { fontFamily: fonts.display, fontSize: 21, color: colors.ink, marginTop: 4 },
  blurb: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted3,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 2 },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.ink,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chipSoft: { backgroundColor: "#f1ecff" },
  chipText: { fontFamily: fonts.display, fontSize: 11.5, color: colors.ink },

  sectionHead: { fontFamily: fonts.display, fontSize: 15, color: colors.ink, marginTop: 14 },
  emptyNote: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted3,
    textAlign: "center",
    marginVertical: 24,
  },

  card: {
    backgroundColor: colors.white,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 18,
    padding: 14,
    gap: 6,
    ...hardShadow(3, 4, 0.1),
  },
  cardOn: { backgroundColor: "#fffdf5" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitleWrap: { flex: 1 },
  cardName: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  cardIntake: { fontFamily: fonts.body, fontSize: 12, color: colors.muted2, marginTop: 1 },
  matchWrap: { alignItems: "center", gap: 5 },
  matchNum: { fontFamily: fonts.display, fontSize: 15, color: colors.purpleDeep },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: colors.ink,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: colors.cyan },
  checkMark: { fontFamily: fonts.display, fontSize: 14, color: colors.ink },
  cardBenefit: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.muted3 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaTag: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.muted2,
    backgroundColor: "#f3f7f9",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  cardReason: { fontFamily: fonts.body, fontSize: 12, color: colors.purpleDeep },
  cardLimit: { fontFamily: fonts.body, fontSize: 11.5, color: colors.muted4 },
  caution: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 18, color: colors.muted2 },
  warning: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.pinkText },

  excluded: {
    backgroundColor: "#fff6f9",
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 16,
    padding: 12,
    gap: 4,
    marginTop: 12,
  },
  excludedHead: { fontFamily: fonts.display, fontSize: 13, color: colors.ink },
  excludedItem: { fontFamily: fonts.body, fontSize: 11.5, lineHeight: 18, color: colors.muted3 },

  disclaimer: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 17,
    color: colors.muted4,
    marginTop: 16,
  },

  cta: {
    alignSelf: "stretch",
    marginTop: 16,
    height: 54,
    borderWidth: 2.5,
    borderColor: colors.ink,
    borderRadius: 18,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
    ...hardShadow(4, 5, 0.22),
  },
  ctaText: { fontFamily: fonts.display, fontSize: 17, color: colors.white },
  skipLink: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted2,
    textAlign: "center",
    marginTop: 10,
  },
});
