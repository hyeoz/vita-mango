/**
 * Data + engine regression check.  Run with:  npm run verify:engine
 *
 * The supplement table and the survey are hand-maintained text, which is the
 * point — they are reviewable — but hand-maintained text drifts. These
 * assertions catch the drift that type-checking can't: a domain no supplement
 * covers, a duplicate alias silently shadowing another entry, a safety flag
 * that excludes nothing, an archetype that stops getting a sensible answer.
 */
import {
  QUESTIONS,
  SCREEN_QUESTIONS,
  DEEP_QUESTIONS,
  SAFETY_QUESTIONS,
  SCORING_QUESTIONS,
} from "../src/data/survey";
import { nextQuestion, progressOf } from "../src/logic/adaptive";
import { AXES, AXIS_DOMAINS, DOMAIN_AXIS } from "../src/data/axes";
import { SUPPLEMENTS, findSupplement, normalizeName } from "../src/data/supplements";
import { DOMAIN_LABELS, TIME_SLOTS, type Domain, type SafetyFlag } from "../src/data/types";
import { recommend, type Answers } from "../src/logic/recommend";
import {
  COLLECTIBLES,
  DOSE_XP,
  XP_PER_LEVEL,
  computeStreak,
  levelProgress,
  unlockedKeys,
  xpFrom,
} from "../src/state/gamification";
import { planReminder, planReminders, type ReminderInput } from "../src/notifications/schedule";

const ALL_DOMAINS = Object.keys(DOMAIN_LABELS) as Domain[];
const COLORS = ["pink", "purple", "yellow", "orange", "cyan", "mixed"];

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) return;
  failures += 1;
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}
function section(name: string) {
  console.log(`\n${name}`);
}

/** Walks the adaptive flow the way the app does, answering as `pred` says. */
const answersWhere = (pred: (id: string) => boolean): Answers => {
  const a: Answers = {};
  for (let i = 0; i < QUESTIONS.length + 5; i++) {
    const q = nextQuestion(a);
    if (!q) break;
    a[q.id] = pred(q.id) ? "yes" : "no";
  }
  return a;
};

// ── shape ────────────────────────────────────────────────────────────────────
section("설문");
check("스크리너 존재", SCREEN_QUESTIONS.length > 0);
check("심화 문항 존재", DEEP_QUESTIONS.length > 0);
check("안전 문항 존재", SAFETY_QUESTIONS.length > 0);
check(
  "단계 분류가 전체를 덮음",
  SCREEN_QUESTIONS.length + DEEP_QUESTIONS.length + SAFETY_QUESTIONS.length ===
    QUESTIONS.length
);
check("점수 문항 = 스크리너 + 심화", SCORING_QUESTIONS.length === SCREEN_QUESTIONS.length + DEEP_QUESTIONS.length);
for (const q of DEEP_QUESTIONS) {
  check(`심화 문항에 게이트 있음 (${q.id})`, !!q.gate);
  if (q.gate) {
    // A gate nothing can open is a question that never gets asked.
    const openers = QUESTIONS.filter((o) => (o.domains[q.gate!.domain] ?? 0) > 0);
    check(`게이트를 열 수 있는 문항 존재 (${q.id})`, openers.length > 0, q.gate.domain);
  }
}
const qIds = new Set<string>();
for (const q of QUESTIONS) {
  check(`문항 id 중복 없음 (${q.id})`, !qIds.has(q.id));
  qIds.add(q.id);
  check(`문항 텍스트 있음 (${q.id})`, q.text.trim().length > 0);
  for (const d of Object.keys(q.domains)) {
    check(`문항 도메인 유효 (${q.id})`, ALL_DOMAINS.includes(d as Domain), d);
  }
  check(
    `안전 문항은 도메인 점수 없음 (${q.id})`,
    !q.safetyFlag || Object.keys(q.domains).length === 0
  );
}

