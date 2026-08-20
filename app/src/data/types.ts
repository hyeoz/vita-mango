// Shared vocabulary for the on-device recommendation engine.
//
// The whole engine is deterministic and offline: a survey answer maps to
// "need" scores per health domain, each supplement declares how well it covers
// each domain, and the recommendation is the dot product of the two, tempered
// by how strong the clinical evidence for that supplement actually is.
//
// Nothing here is medical advice. These are general wellness mappings drawn
// from widely published intake guidance; the UI states that plainly and tells
// anyone pregnant, on medication, or managing a condition to ask a clinician.

/** Health areas a question can express a need for, and a supplement can cover. */
export type Domain =
  | "sleep"
  | "stress"
  | "mood"
  | "fatigue"
  | "immunity"
  | "gut"
  | "digestion"
  | "eye"
  | "joint"
  | "muscle"
  | "bone"
  | "cardio"
  | "circulation"
  | "cholesterol"
  | "bloodsugar"
  | "skin"
  | "hair"
  | "liver"
  | "cognition"
  | "anemia"
  | "womens"
  | "mens"
  | "respiratory"
  | "antioxidant";

export const DOMAIN_LABELS: Record<Domain, string> = {
  sleep: "수면",
  stress: "스트레스",
  mood: "기분",
  fatigue: "피로·활력",
  immunity: "면역",
  gut: "장 건강",
  digestion: "소화",
  eye: "눈",
  joint: "관절",
  muscle: "근육",
  bone: "뼈",
  cardio: "심혈관",
  circulation: "혈행",
  cholesterol: "콜레스테롤",
  bloodsugar: "혈당",
  skin: "피부",
  hair: "모발·손톱",
  liver: "간",
  cognition: "집중·기억",
  anemia: "빈혈",
  womens: "여성 건강",
  mens: "남성 건강",
  respiratory: "호흡기",
  antioxidant: "항산화",
};

/**
 * How much human evidence stands behind a supplement for its main uses.
 *  A — consistent RCT / meta-analysis support
 *  B — reasonable but mixed or narrower evidence
 *  C — limited, mostly traditional or early-stage evidence
 * Used to damp the score so a well-studied option outranks a trendy one at
 * equal domain fit. This is the "임상 근거 기준" the ranking is built on.
 */
export type Evidence = "A" | "B" | "C";

export const EVIDENCE_WEIGHT: Record<Evidence, number> = {
  A: 1,
  B: 0.85,
  C: 0.68,
};

export const EVIDENCE_LABELS: Record<Evidence, string> = {
  A: "근거 충분",
  B: "근거 보통",
  C: "근거 제한적",
};

/** When a supplement is taken — also the anchor for its local notification. */
export type TimeSlot =
  | "morningEmpty"
  | "morningAfter"
  | "lunchAfter"
  | "eveningAfter"
  | "beforeBed"
  | "preMeal"
  | "postWorkout";

export const TIME_SLOTS: Record<
  TimeSlot,
  { label: string; hour: number; minute: number }
> = {
  morningEmpty: { label: "아침 공복", hour: 7, minute: 30 },
  morningAfter: { label: "아침 식후", hour: 8, minute: 30 },
  lunchAfter: { label: "점심 식후", hour: 13, minute: 0 },
  eveningAfter: { label: "저녁 식후", hour: 19, minute: 30 },
  beforeBed: { label: "취침 전", hour: 22, minute: 30 },
  preMeal: { label: "식전", hour: 11, minute: 30 },
  postWorkout: { label: "운동 후", hour: 18, minute: 0 },
};

/**
 * Conditions that make a supplement a bad idea to suggest. The survey asks
 * about these directly and the engine filters on them — a recommendation
 * engine that cheerfully suggests high-dose vitamin A during pregnancy is
 * worse than no engine at all.
 */
export type SafetyFlag =
  | "pregnancy"
  | "anticoagulant"
  | "kidney"
  | "thyroidMed"
  | "hormoneSensitive"
  | "surgerySoon";

export const SAFETY_LABELS: Record<SafetyFlag, string> = {
  pregnancy: "임신·수유 중",
  anticoagulant: "항응고제·혈전약 복용",
  kidney: "신장 질환",
  thyroidMed: "갑상선약 복용",
  hormoneSensitive: "호르몬 민감 질환",
  surgerySoon: "수술 예정",
};

/** Pill colour keys the UI maps to real colours (see theme/colors.ts). */
export type ColorKey = "pink" | "purple" | "yellow" | "orange" | "cyan" | "mixed";

export type Supplement = {
  id: string;
  name: string;
  /** Spelling variants users type, matched after normalisation. */
  aliases: string[];
  category: string;
  color: ColorKey;
  /** Domain coverage, 0–1. Only meaningful domains are listed. */
  domains: Partial<Record<Domain, number>>;
  evidence: Evidence;
  /** Typical adult daily intake, as a display string. */
  dose: string;
  /** Tolerable upper intake where a well-known one exists. */
  upperLimit?: string;
  slot: TimeSlot;
  /** Units per take, used to render "아침 식후 · 1정". */
  unitsPerTake: number;
  /** Unit noun — most are 정, powders are 회. */
  unitNoun: "정" | "회" | "포";
  /** One-line plain-language summary of what it is generally taken for. */
  benefit: string;
  cautions: string[];
  /** Free-text interaction notes shown alongside the recommendation. */
  interactions: string[];
  /** Never recommend when the user reported any of these. */
  avoidIf: SafetyFlag[];
  /** Recommend but surface a warning when the user reported any of these. */
  warnIf: SafetyFlag[];
  /** Sold only on prescription in Korea — never auto-recommended. */
  prescriptionOnlyKR?: boolean;
};

/** Three-way answer, MBTI-style. */
export type Answer = "yes" | "no" | "unsure";

export const ANSWER_WEIGHT: Record<Answer, number> = {
  yes: 1,
  unsure: 0.3,
  no: 0,
};

/**
 * Where a question sits in the adaptive flow.
 *  screen  — always asked; one broad probe per area
 *  deep    — asked only when its gate domain screened positive; these
 *            discriminate *between* supplements rather than re-confirming
 *  safety  — asked only when a supplement still in contention cares
 */
export type Stage = "screen" | "deep" | "safety";

export type Question = {
  id: string;
  text: string;
  /** Short section label shown above the question. */
  section: string;
  stage: Stage;
  /** Domains this question expresses a need for, with weights. */
  domains: Partial<Record<Domain, number>>;
  /**
   * Deep questions only. Ask this follow-up when the gate domain has already
   * accumulated at least `min` need from the screener. Asking someone who
   * sleeps fine three more sleep questions is how a survey earns its
   * reputation for being too long.
   */
  gate?: { domain: Domain; min: number };
  /** Safety questions set a flag instead of scoring domains. */
  safetyFlag?: SafetyFlag;
  /** Inverted questions score when the user answers "아니다". */
  invert?: boolean;
};

/** Formats a supplement's intake string, e.g. "아침 식후 · 1정". */
export function intakeLabel(s: Supplement): string {
  return `${TIME_SLOTS[s.slot].label} · ${s.unitsPerTake}${s.unitNoun}`;
}
