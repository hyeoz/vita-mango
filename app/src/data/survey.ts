import type { Question } from "./types";

// ── The adaptive survey ──────────────────────────────────────────────────────
// Three stages, and only the first is asked in full.
//
//   screen (18)  one broad probe per area, always asked
//   deep         follow-ups that open only when their area screened positive
//   safety (6)   asked only when something still in contention cares
//
// A fixed 50-question form asks everyone about knee pain and night urination.
// This asks ~28–32 for a typical profile and still reaches ~50 for someone who
// answers yes to everything — the length now reflects how much there is to know
// about *you*, not how much the form can hold.
//
// The deep questions are written to DISCRIMINATE, not to re-confirm. "잠을 못
// 자요" is already known by the time they run; what the engine still needs is
// whether it's cramping legs (마그네슘), a racing mind (아슈와간다·테아닌), or
// trouble falling asleep at all. Re-asking the screener in different words adds
// length without adding information.

export const QUESTIONS: Question[] = [
  // ── 스크리너 ───────────────────────────────────────────────────────────────
  {
    id: "s_sleep",
    section: "수면·컨디션",
    stage: "screen",
    text: "잠들기 어렵거나 자다 깨는 일이 잦아요.",
    domains: { sleep: 1, stress: 0.2 },
  },
  {
    id: "s_stress",
    section: "수면·컨디션",
    stage: "screen",
    text: "요즘 긴장이 잘 안 풀리거나 기분이 자주 가라앉아요.",
    domains: { stress: 1, mood: 0.9 },
  },
  {
    id: "s_fatigue",
    section: "수면·컨디션",
    stage: "screen",
    text: "충분히 쉬어도 피로가 잘 안 풀려요.",
    domains: { fatigue: 1 },
  },
  {
    id: "s_anemia",
    section: "수면·컨디션",
    stage: "screen",
    text: "일어설 때 어지럽거나 안색이 창백하다는 말을 들어요.",
    domains: { anemia: 1, circulation: 0.3 },
  },
  {
    id: "s_immune",
    section: "면역·호흡기",
    stage: "screen",
    text: "감기에 자주 걸리고, 한번 걸리면 오래가요.",
    domains: { immunity: 1, respiratory: 0.5 },
  },
  {
    id: "s_gut",
    section: "소화·장",
    stage: "screen",
    text: "배변이 불규칙하거나 식후에 더부룩할 때가 많아요.",
    domains: { gut: 1, digestion: 0.9 },
  },
  {
    id: "s_eye",
    section: "눈·집중",
    stage: "screen",
    text: "화면을 오래 보고, 눈이 뻑뻑하거나 침침해요.",
    domains: { eye: 1 },
  },
  {
    id: "s_cognition",
    section: "눈·집중",
    stage: "screen",
    text: "집중력이나 기억력이 예전만 못하다고 느껴요.",
    domains: { cognition: 1 },
  },
  {
    id: "s_joint",
    section: "근골격",
    stage: "screen",
    text: "관절이 뻣뻣하거나 움직일 때 불편해요.",
    domains: { joint: 1 },
  },
  {
    id: "s_muscle",
    section: "근골격",
    stage: "screen",
    text: "운동을 규칙적으로 하거나, 운동 후 회복이 더뎌요.",
    domains: { muscle: 1 },
  },
  {
    id: "s_bone",
    section: "근골격",
    stage: "screen",
    text: "우유·유제품을 거의 먹지 않아요.",
    domains: { bone: 1 },
  },
  {
    id: "s_metabolic",
    section: "순환·대사",
    stage: "screen",
    text: "콜레스테롤·중성지방·혈당·혈압 중 하나라도 지적받은 적이 있어요.",
    domains: { cholesterol: 1, cardio: 0.7, bloodsugar: 0.7 },
  },
  {
    id: "s_circulation",
    section: "순환·대사",
    stage: "screen",
    text: "손발이 차거나 저릴 때가 많아요.",
    domains: { circulation: 1 },
  },
  {
    id: "s_skin",
    section: "피부·모발",
    stage: "screen",
    text: "피부가 건조하거나, 머리카락·손톱이 약해졌어요.",
    domains: { skin: 1, hair: 0.9 },
  },
  {
    id: "s_liver",
    section: "생활습관",
    stage: "screen",
    text: "술을 주 2회 이상 마셔요.",
    domains: { liver: 1, fatigue: 0.3 },
  },
  {
    id: "s_diet",
    section: "생활습관",
    stage: "screen",
    text: "채소와 과일을 매일 챙겨 먹어요.",
    domains: { antioxidant: 1, immunity: 0.5 },
    invert: true,
  },
  {
    id: "s_sun",
    section: "생활습관",
    stage: "screen",
    text: "하루 20분 이상 햇빛을 쬐어요.",
    domains: { bone: 0.8, immunity: 0.5, mood: 0.4 },
    invert: true,
  },
  {
    id: "s_specific",
    section: "생활습관",
    stage: "screen",
    text: "월경 관련 불편이나 배뇨 관련 불편이 있어요.",
    domains: { womens: 0.6, mens: 0.6 },
  },

  // ── 심화: 수면 ─────────────────────────────────────────────────────────────
  {
    id: "d_sleep_latency",
    section: "수면 자세히",
    stage: "deep",
    gate: { domain: "sleep", min: 0.35 },
    text: "잠자리에 누워 잠들기까지 30분 이상 걸려요.",
    domains: { sleep: 0.8 },
  },
  {
    id: "d_sleep_cramp",
    section: "수면 자세히",
    stage: "deep",
    gate: { domain: "sleep", min: 0.35 },
    text: "밤에 다리에 쥐가 나거나 근육이 뭉치는 편이에요.",
    domains: { muscle: 0.9, sleep: 0.4 },
  },
  {
    id: "d_sleep_racing",
    section: "수면 자세히",
    stage: "deep",
    gate: { domain: "sleep", min: 0.35 },
    text: "생각이 많아서 잠이 잘 안 와요.",
    domains: { stress: 0.8, sleep: 0.4 },
  },

  // ── 심화: 스트레스 ─────────────────────────────────────────────────────────
  {
    id: "d_stress_wired",
    section: "스트레스 자세히",
    stage: "deep",
    gate: { domain: "stress", min: 0.35 },
    text: "몸은 피곤한데 정신은 말똥말똥할 때가 많아요.",
    domains: { stress: 0.8, sleep: 0.5 },
  },
  {
    id: "d_stress_sweet",
    section: "스트레스 자세히",
    stage: "deep",
    gate: { domain: "stress", min: 0.35 },
    text: "스트레스를 받으면 단 것이 강하게 당겨요.",
    domains: { bloodsugar: 0.6, stress: 0.3 },
  },

  // ── 심화: 피로 ─────────────────────────────────────────────────────────────
  {
    id: "d_fatigue_afternoon",
    section: "피로 자세히",
    stage: "deep",
    gate: { domain: "fatigue", min: 0.35 },
    text: "특히 오후가 되면 기운이 확 떨어져요.",
    domains: { fatigue: 0.7, bloodsugar: 0.4 },
  },
  {
    id: "d_fatigue_veg",
    section: "피로 자세히",
    stage: "deep",
    gate: { domain: "fatigue", min: 0.35 },
    text: "고기·생선을 거의 먹지 않는 식단이에요.",
    domains: { anemia: 0.8, fatigue: 0.4 },
  },
  {
    id: "d_fatigue_statin",
    section: "피로 자세히",
    stage: "deep",
    gate: { domain: "fatigue", min: 0.35 },
    text: "콜레스테롤 약(스타틴)을 복용하고 있어요.",
    domains: { cardio: 0.5, fatigue: 0.6 },
  },

  // ── 심화: 빈혈 ─────────────────────────────────────────────────────────────
  {
    id: "d_anemia_diag",
    section: "빈혈 자세히",
    stage: "deep",
    gate: { domain: "anemia", min: 0.35 },
    text: "빈혈이라는 얘기를 들은 적이 있어요.",
    domains: { anemia: 0.9 },
  },
  {
    id: "d_anemia_period",
    section: "빈혈 자세히",
    stage: "deep",
    gate: { domain: "anemia", min: 0.35 },
    text: "월경량이 많은 편이에요.",
    domains: { womens: 0.9, anemia: 0.8 },
  },

  // ── 심화: 면역 ─────────────────────────────────────────────────────────────
  {
    id: "d_immune_throat",
    section: "면역 자세히",
    stage: "deep",
    gate: { domain: "immunity", min: 0.35 },
    text: "목이 자주 붓거나 칼칼한 느낌이 있어요.",
    domains: { respiratory: 0.9 },
  },
  {
    id: "d_immune_wound",
    section: "면역 자세히",
    stage: "deep",
    gate: { domain: "immunity", min: 0.35 },
    text: "입안이 자주 헐거나 상처가 더디게 아물어요.",
    domains: { immunity: 0.6, skin: 0.5 },
  },

  // ── 심화: 장 ───────────────────────────────────────────────────────────────
  {
    id: "d_gut_antibiotic",
    section: "장 자세히",
    stage: "deep",
    gate: { domain: "gut", min: 0.35 },
    text: "최근 몇 달 안에 항생제를 복용한 적이 있어요.",
    domains: { gut: 0.8 },
  },
  {
    id: "d_gut_fiber",
    section: "장 자세히",
    stage: "deep",
    gate: { domain: "gut", min: 0.35 },
    text: "통곡물·콩 같은 식이섬유를 매일 먹어요.",
    domains: { gut: 0.6, digestion: 0.5, bloodsugar: 0.3 },
    invert: true,
  },

  // ── 심화: 눈·집중 ──────────────────────────────────────────────────────────
  {
    id: "d_eye_glare",
    section: "눈 자세히",
    stage: "deep",
    gate: { domain: "eye", min: 0.35 },
    text: "밤에 불빛이 번져 보이거나 눈부심이 심해요.",
    domains: { eye: 0.9 },
  },
  {
    id: "d_cog_word",
    section: "집중 자세히",
    stage: "deep",
    gate: { domain: "cognition", min: 0.35 },
    text: "단어나 사람 이름이 잘 떠오르지 않을 때가 늘었어요.",
    domains: { cognition: 0.9 },
  },

  // ── 심화: 관절·근육 ────────────────────────────────────────────────────────
  {
    id: "d_joint_knee",
    section: "관절 자세히",
    stage: "deep",
    gate: { domain: "joint", min: 0.35 },
    text: "계단을 오르내릴 때 무릎이 특히 불편해요.",
    domains: { joint: 0.9 },
  },
  {
    id: "d_joint_morning",
    section: "관절 자세히",
    stage: "deep",
    gate: { domain: "joint", min: 0.35 },
    text: "아침에 관절이 뻣뻣한 느낌이 있어요.",
    domains: { joint: 0.7 },
  },
  {
    id: "d_muscle_strength",
    section: "운동 자세히",
    stage: "deep",
    gate: { domain: "muscle", min: 0.35 },
    text: "근력 운동을 주 3회 이상 해요.",
    domains: { muscle: 0.9 },
  },
  {
    id: "d_muscle_protein",
    section: "운동 자세히",
    stage: "deep",
    gate: { domain: "muscle", min: 0.35 },
    text: "단백질을 충분히 먹고 있다고 느껴요.",
    domains: { muscle: 0.7 },
    invert: true,
  },

  // ── 심화: 뼈 ───────────────────────────────────────────────────────────────
  {
    id: "d_bone_density",
    section: "뼈 자세히",
    stage: "deep",
    gate: { domain: "bone", min: 0.35 },
    text: "골밀도가 낮다는 얘기를 들은 적이 있어요.",
    domains: { bone: 0.9 },
  },

  // ── 심화: 순환·대사 ────────────────────────────────────────────────────────
  {
    id: "d_meta_lipid",
    section: "대사 자세히",
    stage: "deep",
    gate: { domain: "cholesterol", min: 0.35 },
    text: "콜레스테롤이나 중성지방이 높다고 들었어요.",
    domains: { cholesterol: 0.9, cardio: 0.5 },
  },
  {
    id: "d_meta_sugar",
    section: "대사 자세히",
    stage: "deep",
    gate: { domain: "cholesterol", min: 0.35 },
    text: "혈당이 높은 편이라고 들었어요.",
    domains: { bloodsugar: 0.9 },
  },
  {
    id: "d_meta_fish",
    section: "대사 자세히",
    stage: "deep",
    gate: { domain: "cholesterol", min: 0.35 },
    text: "생선을 주 2회 이상 먹어요.",
    domains: { cardio: 0.7, cholesterol: 0.5, cognition: 0.3 },
    invert: true,
  },
  {
    id: "d_circ_numb",
    section: "순환 자세히",
    stage: "deep",
    gate: { domain: "circulation", min: 0.35 },
    text: "손발 저림이 자주 있어요.",
    domains: { circulation: 0.9 },
  },

  // ── 심화: 피부·모발 ────────────────────────────────────────────────────────
  {
    id: "d_skin_elastic",
    section: "피부 자세히",
    stage: "deep",
    gate: { domain: "skin", min: 0.35 },
    text: "피부 탄력이 떨어지고 잔주름이 늘었어요.",
    domains: { skin: 0.9 },
  },
  {
    id: "d_hair_loss",
    section: "모발 자세히",
    stage: "deep",
    gate: { domain: "hair", min: 0.35 },
    text: "머리카락이 얇아지거나 빠지는 양이 늘었어요.",
    domains: { hair: 0.9 },
  },

  // ── 심화: 간 ───────────────────────────────────────────────────────────────
  {
    id: "d_liver_hangover",
    section: "간 자세히",
    stage: "deep",
    gate: { domain: "liver", min: 0.35 },
    text: "숙취가 예전보다 오래가요.",
    domains: { liver: 0.8 },
  },

  // ── 심화: 여성·남성 ────────────────────────────────────────────────────────
  {
    id: "d_women_pms",
    section: "해당되는 경우만",
    stage: "deep",
    gate: { domain: "womens", min: 0.3 },
    text: "월경 전 불편감(부종·유방통·기분 변화)이 큰 편이에요.",
    domains: { womens: 0.9 },
  },
  {
    id: "d_men_urine",
    section: "해당되는 경우만",
    stage: "deep",
    gate: { domain: "mens", min: 0.3 },
    text: "밤에 소변 때문에 깨거나 배뇨가 시원하지 않아요.",
    domains: { mens: 0.9 },
  },

  // ── 안전 확인 (후보에 걸리는 것만 물어봄) ──────────────────────────────────
  {
    id: "safe_pregnancy",
    section: "안전 확인",
    stage: "safety",
    text: "임신 중이거나 수유 중이에요.",
    domains: {},
    safetyFlag: "pregnancy",
  },
  {
    id: "safe_anticoagulant",
    section: "안전 확인",
    stage: "safety",
    text: "항응고제나 혈전 관련 약을 복용하고 있어요.",
    domains: {},
    safetyFlag: "anticoagulant",
  },
  {
    id: "safe_kidney",
    section: "안전 확인",
    stage: "safety",
    text: "신장 질환이 있거나 신장 수치를 관리하고 있어요.",
    domains: {},
    safetyFlag: "kidney",
  },
  {
    id: "safe_thyroid",
    section: "안전 확인",
    stage: "safety",
    text: "갑상선 약을 복용하고 있어요.",
    domains: {},
    safetyFlag: "thyroidMed",
  },
  {
    id: "safe_hormone",
    section: "안전 확인",
    stage: "safety",
    text: "호르몬에 민감한 질환을 진단받은 적이 있어요.",
    domains: {},
    safetyFlag: "hormoneSensitive",
  },
  {
    id: "safe_surgery",
    section: "안전 확인",
    stage: "safety",
    text: "가까운 시일 안에 수술이나 시술 예정이 있어요.",
    domains: {},
    safetyFlag: "surgerySoon",
  },
];

export const BY_ID: Record<string, (typeof QUESTIONS)[number]> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q])
);

export const SCREEN_QUESTIONS = QUESTIONS.filter((q) => q.stage === "screen");
export const DEEP_QUESTIONS = QUESTIONS.filter((q) => q.stage === "deep");
export const SAFETY_QUESTIONS = QUESTIONS.filter((q) => q.stage === "safety");
export const SCORING_QUESTIONS = QUESTIONS.filter((q) => q.stage !== "safety");
