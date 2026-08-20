import {
  QUESTIONS,
  SCREEN_QUESTIONS,
  DEEP_QUESTIONS,
  SAFETY_QUESTIONS,
} from "../data/survey";
import { SUPPLEMENTS } from "../data/supplements";
import type { Domain, Question, SafetyFlag } from "../data/types";
import { computeNeeds, type Answers } from "./recommend";

// ── Adaptive question selection ──────────────────────────────────────────────
// The survey walks three stages. Screeners always run. Deep questions open only
// where the screener found something. Safety questions are asked only when a
// supplement that is actually still in contention cares about the answer —
// there is no reason to ask a 25-year-old weightlifter about anticoagulants
// when nothing in their result interacts with one.
//
// Pregnancy is the one exception and is always asked: it excludes the widest
// set of supplements, and getting it wrong is the costliest mistake here.

const ALWAYS_ASK_SAFETY: SafetyFlag[] = ["pregnancy"];

/** How much fit a supplement needs before its safety flags are worth asking about. */
const CANDIDATE_THRESHOLD = 0.25;

function isAnswered(answers: Answers, q: Question): boolean {
  return answers[q.id] !== undefined;
}

/** Deep questions whose gate domain cleared the bar in the screener. */
export function openDeepQuestions(answers: Answers): Question[] {
  const needs = computeNeeds(answers);
  return DEEP_QUESTIONS.filter(
    (q) => !q.gate || needs[q.gate.domain] >= q.gate.min
  );
}

/**
 * Safety questions worth asking, given who is still in the running. Uses raw
 * domain fit (no evidence weighting, no safety filtering) because the point is
 * coverage of the candidate set, not its final ordering.
 */
export function relevantSafetyQuestions(answers: Answers): Question[] {
  const needs = computeNeeds(answers);
  const flags = new Set<SafetyFlag>(ALWAYS_ASK_SAFETY);

  for (const s of SUPPLEMENTS) {
    if (s.prescriptionOnlyKR) continue;
    let fit = 0;
    let capacity = 0;
    for (const [d, cover] of Object.entries(s.domains)) {
      const c = cover as number;
      capacity += c;
      fit += needs[d as Domain] * c;
    }
    if (capacity === 0 || fit / capacity < CANDIDATE_THRESHOLD) continue;
    for (const f of [...s.avoidIf, ...s.warnIf]) flags.add(f);
  }

  return SAFETY_QUESTIONS.filter((q) => q.safetyFlag && flags.has(q.safetyFlag));
}

/** The full list this particular run will ask, given the answers so far. */
export function plannedQuestions(answers: Answers): Question[] {
  const screensDone = SCREEN_QUESTIONS.every((q) => isAnswered(answers, q));
  // Until the screener is finished the deep set is still moving, so the plan is
  // "screeners + whatever has opened so far" — which is exactly what the
  // progress estimate should reflect.
  return [
    ...SCREEN_QUESTIONS,
    ...openDeepQuestions(answers),
    ...(screensDone ? relevantSafetyQuestions(answers) : []),
  ];
}

/** Next unanswered question in plan order, or null when the run is complete. */
export function nextQuestion(answers: Answers): Question | null {
  const plan = plannedQuestions(answers);
  for (const q of plan) if (!isAnswered(answers, q)) return q;

  // The screener may have opened new deep questions with its final answer, and
  // finishing the deep set is what unlocks the safety set. Re-plan once more
  // before declaring the run done.
  const replanned = plannedQuestions(answers);
  for (const q of replanned) if (!isAnswered(answers, q)) return q;
  return null;
}

export type Progress = {
  /** How many questions have been answered in this run. */
  answered: number;
  /** Best current estimate of the run's total length. */
  estimatedTotal: number;
  /** 0–1, for the bar. */
  ratio: number;
  /** True once the plan is fully determined (no more estimating). */
  exact: boolean;
};

export function progressOf(answers: Answers): Progress {
  const plan = plannedQuestions(answers);
  const answered = plan.filter((q) => isAnswered(answers, q)).length;

  const screensAnswered = SCREEN_QUESTIONS.filter((q) => isAnswered(answers, q)).length;
  const screensDone = screensAnswered === SCREEN_QUESTIONS.length;

  let estimatedTotal = plan.length;
  if (!screensDone) {
    // Extrapolate from the rate deep questions have been opening. Early on
    // there is no rate to extrapolate from, so blend in a prior — otherwise the
    // first screen reads "약 21" and then climbs, and a total that grows while
    // you answer feels like the form is punishing you. Starting near the real
    // number and settling is the better lie.
    const PRIOR_DEEP = 8;
    const CONFIDENT_AFTER = 5;
    const openedSoFar = openDeepQuestions(answers).length;
    const observed =
      screensAnswered > 0
        ? (openedSoFar / screensAnswered) * SCREEN_QUESTIONS.length
        : PRIOR_DEEP;
    const trust = Math.min(1, screensAnswered / CONFIDENT_AFTER);
    const projectedDeep = Math.round(PRIOR_DEEP * (1 - trust) + observed * trust);
    estimatedTotal = SCREEN_QUESTIONS.length + Math.max(openedSoFar, projectedDeep) + 3;
  }

  estimatedTotal = Math.max(estimatedTotal, answered + (nextQuestion(answers) ? 1 : 0));

  return {
    answered,
    estimatedTotal,
    ratio: estimatedTotal > 0 ? Math.min(1, answered / estimatedTotal) : 0,
    exact: screensDone,
  };
}

/** Total size of the question bank — used by tests, not by the UI. */
export const BANK_SIZE = QUESTIONS.length;