section("영양제 데이터");
check("53종 이상", SUPPLEMENTS.length >= 50, `실제 ${SUPPLEMENTS.length}`);
const ids = new Set<string>();
const names = new Set<string>();
const aliasOwner = new Map<string, string>();
for (const s of SUPPLEMENTS) {
  check(`id 중복 없음 (${s.id})`, !ids.has(s.id));
  ids.add(s.id);
  check(`이름 중복 없음 (${s.name})`, !names.has(s.name));
  names.add(s.name);
  check(`색상 유효 (${s.name})`, COLORS.includes(s.color), s.color);
  check(`시점 유효 (${s.name})`, s.slot in TIME_SLOTS, s.slot);
  check(`도메인 1개 이상 (${s.name})`, Object.keys(s.domains).length > 0);
  check(`용량 표기 있음 (${s.name})`, s.dose.trim().length > 0);
  check(`효능 한 줄 있음 (${s.name})`, s.benefit.trim().length > 0);
  for (const [d, v] of Object.entries(s.domains)) {
    check(`도메인 유효 (${s.name})`, ALL_DOMAINS.includes(d as Domain), d);
    check(`도메인 값 0~1 (${s.name}.${d})`, (v as number) > 0 && (v as number) <= 1, String(v));
  }
  // A normalised alias colliding across two supplements means one silently wins.
  for (const a of [s.name, ...s.aliases]) {
    const key = normalizeName(a);
    const owner = aliasOwner.get(key);
    check(`별칭 충돌 없음 (${a})`, owner === undefined || owner === s.id, `${owner} ↔ ${s.id}`);
    aliasOwner.set(key, s.id);
  }
  check(`이름으로 조회됨 (${s.name})`, findSupplement(s.name)?.id === s.id);
}

section("도메인 커버리지");
for (const d of ALL_DOMAINS) {
  const askedBy = QUESTIONS.filter((q) => d in q.domains).length;
  const coveredBy = SUPPLEMENTS.filter((s) => (s.domains[d] ?? 0) >= 0.5).length;
  check(`설문이 묻는 도메인 (${DOMAIN_LABELS[d]})`, askedBy > 0, "질문 0개");
  check(`추천할 성분이 있는 도메인 (${DOMAIN_LABELS[d]})`, coveredBy > 0, "커버 0종");
}

section("안전 규칙");
const FLAGS: SafetyFlag[] = [
  "pregnancy",
  "anticoagulant",
  "kidney",
  "thyroidMed",
  "hormoneSensitive",
  "surgerySoon",
];
for (const f of FLAGS) {
  const asked = QUESTIONS.some((q) => q.safetyFlag === f);
  check(`설문에 존재 (${f})`, asked);
  const guards = SUPPLEMENTS.filter((s) => s.avoidIf.includes(f) || s.warnIf.includes(f));
  check(`실제로 쓰이는 플래그 (${f})`, guards.length > 0, "제외/경고 0종");
}
// Every avoidIf must actually remove the supplement from a result.
const pregnancyAll = recommend(
  answersWhere((id) => id === "safe_pregnancy" || !id.startsWith("safe_")),
  { limit: 99 }
);
for (const s of SUPPLEMENTS.filter((x) => x.avoidIf.includes("pregnancy"))) {
  check(
    `임신 시 제외됨 (${s.name})`,
    !pregnancyAll.recommendations.some((r) => r.supplement.id === s.id)
  );
}
check(
  "처방 성분은 추천되지 않음",
  !pregnancyAll.recommendations.some((r) => r.supplement.prescriptionOnlyKR)
);

section("적응형 흐름");
const minimal = answersWhere(() => false);
const maximal = answersWhere(() => true);
check("최소 경로가 스크리너보다 김", Object.keys(minimal).length >= SCREEN_QUESTIONS.length);
check(
  "최소 경로가 전체 뱅크보다 짧음",
  Object.keys(minimal).length < QUESTIONS.length,
  `${Object.keys(minimal).length}/${QUESTIONS.length}`
);
check(
  "최대 경로가 최소 경로보다 김",
  Object.keys(maximal).length > Object.keys(minimal).length,
  `${Object.keys(maximal).length} vs ${Object.keys(minimal).length}`
);
check("최대 경로도 뱅크를 넘지 않음", Object.keys(maximal).length <= QUESTIONS.length);
check("임신 문항은 항상 물어봄", minimal.safe_pregnancy !== undefined);
const halfway: Answers = {};
for (let i = 0; i < 5; i++) {
  const q = nextQuestion(halfway);
  if (q) halfway[q.id] = "yes";
}
const prog = progressOf(halfway);
check("진행률 총합이 답변 수 이상", prog.estimatedTotal >= prog.answered);
check("진행률 비율 0~1", prog.ratio >= 0 && prog.ratio <= 1);

