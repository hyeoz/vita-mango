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
import { AXES, AXIS_DOMAINS, DOMAIN_AXIS, type Axis } from "../data/axes";
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
  /**
   * 0–99. How much this adds *on top of the picks above it* — not raw personal
   * fit. Two magnesium-shaped supplements both matching you at 80 would be a
   * useless list, so the second one's number reflects what it still adds.
   */
  match: number;
  /** Raw personal fit before overlap is discounted, for the overlap note. */
  soloMatch: number;
  /** Ranking value. Always agrees with `match`. */
  score: number;
  /** Domains that drove this pick, strongest first. */
  reasons: Domain[];
  /** Already-picked names covering the same ground, if that cut the score. */
  overlapsWith: string[];
  /** Per-axis stat gain, 0–100 scale, for the "능력치" rows. */
  axisLift: Partial<Record<Axis, number>>;
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
  /** Current capability per macro axis, 0–100 (higher is better). */
  axisScores: Record<Axis, number>;
  /** Same axes after the recommended set, so the radar can show the lift. */
  projectedAxisScores: Record<Axis, number>;
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

  // ── candidate pool ─────────────────────────────────────────────────────────
  type Candidate = {
    supplement: Supplement;
    capacity: number;
    soloFit: number;
    soloValue: number;
  };
  const pool: Candidate[] = [];

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

    let soloFit = 0;
    let capacity = 0;
    for (const [d, cover] of Object.entries(s.domains)) {
      const c = cover as number;
      capacity += c;
      soloFit += needs[d as Domain] * c;
    }
    if (soloFit <= 0 || capacity <= 0) continue;
    pool.push({
      supplement: s,
      capacity,
      soloFit,
      soloValue: valueOf(soloFit, capacity, s),
    });
  }

  // ── greedy selection with overlap discounting ──────────────────────────────
  // Ranking each candidate independently gives a list where the top five are
  // all the same idea — three sleep aids for someone who answered "잠을 못
  // 자요". A nutritionist would cover the sleep need once and spend the rest of
  // the list elsewhere. So each pick saturates the needs it covers before the
  // next one is scored: whoever is left competes for what is actually still
  // unmet. `match` is that marginal score, which is also what gets displayed,
  // so the order on screen always matches the numbers on screen.
  const SATURATION = 0.7;
  const remaining: Record<Domain, number> = { ...needs };
  type Picked = Recommendation & { rawValue: number; soloValue: number };
  const chosen: Picked[] = [];
  const used = new Set<string>();

  while (chosen.length < limit) {
    let best: { cand: Candidate; fit: number; value: number } | null = null;

    for (const cand of pool) {
      if (used.has(cand.supplement.id)) continue;
      let fit = 0;
      for (const [d, cover] of Object.entries(cand.supplement.domains)) {
        fit += remaining[d as Domain] * (cover as number);
      }
      if (fit <= 0) continue;
      const hits = countHits(cand.supplement, remaining);
      if (!hits) continue;
      const value = valueOf(fit, cand.capacity, cand.supplement);
      if (!best || value > best.value) best = { cand, fit, value };
    }
    if (!best) break;

    const { supplement } = best.cand;
    used.add(supplement.id);

    // Name whoever already covers this ground, so a lower number reads as
    // "you're covered" rather than "this is a bad match".
    const overlapsWith = chosen
      .filter((prev) =>
        Object.keys(supplement.domains).some(
          (d) =>
            (prev.supplement.domains[d as Domain] ?? 0) >= 0.5 &&
            (supplement.domains[d as Domain] ?? 0) >= 0.5 &&
            needs[d as Domain] >= 0.2
        )
      )
      .map((prev) => prev.supplement.name);

    chosen.push({
      supplement,
      match: 0, // filled in below, once the reference is known
      soloMatch: 0,
      score: 0,
      rawValue: best.value,
      soloValue: best.cand.soloValue,
      reasons: hitList(supplement, remaining),
      overlapsWith,
      axisLift: axisLiftOf(supplement, remaining),
      warnings: buildWarnings(supplement, flags),
      intake: intakeLabel(supplement),
    });

    for (const [d, cover] of Object.entries(supplement.domains)) {
      const key = d as Domain;
      remaining[key] = remaining[key] * (1 - (cover as number) * SATURATION);
    }
  }

  // Percentages are relative to the strongest pick, so they are only knowable
  // once selection is done.
  const reference = chosen.length ? chosen[0].rawValue : 0;
  const recommendations: Recommendation[] = chosen.map((c) => {
    const match = matchFrom(c.rawValue, reference);
    const soloMatch = matchFrom(c.soloValue, reference);
    return {
      supplement: c.supplement,
      match,
      soloMatch,
      score: match,
      reasons: c.reasons,
      // Only call it overlap when the discount is big enough to notice.
      overlapsWith: soloMatch - match >= 8 ? c.overlapsWith : [],
      axisLift: c.axisLift,
      warnings: c.warnings,
      intake: c.intake,
    };
  });

  const topDomains = ALL_DOMAINS.filter((d) => needs[d] > 0)
    .sort((a, b) => needs[b] - needs[a])
    .slice(0, 3);

  return {
    ...buildProfile(topDomains, needs),
    topDomains,
    needs,
    axisScores: axisScoresFrom(needs),
    projectedAxisScores: axisScoresFrom(
      projectNeeds(needs, chosen.map((c) => c.supplement))
    ),
    flags,
    recommendations,
    excluded,
    freeTextSignals: scan.signals,
    answeredCount: Object.keys(answers).length,
  };
}

