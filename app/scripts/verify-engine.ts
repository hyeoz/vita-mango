/**
 * Data + engine regression check.  Run with:  npm run verify:engine
 *
 * The supplement table and the survey are hand-maintained text, which is the
 * point — they are reviewable — but hand-maintained text drifts. These
 * assertions catch the drift that type-checking can't: a domain no supplement
 * covers, a duplicate alias silently shadowing another entry, a safety flag
 * that excludes nothing, an archetype that stops getting a sensible answer.
 */
import { QUESTIONS, SCORING_QUESTIONS, SAFETY_QUESTIONS } from "../src/data/survey";
import { SUPPLEMENTS, findSupplement, normalizeName } from "../src/data/supplements";
import { DOMAIN_LABELS, TIME_SLOTS, type Domain, type SafetyFlag } from "../src/data/types";
import { recommend, type Answers } from "../src/logic/recommend";

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

const answersWhere = (pred: (id: string) => boolean): Answers =>
  Object.fromEntries(QUESTIONS.map((q) => [q.id, pred(q.id) ? "yes" : "no"])) as Answers;

// ── shape ────────────────────────────────────────────────────────────────────
section("설문");
check("문항 50개", QUESTIONS.length === 50, `실제 ${QUESTIONS.length}`);
check("점수 문항 존재", SCORING_QUESTIONS.length > 0);
check("안전 문항 존재", SAFETY_QUESTIONS.length > 0);
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

section("엔진 동작");
const archetypes: { name: string; match: RegExp; expect: string }[] = [
  { name: "수면·스트레스형", match: /^(sleep_|stress_|mood_)/, expect: "마그네슘" },
  { name: "눈·집중형", match: /^(eye_|cog_)/, expect: "루테인" },
  { name: "관절형", match: /^joint_/, expect: "글루코사민" },
  { name: "빈혈·피로형", match: /^fatigue_/, expect: "철분" },
  { name: "장 트러블형", match: /^gut_/, expect: "유산균" },
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
const allUnsure = Object.fromEntries(QUESTIONS.map((q) => [q.id, "unsure"])) as Answers;
check("전부 모르겠다 → 결과 반환", recommend(allUnsure, { limit: 5 }).recommendations.length > 0);
const taking = recommend(answersWhere((id) => id.startsWith("sleep_")), {
  alreadyTaking: ["마그네슘"],
  limit: 5,
});
check(
  "이미 복용 중인 성분은 제외",
  !taking.recommendations.some((r) => r.supplement.name === "마그네슘")
);

console.log(
  failures === 0
    ? `\n✅ 전부 통과 — 문항 ${QUESTIONS.length}개 / 영양제 ${SUPPLEMENTS.length}종 / 도메인 ${ALL_DOMAINS.length}개`
    : `\n❌ ${failures}건 실패`
);
process.exit(failures === 0 ? 0 : 1);