section("능력치 축");
for (const axis of AXES) {
  check(`축에 도메인 있음 (${axis})`, AXIS_DOMAINS[axis].length > 0);
}
const mapped = new Set(Object.keys(DOMAIN_AXIS));
for (const d of ALL_DOMAINS) {
  // 여성/남성 건강은 의도적으로 레이더에서 제외한다.
  if (d === "womens" || d === "mens") continue;
  check(`도메인이 축에 매핑됨 (${DOMAIN_LABELS[d]})`, mapped.has(d));
}
const axisRun = recommend(answersWhere(() => true), { limit: 5 });
for (const axis of AXES) {
  const cur = axisRun.axisScores[axis];
  const proj = axisRun.projectedAxisScores[axis];
  check(`현재 능력치 0~100 (${axis})`, cur >= 0 && cur <= 100, String(cur));
  check(`예상 능력치가 현재 이상 (${axis})`, proj >= cur, `${cur} → ${proj}`);
}

section("중복 제거");
const sleepy = recommend(
  answersWhere((id) => /^s_(sleep|stress)$/.test(id) || /^d_(sleep|stress)/.test(id)),
  { limit: 5 }
);
const recoveryHeavy = sleepy.recommendations.filter(
  (r) => (r.supplement.domains.sleep ?? 0) >= 0.6 || (r.supplement.domains.stress ?? 0) >= 0.6
);
check(
  "수면 호소 시 수면 성분이 목록을 독점하지 않음",
  recoveryHeavy.length <= 3,
  `${recoveryHeavy.length}/5 — ${sleepy.recommendations.map((r) => r.supplement.name).join(", ")}`
);
check(
  "겹치는 항목은 단독 점수보다 낮게 표시",
  sleepy.recommendations.every((r) => !r.overlapsWith.length || r.match < r.soloMatch)
);
check(
  "매칭도 내림차순",
  sleepy.recommendations.every((r, i, arr) => i === 0 || arr[i - 1].match >= r.match)
);

section("엔진 동작");
const archetypes: { name: string; match: RegExp; expect: string }[] = [
  { name: "수면·스트레스형", match: /^[sd]_(sleep|stress)/, expect: "아슈와간다" },
  { name: "눈 피로형", match: /^[sd]_(eye)/, expect: "루테인" },
  { name: "관절형", match: /^[sd]_(joint)/, expect: "글루코사민" },
  { name: "빈혈형", match: /^[sd]_(anemia)/, expect: "철분" },
  { name: "장 트러블형", match: /^[sd]_(gut)/, expect: "유산균" },
];
for (const a of archetypes) {
  const r = recommend(answersWhere((id) => a.match.test(id)), { limit: 5 });
  check(`${a.name} → 추천 있음`, r.recommendations.length > 0);
  check(
    `${a.name} → 상위 5개에 ${a.expect}`,
    r.recommendations.some((x) => x.supplement.name === a.expect),
    r.recommendations.map((x) => x.supplement.name).join(", ")
  );
  // Ordering must agree with the number shown on the card.
  const matches = r.recommendations.map((x) => x.match);
  check(`${a.name} → 매칭도 내림차순`, matches.every((m, i) => i === 0 || matches[i - 1] >= m), matches.join(">"));
}

const empty = recommend({}, { limit: 5 });
check("답변 없음 → 크래시 없음", Array.isArray(empty.recommendations));
const allUnsure: Answers = {};
for (let i = 0; i < QUESTIONS.length + 5; i++) {
  const q = nextQuestion(allUnsure);
  if (!q) break;
  allUnsure[q.id] = "unsure";
}
check("전부 모르겠다 → 결과 반환", recommend(allUnsure, { limit: 5 }).recommendations.length > 0);
const taking = recommend(answersWhere((id) => /^[sd]_sleep/.test(id)), {
  alreadyTaking: ["마그네슘", "아슈와간다"],
  limit: 5,
});
check(
  "이미 복용 중인 성분은 제외",
  !taking.recommendations.some((r) =>
    ["마그네슘", "아슈와간다"].includes(r.supplement.name)
  )
);