/** Domains where the need is real and this supplement genuinely covers it. */
function countHits(s: Supplement, needs: Record<Domain, number>): number {
  let n = 0;
  for (const [d, cover] of Object.entries(s.domains)) {
    if (needs[d as Domain] >= 0.2 && (cover as number) >= 0.4) n += 1;
  }
  return n;
}

function hitList(s: Supplement, needs: Record<Domain, number>): Domain[] {
  return (Object.entries(s.domains) as [Domain, number][])
    .filter(([d, c]) => needs[d] >= 0.2 && c >= 0.4)
    .sort((a, b) => needs[b[0]] * b[1] - needs[a[0]] * a[1])
    .map(([d]) => d)
    .slice(0, 3);
}

/**
 * How much this supplement actually does for you, in absolute terms.
 *
 * The obvious metric — "what fraction of this pill's abilities do you need" —
 * structurally punishes broad products: a multivitamin covering three of your
 * five gaps scores below a selenium tablet covering one gap perfectly, because
 * the multivitamin also does things you don't need. That is backwards. A
 * dietitian ranks by benefit delivered.
 *
 * So value is mostly absolute coverage (`fit`), nudged by focus so a shotgun
 * formula doesn't win on breadth alone, and damped by evidence grade.
 */
function valueOf(fit: number, capacity: number, s: Supplement): number {
  const focus = capacity > 0 ? fit / capacity : 0;
  return fit * EVIDENCE_WEIGHT[s.evidence] * (0.6 + 0.4 * focus);
}

/**
 * Display percentage, relative to the strongest pick in this same run. An
 * absolute scale would read 12% for a perfectly sensible recommendation just
 * because the user has few complaints; relative keeps the list legible while
 * preserving the gaps between entries.
 */
function matchFrom(value: number, reference: number): number {
  if (reference <= 0) return 1;
  return Math.max(5, Math.min(99, Math.round((value / reference) * 96)));
}

// ── Macro-axis capability ────────────────────────────────────────────────────
// The radar shows capability (higher is better), not deficit, because "능력치"
// is how people read a stat chart. Need is mapped onto a 30–100 band rather
// than 0–100: a run where everything is a problem should still draw a readable
// hexagon instead of collapsing to a dot.
const AXIS_FLOOR = 30;

function axisScoresFrom(needs: Record<Domain, number>): Record<Axis, number> {
  const out = {} as Record<Axis, number>;
  for (const axis of AXES) {
    const domains = AXIS_DOMAINS[axis];
    const avg = domains.length
      ? domains.reduce((sum, d) => sum + needs[d], 0) / domains.length
      : 0;
    out[axis] = Math.round(100 - avg * (100 - AXIS_FLOOR));
  }
  return out;
}

/**
 * What the axes would look like after taking the recommended set. Supplements
 * support, they don't cure, so coverage buys back a fraction of the need.
 */
const SUPPLEMENT_EFFECT = 0.55;

function projectNeeds(
  needs: Record<Domain, number>,
  supps: Supplement[]
): Record<Domain, number> {
  const out = { ...needs };
  for (const s of supps) {
    for (const [d, cover] of Object.entries(s.domains)) {
      const key = d as Domain;
      out[key] = out[key] * (1 - (cover as number) * SUPPLEMENT_EFFECT);
    }
  }
  return out;
}

/**
 * Axis scores for an arbitrary subset — lets the result screen redraw the
 * projection live as the user ticks recommendations on and off.
 */
export function projectAxes(
  needs: Record<Domain, number>,
  supps: Supplement[]
): Record<Axis, number> {
  return axisScoresFrom(projectNeeds(needs, supps));
}

/** Per-axis points this one supplement would add, for the stat rows on a card. */
function axisLiftOf(
  s: Supplement,
  needs: Record<Domain, number>
): Partial<Record<Axis, number>> {
  const before = axisScoresFrom(needs);
  const after = axisScoresFrom(projectNeeds(needs, [s]));
  const lift: Partial<Record<Axis, number>> = {};
  for (const axis of AXES) {
    const delta = after[axis] - before[axis];
    if (delta >= 1) lift[axis] = delta;
  }
  return lift;
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
