import type { Question } from "./types";

// ── The survey ───────────────────────────────────────────────────────────────
// 50 questions: 44 that score health domains, then 6 safety questions that set
// exclusion flags instead of scoring. Every answer is 그렇다 / 모르겠다 / 아니다,
// weighted 1 / 0.3 / 0 — "모르겠다" nudges rather than counts, so a user who
// shrugs through the survey gets a weak, honest result instead of a confident
// wrong one.
//
// `domains` weights say how strongly a "yes" argues for a need in that area.
// `invert: true` flips the scale for habit questions phrased positively
// ("채소를 매일 먹는다"), where it is the *no* answer that signals a gap.
//
// Safety questions are asked last, deliberately: by then the user has invested
// enough to answer them honestly, and they gate the entire result.

export const QUESTIONS: Question[] = [
  // ── 수면·회복 ──
  {
    id: "sleep_latency",
    section: "수면·회복",
    text: "잠자리에 누워 잠들기까지 30분 이상 걸릴 때가 많아요.",
    domains: { sleep: 1, stress: 0.4 },
  },
  {
    id: "sleep_wake",
    section: "수면·회복",
    text: "자다가 중간에 깨는 일이 잦아요.",
    domains: { sleep: 0.9, stress: 0.3 },
  },
  {
    id: "sleep_unrested",
    section: "수면·회복",
    text: "충분히 잤는데도 개운하지 않아요.",
    domains: { sleep: 0.7, fatigue: 0.8 },
  },
  {
    id: "sleep_cramp",
    section: "수면·회복",
    text: "밤에 다리에 쥐가 나거나 근육이 뭉치는 편이에요.",
    domains: { muscle: 0.9, sleep: 0.4 },
  },

  // ── 스트레스·기분 ──
  {
    id: "stress_tense",
    section: "스트레스·기분",
    text: "요즘 긴장이 잘 풀리지 않고 예민한 상태예요.",
    domains: { stress: 1, sleep: 0.3 },
  },
  {
    id: "stress_overwhelm",
    section: "스트레스·기분",
    text: "해야 할 일에 자주 압도되는 느낌이 들어요.",
    domains: { stress: 0.9, mood: 0.5 },
  },
  {
    id: "mood_down",
    section: "스트레스·기분",
    text: "이유 없이 기분이 가라앉는 날이 많아요.",
    domains: { mood: 1, sleep: 0.3 },
  },
  {
    id: "mood_winter",
    section: "스트레스·기분",
    text: "해가 짧은 계절에 유독 처지는 편이에요.",
    domains: { mood: 0.7 },
  },

  // ── 피로·활력 ──
  {
    id: "fatigue_afternoon",
    section: "피로·활력",
    text: "오후만 되면 눈에 띄게 기운이 떨어져요.",
    domains: { fatigue: 1 },
  },
  {
    id: "fatigue_morning",
    section: "피로·활력",
    text: "아침에 일어나는 게 유난히 힘들어요.",
    domains: { fatigue: 0.8, sleep: 0.5 },
  },
  {
    id: "fatigue_dizzy",
    section: "피로·활력",
    text: "일어설 때 어지럽거나 숨이 찰 때가 있어요.",
    domains: { anemia: 1, fatigue: 0.5 },
  },
  {
    id: "fatigue_pale",
    section: "피로·활력",
    text: "안색이 창백하다는 말을 듣거나 손발이 유난히 차요.",
    domains: { anemia: 0.8, circulation: 0.5 },
  },

  // ── 면역·호흡기 ──
  {
    id: "immune_cold",
    section: "면역·호흡기",
    text: "감기에 자주 걸리고 한번 걸리면 오래가요.",
    domains: { immunity: 1, respiratory: 0.4 },
  },
  {
    id: "immune_throat",
    section: "면역·호흡기",
    text: "목이 자주 붓거나 칼칼한 느낌이 있어요.",
    domains: { respiratory: 0.9, immunity: 0.5 },
  },
  {
    id: "immune_sore",
    section: "면역·호흡기",
    text: "입안이 자주 헐거나 상처가 더디게 아물어요.",
    domains: { immunity: 0.7, skin: 0.5 },
  },

  // ── 소화·장 ──
  {
    id: "gut_irregular",
    section: "소화·장",
    text: "배변 주기가 불규칙한 편이에요.",
    domains: { gut: 1, digestion: 0.6 },
  },
  {
    id: "gut_bloat",
    section: "소화·장",
    text: "식후에 배가 더부룩하거나 가스가 잘 차요.",
    domains: { digestion: 1, gut: 0.7 },
  },
  {
    id: "gut_antibiotic",
    section: "소화·장",
    text: "최근 몇 달 안에 항생제를 복용한 적이 있어요.",
    domains: { gut: 0.8 },
  },
  {
    id: "gut_fiber",
    section: "소화·장",
    text: "채소·통곡물 같은 식이섬유를 매일 챙겨 먹어요.",
    domains: { gut: 0.7, digestion: 0.5, bloodsugar: 0.3 },
    invert: true,
  },

  // ── 눈·집중 ──
  {
    id: "eye_screen",
    section: "눈·집중",
    text: "하루 6시간 이상 화면을 봐요.",
    domains: { eye: 1 },
  },
  {
    id: "eye_dry",
    section: "눈·집중",
    text: "눈이 뻑뻑하거나 침침한 느낌이 자주 들어요.",
    domains: { eye: 0.9 },
  },
  {
    id: "cog_focus",
    section: "눈·집중",
    text: "집중이 예전만 못하다고 느껴요.",
    domains: { cognition: 1, fatigue: 0.4 },
  },
  {
    id: "cog_memory",
    section: "눈·집중",
    text: "단어나 이름이 잘 떠오르지 않을 때가 늘었어요.",
    domains: { cognition: 0.9 },
  },

  // ── 관절·근육 ──
  {
    id: "joint_stiff",
    section: "관절·근육",
    text: "아침에 관절이 뻣뻣한 느낌이 있어요.",
    domains: { joint: 1 },
  },
  {
    id: "joint_knee",
    section: "관절·근육",
    text: "계단을 오르내릴 때 무릎이 불편해요.",
    domains: { joint: 0.9 },
  },
  {
    id: "muscle_train",
    section: "관절·근육",
    text: "주 3회 이상 근력 운동을 해요.",
    domains: { muscle: 1 },
  },
  {
    id: "muscle_recover",
    section: "관절·근육",
    text: "운동 후 회복이 예전보다 오래 걸려요.",
    domains: { muscle: 0.8, fatigue: 0.5 },
  },

  // ── 뼈 ──
  {
    id: "bone_dairy",
    section: "뼈",
    text: "우유·유제품을 거의 먹지 않아요.",
    domains: { bone: 0.9 },
  },
  {
    id: "bone_age",
    section: "뼈",
    text: "골밀도가 낮다는 얘기를 들은 적이 있어요.",
    domains: { bone: 1 },
  },

  // ── 심혈관·혈행·대사 ──
  {
    id: "cardio_lipid",
    section: "심혈관·대사",
    text: "콜레스테롤이나 중성지방이 높다는 얘기를 들었어요.",
    domains: { cholesterol: 1, cardio: 0.7 },
  },
  {
    id: "cardio_fish",
    section: "심혈관·대사",
    text: "생선을 주 2회 이상 먹어요.",
    domains: { cardio: 0.7, cholesterol: 0.5, cognition: 0.3 },
    invert: true,
  },
  {
    id: "meta_sugar",
    section: "심혈관·대사",
    text: "혈당이 높은 편이라는 얘기를 들었어요.",
    domains: { bloodsugar: 1 },
  },
  {
    id: "circ_cold",
    section: "심혈관·대사",
    text: "손발 저림이나 혈액순환이 안 되는 느낌이 있어요.",
    domains: { circulation: 1 },
  },

  // ── 피부·모발 ──
  {
    id: "skin_dry",
    section: "피부·모발",
    text: "피부가 건조하고 탄력이 떨어진 것 같아요.",
    domains: { skin: 1 },
  },
  {
    id: "hair_loss",
    section: "피부·모발",
    text: "머리카락이 얇아지거나 빠지는 양이 늘었어요.",
    domains: { hair: 1 },
  },
  {
    id: "hair_nail",
    section: "피부·모발",
    text: "손톱이 잘 부러지거나 세로줄이 생겼어요.",
    domains: { hair: 0.8, skin: 0.3 },
  },

  // ── 생활습관 ──
  {
    id: "life_sun",
    section: "생활습관",
    text: "하루 20분 이상 햇빛을 쬐어요.",
    domains: { bone: 0.8, immunity: 0.6, mood: 0.4 },
    invert: true,
  },
  {
    id: "life_meal",
    section: "생활습관",
    text: "하루 세 끼를 규칙적으로 챙겨 먹어요.",
    domains: { fatigue: 0.6, immunity: 0.4, antioxidant: 0.4 },
    invert: true,
  },
  {
    id: "life_veg",
    section: "생활습관",
    text: "채소와 과일을 매일 먹어요.",
    domains: { antioxidant: 0.8, immunity: 0.4 },
    invert: true,
  },
  {
    id: "life_alcohol",
    section: "생활습관",
    text: "술을 주 2회 이상 마셔요.",
    domains: { liver: 1, fatigue: 0.4 },
  },
  {
    id: "life_smoke",
    section: "생활습관",
    text: "흡연을 하거나 간접흡연 환경에 자주 있어요.",
    domains: { antioxidant: 0.8, respiratory: 0.6, cardio: 0.4 },
  },
  {
    id: "life_veggie",
    section: "생활습관",
    text: "고기·생선을 거의 먹지 않는 식단이에요.",
    domains: { anemia: 0.7, fatigue: 0.4 },
  },

  // ── 여성·남성 ──
  {
    id: "women_period",
    section: "해당되는 경우만",
    text: "월경량이 많거나 월경 전 불편감이 큰 편이에요.",
    domains: { womens: 1, anemia: 0.6 },
  },
  {
    id: "men_urine",
    section: "해당되는 경우만",
    text: "밤에 소변 때문에 깨거나 배뇨가 시원하지 않아요.",
    domains: { mens: 1 },
  },

  // ── 안전 확인 (점수 대신 제외 플래그) ──
  {
    id: "safe_pregnancy",
    section: "안전 확인",
    text: "임신 중이거나 수유 중이에요.",
    domains: {},
    safetyFlag: "pregnancy",
  },
  {
    id: "safe_anticoagulant",
    section: "안전 확인",
    text: "항응고제나 혈전 관련 약을 복용하고 있어요.",
    domains: {},
    safetyFlag: "anticoagulant",
  },
  {
    id: "safe_kidney",
    section: "안전 확인",
    text: "신장 질환이 있거나 신장 수치를 관리하고 있어요.",
    domains: {},
    safetyFlag: "kidney",
  },
  {
    id: "safe_thyroid",
    section: "안전 확인",
    text: "갑상선 약을 복용하고 있어요.",
    domains: {},
    safetyFlag: "thyroidMed",
  },
  {
    id: "safe_hormone",
    section: "안전 확인",
    text: "호르몬에 민감한 질환을 진단받은 적이 있어요.",
    domains: {},
    safetyFlag: "hormoneSensitive",
  },
  {
    id: "safe_surgery",
    section: "안전 확인",
    text: "가까운 시일 안에 수술이나 시술 예정이 있어요.",
    domains: {},
    safetyFlag: "surgerySoon",
  },
];

/** Ordered section names, used for the progress header. */
export const SECTIONS: string[] = [...new Set(QUESTIONS.map((q) => q.section))];

export const SCORING_QUESTIONS = QUESTIONS.filter((q) => !q.safetyFlag);
export const SAFETY_QUESTIONS = QUESTIONS.filter((q) => q.safetyFlag);