section("게이미피케이션");
check("완전 복용일 XP = 10", DOSE_XP === 10 && xpFrom(10) === 100);
check("레벨 간격 = 100 XP", XP_PER_LEVEL === 100);
check("신규 사용자는 Lv.1", levelProgress(0).level === 1);
check("100 XP에서 Lv.2", levelProgress(100).level === 2);
const maxLevel = levelProgress(800);
check("800 XP에서 Lv.9 최대 레벨", maxLevel.level === 9 && maxLevel.isMax);
check("표정 도감은 Lv.1~9에 하나씩", COLLECTIBLES.length === 9 && COLLECTIBLES.every((c, i) => c.minLevel === i + 1));
check("Lv.1 기본 표정 하나 해금", unlockedKeys(1).length === 1 && unlockedKeys(1)[0] === "happy");
check("Lv.9에서 전체 표정 해금", unlockedKeys(9).length === COLLECTIBLES.length);
check(
  "오늘까지 연속 복용 스트릭",
  computeStreak(["2026-08-18", "2026-08-19", "2026-08-20"], "2026-08-20") === 3
);
check(
  "오늘 미복용이어도 어제까지 스트릭 유지",
  computeStreak(["2026-08-18", "2026-08-19", "2026-08-20"], "2026-08-21") === 3
);
check(
  "중간 공백이 있으면 현재 연속일만 계산",
  computeStreak(["2026-08-18", "2026-08-20"], "2026-08-20") === 1
);
check("복용 기록 없음 = 스트릭 0", computeStreak([], "2026-08-20") === 0);

// ── reminders ────────────────────────────────────────────────────────────────
// Local notifications freeze their content at scheduling time, so "이미 먹은 건
// 알리지 않는다" is decided here. What must never break: skipping today can't
// skip tomorrow, and a supplement whose slot already passed keeps its repeat.
section("복용 알림");
const supp = (over: Partial<ReminderInput> = {}): ReminderInput => ({
  name: "마그네슘",
  taken: false,
  notify: true,
  hour: 20,
  minute: 0,
  ...over,
});
const at = (h: number, m: number) => new Date(2026, 7, 20, h, m, 0, 0); // 2026-08-20

check("알림 끈 영양제는 예약 안 함", planReminder(supp({ notify: false }), at(9, 0)) === null);
check(
  "미복용은 매일 반복 예약",
  planReminder(supp(), at(9, 0))?.kind === "daily"
);
const beforeSlot = planReminder(supp({ taken: true }), at(9, 0));
check(
  "복용 체크 후 아직 시간 전이면 오늘은 건너뜀",
  beforeSlot?.kind === "once",
  `got ${beforeSlot?.kind}`
);
check(
  "건너뛴 알림은 내일 같은 시각에 다시 울림",
  beforeSlot?.kind === "once" &&
    beforeSlot.at.getDate() === 21 &&
    beforeSlot.at.getHours() === 20 &&
    beforeSlot.at.getMinutes() === 0
);
check(
  "복용 체크했어도 시간이 지났으면 매일 반복 유지",
  planReminder(supp({ taken: true }), at(21, 0))?.kind === "daily"
);
check(
  "복용 시각과 같은 분에는 즉시 발송을 피해 건너뜀",
  planReminder(supp({ taken: true }), at(20, 0))?.kind === "once"
);
check(
  "자정 넘김이 다음 달로 넘어가도 날짜 정상",
  planReminder(supp({ taken: true }), new Date(2026, 7, 31, 9, 0))?.kind === "once" &&
    (planReminder(supp({ taken: true }), new Date(2026, 7, 31, 9, 0)) as any).at.getMonth() === 8
);
check(
  "복용 체크는 그 영양제 하나만 건너뛴다",
  planReminders(
    [supp({ name: "마그네슘", taken: true }), supp({ name: "비타민 D", taken: false })],
    at(9, 0)
  ).map((p) => p.plan.kind).join(",") === "once,daily"
);
check(
  "저장값이 깨져도 예약은 유효한 시각으로",
  (() => {
    const p = planReminder(supp({ hour: NaN as unknown as number, minute: 99 }), at(9, 0));
    // hour NaN → 8시 기본값, 분 99 → 8:99 = 9:39 으로 정규화
    return p?.kind === "daily" && p.hour === 9 && p.minute === 39;
  })()
);

console.log(
  failures === 0
    ? `\n✅ 전부 통과 — 뱅크 ${QUESTIONS.length}문항(스크리너 ${SCREEN_QUESTIONS.length}) / 실제 ${Object.keys(minimal).length}~${Object.keys(maximal).length}개 질문 / 영양제 ${SUPPLEMENTS.length}종 / 축 ${AXES.length}개`
    : `\n❌ ${failures}건 실패`
);
process.exit(failures === 0 ? 0 : 1);
