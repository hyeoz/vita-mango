import {
  ANSWER_WEIGHT,
  DOMAIN_LABELS,
  EVIDENCE_WEIGHT,
  intakeLabel,
  type Answer,
  type Domain,
  type SafetyFlag,
  type Supplement,
} from "../data/types";
import { QUESTIONS } from "../data/survey";
import { SUPPLEMENTS, findSupplement } from "../data/supplements";
import { scanFreeText } from "./freeText";

// ── The recommendation engine ────────────────────────────────────────────────
// Fully deterministic and on-device. Same answers always produce the same
// result, which is the point: it can be reviewed, unit-tested, and corrected,
// and it costs nothing to run.
//
// Three steps:
//   1. answers  → per-domain "need" scores, normalised 0–1
//   2. needs    → per-supplement fit, damped by how good the evidence is
//   3. fit      → ranked list, after safety exclusions and dedupe
//
// Normalising per domain matters: 수면 has 4 questions and 뼈 has 2, so raw
// sums would quietly make 수면 twice as loud. Dividing by each domain's total
// available weight puts every domain on the same 0–1 scale.

export type Answers = Record<string, Answer>;

export type Recommendation = {
  supplement: Supplement;
  /** Relative match, 0–99, for display. */
  match: number;
  /** Ranking value — fit × evidence weight. */
  score: number;
  /** Domains that drove this pick, strongest first. */
  reasons: Domain[];
  /** Safety notes triggered by the user's own answers. */
  warnings: string[];
  intake: string;
};

export type SurveyResult = {
  /** MBTI-ish label built from the two strongest needs. */
  profileLabel: string;
  profileEmoji: string;
  profileBlurb: string;
  /** Strongest domains, for the signal chips. */
  topDomains: Domain[];
  needs: Record<Domain, number>;
  flags: SafetyFlag[];
  recommendations: Recommendation[];
  /** Names excluded purely for safety, so the UI can say why. */
  excluded: { name: string; reason: string }[];
  /** Echoed back from the free-text box — colour, not scoring. */
  freeTextSignals: string[];
  answeredCount: number;
};

const DOMAIN_PERSONA: Record<Domain, { adj: string; noun: string; emoji: string }> = {
  sleep: { adj: "잠 설치는", noun: "밤샘러", emoji: "🌙" },
  stress: { adj: "잔뜩 긴장한", noun: "긴장러", emoji: "😮‍💨" },
  mood: { adj: "마음이 흐린", noun: "감성러", emoji: "🌧️" },
  fatigue: { adj: "방전된", noun: "번아웃러", emoji: "🔋" },
  immunity: { adj: "잔병치레 잦은", noun: "방어러", emoji: "🛡️" },
  gut: { adj: "속이 예민한", noun: "장트러블러", emoji: "🌀" },
  digestion: { adj: "더부룩한", noun: "소화러", emoji: "🍽️" },
  eye: { adj: "눈이 뻑뻑한", noun: "모니터러", emoji: "👀" },
  joint: { adj: "삐걱대는", noun: "관절러", emoji: "🦴" },
  muscle: { adj: "근육 쓰는", noun: "운동러", emoji: "💪" },
  bone: { adj: "뼈가 걱정인", noun: "골격러", emoji: "🦴" },
  cardio: { adj: "심장이 신경쓰이는", noun: "혈관러", emoji: "❤️" },
  circulation: { adj: "손발이 찬", noun: "순환러", emoji: "🧊" },
  cholesterol: { adj: "수치가 신경쓰이는", noun: "관리러", emoji: "📈" },
  bloodsugar: { adj: "혈당이 신경쓰이는", noun: "밸런스러", emoji: "🍬" },
  skin: { adj: "피부가 건조한", noun: "보습러", emoji: "✨" },
  hair: { adj: "머릿결 고민인", noun: "모발러", emoji: "💇" },
  liver: { adj: "간이 고생한", noun: "해독러", emoji: "🍺" },
  cognition: { adj: "깜빡깜빡하는", noun: "집중러", emoji: "🧠" },
  anemia: { adj: "어지러운", noun: "철분러", emoji: "🩸" },
  womens: { adj: "주기가 버거운", noun: "컨디션러", emoji: "🌸" },
  mens: { adj: "밤이 번거로운", noun: "중년러", emoji: "🌛" },
  respiratory: { adj: "목이 칼칼한", noun: "호흡러", emoji: "🫁" },
  antioxidant: { adj: "식단이 아쉬운", noun: "균형러", emoji: "🥗" },
};

