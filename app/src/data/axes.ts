import { DOMAIN_LABELS, type Domain } from "./types";

// ── Macro axes for the radar chart ───────────────────────────────────────────
// 24 domains is the right resolution for scoring and the wrong one for a chart —
// a 24-spoke radar is unreadable. These six axes are the clinical groupings a
// nutritionist would actually talk in, and every scored domain maps to exactly
// one of them so the chart can never disagree with the recommendations.
//
// 여성 건강 / 남성 건강 are deliberately left off the radar: they are
// sex-specific rather than a universal capability, so showing them as a spoke
// everyone has would misread. They still drive recommendations, and surface as
// signal chips instead.

export type Axis =
  | "vitality"
  | "immunity"
  | "circulation"
  | "recovery"
  | "structure"
  | "gutSkin";

export const AXES: Axis[] = [
  "vitality",
  "immunity",
  "circulation",
  "recovery",
  "structure",
  "gutSkin",
];

export const AXIS_LABELS: Record<Axis, string> = {
  vitality: "활력·집중",
  immunity: "면역·항산화",
  circulation: "순환·대사",
  recovery: "수면·스트레스",
  structure: "근골격",
  gutSkin: "장·피부",
};

/** Short label for tight spots (radar spokes, stat rows). */
export const AXIS_SHORT: Record<Axis, string> = {
  vitality: "활력",
  immunity: "면역",
  circulation: "순환",
  recovery: "회복",
  structure: "근골격",
  gutSkin: "장·피부",
};

export const AXIS_EMOJI: Record<Axis, string> = {
  vitality: "⚡",
  immunity: "🛡️",
  circulation: "❤️",
  recovery: "🌙",
  structure: "🦴",
  gutSkin: "🌿",
};

/** Every scored domain belongs to exactly one axis (except the sex-specific two). */
export const DOMAIN_AXIS: Partial<Record<Domain, Axis>> = {
  fatigue: "vitality",
  anemia: "vitality",
  cognition: "vitality",
  eye: "vitality",

  immunity: "immunity",
  respiratory: "immunity",
  antioxidant: "immunity",

  cardio: "circulation",
  circulation: "circulation",
  cholesterol: "circulation",
  bloodsugar: "circulation",

  sleep: "recovery",
  stress: "recovery",
  mood: "recovery",

  joint: "structure",
  muscle: "structure",
  bone: "structure",

  gut: "gutSkin",
  digestion: "gutSkin",
  skin: "gutSkin",
  hair: "gutSkin",
  liver: "gutSkin",
};

export const AXIS_DOMAINS: Record<Axis, Domain[]> = AXES.reduce((acc, axis) => {
  acc[axis] = (Object.keys(DOMAIN_AXIS) as Domain[]).filter(
    (d) => DOMAIN_AXIS[d] === axis
  );
  return acc;
}, {} as Record<Axis, Domain[]>);

/** Human-readable list of what an axis covers, for the chart legend. */
export function axisDetail(axis: Axis): string {
  return AXIS_DOMAINS[axis].map((d) => DOMAIN_LABELS[d]).join(" · ");
}