const ALL_DOMAINS = Object.keys(DOMAIN_LABELS) as Domain[];

/** Total weight each domain can possibly collect — the per-domain denominator. */
const DOMAIN_CAPACITY: Record<Domain, number> = (() => {
  const cap = Object.fromEntries(ALL_DOMAINS.map((d) => [d, 0])) as Record<Domain, number>;
  for (const q of QUESTIONS) {
    for (const [d, w] of Object.entries(q.domains)) {
      cap[d as Domain] += w as number;
    }
  }
  return cap;
})();

/** Step 1 — answers to normalised per-domain need scores. */
export function computeNeeds(answers: Answers): Record<Domain, number> {
  const raw = Object.fromEntries(ALL_DOMAINS.map((d) => [d, 0])) as Record<Domain, number>;

  for (const q of QUESTIONS) {
    const answer = answers[q.id];
    if (!answer) continue;
    // Positively-phrased habit questions score on "아니다": not eating vegetables
    // is the signal, eating them is not. "모르겠다" stays a soft nudge either way.
    const weight = q.invert
      ? ANSWER_WEIGHT[answer === "yes" ? "no" : answer === "no" ? "yes" : "unsure"]
      : ANSWER_WEIGHT[answer];
    if (weight === 0) continue;
    for (const [d, w] of Object.entries(q.domains)) {
      raw[d as Domain] += weight * (w as number);
    }
  }

  const needs = {} as Record<Domain, number>;
  for (const d of ALL_DOMAINS) {
    needs[d] = DOMAIN_CAPACITY[d] > 0 ? Math.min(1, raw[d] / DOMAIN_CAPACITY[d]) : 0;
  }
  return needs;
}

/** Safety questions answered "그렇다" become exclusion flags. */
export function collectFlags(answers: Answers): SafetyFlag[] {
  const flags: SafetyFlag[] = [];
  for (const q of QUESTIONS) {
    if (q.safetyFlag && answers[q.id] === "yes") flags.push(q.safetyFlag);
  }
  return flags;
}

/**
 * Step 2+3 — score every supplement against the needs, drop unsafe ones, rank.
 *
 * `alreadyTaking` names are skipped: recommending what someone already takes is
 * noise, and it is the single most common way this kind of feature feels dumb.
 */
export function recommend(
  answers: Answers,
  opts: { alreadyTaking?: string[]; freeText?: string; limit?: number } = {}
): SurveyResult {
  const { alreadyTaking = [], freeText = "", limit = 5 } = opts;

  const needs = computeNeeds(answers);
  const flags = collectFlags(answers);
  const taken = new Set(
    alreadyTaking.map((n) => findSupplement(n)?.id).filter(Boolean) as string[]
  );

  const scan = scanFreeText(freeText);
  // Free text nudges rather than decides — the survey is the real instrument.
  for (const [d, bump] of Object.entries(scan.domainBumps)) {
    const key = d as Domain;
    needs[key] = Math.min(1, needs[key] + (bump as number));
  }

  const excluded: { name: string; reason: string }[] = [];
  const scored: Recommendation[] = [];

  for (const s of SUPPLEMENTS) {
    if (taken.has(s.id)) continue;

    if (s.prescriptionOnlyKR) {
      excluded.push({ name: s.name, reason: "국내에서는 처방이 필요한 성분이에요" });
      continue;
    }

    const blocking = s.avoidIf.filter((f) => flags.includes(f));
    if (blocking.length) {
      excluded.push({
        name: s.name,
        reason: `${blocking.map((f) => SAFETY_REASON[f]).join(", ")} 때문에 제외했어요`,
      });
      continue;
    }

    let fit = 0;
    let capacity = 0;
    const hits: { domain: Domain; strength: number }[] = [];
    for (const [d, cover] of Object.entries(s.domains)) {
      const domain = d as Domain;
      const c = cover as number;
      capacity += c;
      const contribution = needs[domain] * c;
      fit += contribution;
      if (needs[domain] >= 0.2 && c >= 0.4) hits.push({ domain, strength: contribution });
    }
    if (fit <= 0 || !hits.length) continue;

    const evidence = EVIDENCE_WEIGHT[s.evidence];
    // "Of everything this supplement is good at, how much do the answers
    // actually call for" — plus a small bonus for covering several needs at
    // once, so a broad fit isn't beaten by a one-trick match. Relative
    // guidance for ordering, not a clinical claim.
    const focus = fit / capacity;
    const breadth = 1 + 0.15 * Math.min(1, hits.length / 3);
    const match = Math.max(1, Math.min(99, Math.round(focus * evidence * breadth * 100)));
    // Rank by the number we display. Ordering that disagrees with the score on
    // screen reads as a bug, so there is exactly one value driving both; `fit`
    // only breaks ties between equal matches.
    const score = match + Math.min(0.99, fit / 100);

    scored.push({
      supplement: s,
      score,
      match,
      reasons: hits.sort((a, b) => b.strength - a.strength).map((h) => h.domain).slice(0, 3),
      warnings: buildWarnings(s, flags),
      intake: intakeLabel(s),
    });
  }

  scored.sort((a, b) => b.score - a.score);

  const topDomains = ALL_DOMAINS.filter((d) => needs[d] > 0)
    .sort((a, b) => needs[b] - needs[a])
    .slice(0, 3);

  return {
    ...buildProfile(topDomains, needs),
    topDomains,
    needs,
    flags,
    recommendations: scored.slice(0, limit),
    excluded,
    freeTextSignals: scan.signals,
    answeredCount: Object.keys(answers).length,
  };
}

const SAFETY_REASON: Record<SafetyFlag, string> = {
  pregnancy: "임신·수유 중",
  anticoagulant: "항응고제 복용",
  kidney: "신장 질환",
  thyroidMed: "갑상선약 복용",
  hormoneSensitive: "호르몬 민감 질환",
  surgerySoon: "수술 예정",
};

function buildWarnings(s: Supplement, flags: SafetyFlag[]): string[] {
  const out: string[] = [];
  for (const f of s.warnIf) {
    if (flags.includes(f)) out.push(`${SAFETY_REASON[f]} 중이라면 복용 전 전문가와 상의하세요.`);
  }
  return out;
}

function buildProfile(top: Domain[], needs: Record<Domain, number>) {
  if (!top.length || needs[top[0]] < 0.15) {
    return {
      profileLabel: "균형 잡힌 타입",
      profileEmoji: "🥭",
      profileBlurb: "특별히 튀는 신호가 없어요. 지금 컨디션을 잘 유지하고 있는 편이에요!",
    };
  }
  const first = DOMAIN_PERSONA[top[0]];
  const second = top[1] ? DOMAIN_PERSONA[top[1]] : first;
  return {
    profileLabel: `${first.adj} ${second.noun}`,
    profileEmoji: first.emoji,
    profileBlurb: `답변을 보니 ${DOMAIN_LABELS[top[0]]}${
      top[1] ? ` · ${DOMAIN_LABELS[top[1]]}` : ""
    } 쪽 신호가 제일 뚜렷해. 거기부터 챙겨보자!`,
  };
}
