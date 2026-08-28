// ── 근거 출처 ────────────────────────────────────────────────────────────────
// App Review rejected 1.0.0 (build 18) under Guideline 1.4.1: the app gave
// health recommendations "without citations, such as links to sources". Every
// URL below was opened and checked (HTTP 200 + page title matched the intended
// subject) before being added. Two otherwise-obvious sources are deliberately
// absent because they could NOT be verified — both sit behind bot protection
// that returns the same response for real and nonexistent pages:
//
//   · NIH ODS   (ods.od.nih.gov)   → 403 for every path, valid or not
//   · JISSN articles (Springer)    → "Client Challenge" interstitial
//
// A citation a reviewer cannot open is worse than no citation, so they stay out
// until someone can confirm them from a real browser.
//
// Grades A/B/C are this app's OWN classification informed by these references.
// They are NOT a mapping of the AIS Group A/B/C/D framework — checked against
// the four official AIS group pages, 6 of the 17 overlapping ingredients
// disagree (beetroot is A in AIS and B here). Saying otherwise would be a claim
// a reviewer could disprove in one click, so `SELF_CLASSIFICATION_NOTICE` says
// plainly that the grades are ours.

export type Source = {
  /** Shown as the link label. */
  label: string;
  url: string;
  /** One line on what this source actually backs up. */
  note: string;
};

/** 앱 전체가 참고한 기관 — "근거 및 출처" 화면 상단. */
export const PRIMARY_SOURCES: Source[] = [
  {
    label: "식품의약품안전처 고시",
    url: "https://www.law.go.kr/admRulLsInfoP.do?admRulSeq=2100000070681",
    note: "「건강기능식품 기능성 원료 및 기준·규격 인정에 관한 규정」. 국내 기능성 원료와 기능성 표시의 법적 기준이에요.",
  },
  {
    label: "식약처 건강기능식품 기능성 원료 정보",
    url: "https://www.foodsafetykorea.go.kr/portal/healthyfoodlife/functionalityView.do?menu_no=2657&menu_grp=MENU_NEW01",
    note: "원료별로 인정된 기능성과 일일 섭취량을 찾아볼 수 있어요.",
  },
  {
    label: "보건복지부 2020 한국인 영양소 섭취기준(KDRIs)",
    url: "https://www.mohw.go.kr/board.es?mid=a10411010100&bid=0019&tag=&act=view&list_no=370012",
    note: "권장섭취량과 상한섭취량의 근거예요.",
  },
  {
    label: "호주 스포츠 연구소(AIS) 보충제 프레임워크",
    url: "https://www.ausport.gov.au/ais/nutrition/supplements/about-the-ais-sports-supplement-framework",
    note: "운동·스포츠 관련 원료의 근거 등급 체계를 참고했어요.",
  },
  {
    label: "국제스포츠영양학회(ISSN)",
    url: "https://www.sportsnutritionsociety.org/",
    note: "임상 연구 기반 영양성분 가이드라인을 참고했어요.",
  },
  {
    label: "ISSN 학술지 JISSN 안내",
    url: "https://www.sportsnutritionsociety.org/jissn.html",
    note: "위 가이드라인이 실리는 학술지예요.",
  },
  {
    label: "질병관리청 국가건강정보포털",
    url: "https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoMain.do",
    note: "국내 기관이 제공하는 한국어 건강 정보예요.",
  },
];

/** 개별 팩트시트가 없는 원료가 대신 안내받는 출처. */
export const FALLBACK_SOURCES: Source[] = [PRIMARY_SOURCES[1], PRIMARY_SOURCES[0]];

export const NO_FACTSHEET_NOTE =
  "개별 기관 팩트시트가 없는 원료예요. 식약처 기능성 원료 정보에서 인정된 기능성을 확인해 주세요.";

export const SELF_CLASSIFICATION_NOTICE =
  "비타망고의 근거 등급(A·B·C)은 위 자료를 참고해 정한 자체 분류예요. 각 기관의 공식 등급과 다를 수 있고, 추천 순위 계산에만 쓰이며 효능을 보증하지 않아요.";

export const INTRO_TEXT =
  "비타망고의 성분 분류와 추천 목록은 국가 표준 고시와 국제 전문기관의 학술 자료를 참고해 구축했어요.";

/** 출처 링크를 마지막으로 열어 확인한 날. 화면 하단에 표시돼요. */
export const SOURCES_CHECKED_ON = "2026-08-28";

const MP = "https://medlineplus.gov";
const NCCIH = "https://www.nccih.nih.gov/health";
const AIS = "https://www.ausport.gov.au/ais/nutrition/supplements";

const mp = (label: string, path: string, note: string): Source => ({
  label: `MedlinePlus — ${label}`,
  url: `${MP}${path}`,
  note,
});
const nccih = (label: string, path: string, note: string): Source => ({
  label: `NCCIH — ${label}`,
  url: `${NCCIH}${path}`,
  note,
});
const ais = (group: "a" | "b" | "c", note: string): Source => ({
  label: `AIS 보충제 프레임워크 — Group ${group.toUpperCase()}`,
  url: `${AIS}/group_${group}`,
  note,
});

const NIH_NOTE = "미국 국립보건원(NIH)이 제공하는 성분 자료예요.";
const AIS_NOTE = "호주 스포츠 연구소의 원료 분류 자료예요.";

/**
 * 성분 id → 그 성분에 직접 해당하는 출처. 비어 있으면 `FALLBACK_SOURCES` 를 씁니다.
 * id 는 data/supplements.ts 의 `id` 와 같아야 해요.
 */
export const SUPPLEMENT_SOURCES: Record<string, Source[]> = {
  // ── 지방산 ──
  omega3: [
    mp("Omega-3 fats", "/ency/patientinstructions/000767.htm", NIH_NOTE),
    ais("b", AIS_NOTE),
  ],
  krill: [mp("Omega-3 fats", "/ency/patientinstructions/000767.htm", NIH_NOTE), ais("b", AIS_NOTE)],
  gla: [nccih("Evening Primrose Oil", "/evening-primrose-oil", NIH_NOTE)],

  // ── 비타민 ──
  vitaminD: [mp("Vitamin D", "/vitamind.html", NIH_NOTE), ais("a", AIS_NOTE)],
  vitaminC: [mp("Vitamin C", "/ency/article/002404.htm", NIH_NOTE), ais("b", AIS_NOTE)],
  vitaminB: [mp("B Vitamins", "/bvitamins.html", NIH_NOTE)],
  vitaminB12: [mp("Vitamin B12", "/ency/article/002403.htm", NIH_NOTE)],
  folate: [mp("Folic Acid", "/folicacid.html", NIH_NOTE)],
  vitaminE: [mp("Vitamin E", "/vitamine.html", NIH_NOTE), ais("c", AIS_NOTE)],
  vitaminA: [mp("Vitamin A", "/vitamina.html", NIH_NOTE)],
  vitaminK2: [mp("Vitamin K", "/ency/article/002407.htm", NIH_NOTE)],
  biotin: [mp("Pantothenic acid and biotin", "/ency/article/002410.htm", NIH_NOTE)],
  niacin: [mp("Niacin", "/ency/article/002409.htm", NIH_NOTE)],
  multivitamin: [mp("Dietary Supplements", "/dietarysupplements.html", NIH_NOTE)],

  // ── 미네랄 ──
  magnesium: [mp("Magnesium in diet", "/ency/article/002423.htm", NIH_NOTE), ais("c", AIS_NOTE)],
  zinc: [mp("Zinc in diet", "/ency/article/002416.htm", NIH_NOTE), ais("a", AIS_NOTE)],
  iron: [mp("Iron", "/iron.html", NIH_NOTE), ais("a", AIS_NOTE)],
  calcium: [mp("Calcium", "/calcium.html", NIH_NOTE), ais("a", AIS_NOTE)],
  selenium: [mp("Selenium in diet", "/ency/article/002414.htm", NIH_NOTE)],
  chromium: [mp("Chromium in diet", "/ency/article/002418.htm", NIH_NOTE)],

  // ── 장 건강 ──
  probiotics: [
    nccih("Probiotics", "/probiotics-usefulness-and-safety", NIH_NOTE),
    ais("b", AIS_NOTE),
  ],
  prebiotics: [nccih("Probiotics", "/probiotics-usefulness-and-safety", NIH_NOTE)],
  glutamine: [mp("Amino acids", "/ency/article/002222.htm", NIH_NOTE)],

  // ── 눈 ──
  lutein: [
    {
      label: "미국 국립안연구소(NEI) — AREDS·AREDS2 연구",
      url: "https://www.nei.nih.gov/eye-health-information/clinical-trials/age-related-eye-disease-studies-aredsareds2",
      note: "루테인이 포함된 눈 건강 임상연구예요.",
    },
  ],
  astaxanthin: [],

  // ── 관절 ──
  glucosamine: [
    nccih(
      "Glucosamine and Chondroitin",
      "/glucosamine-and-chondroitin-for-osteoarthritis-what-you-need-to-know",
      NIH_NOTE
    ),
  ],
  chondroitin: [
    nccih(
      "Glucosamine and Chondroitin",
      "/glucosamine-and-chondroitin-for-osteoarthritis-what-you-need-to-know",
      NIH_NOTE
    ),
  ],
  msm: [],

  // ── 운동 ──
  creatine: [ais("a", AIS_NOTE)],
  protein: [mp("Protein in diet", "/ency/article/002467.htm", NIH_NOTE), ais("a", AIS_NOTE)],
  bcaa: [mp("Amino acids", "/ency/article/002222.htm", NIH_NOTE), ais("c", AIS_NOTE)],

  // ── 심혈관·혈행·대사 ──
  coq10: [nccih("Coenzyme Q10", "/coenzyme-q10", NIH_NOTE)],
  ginkgo: [nccih("Ginkgo", "/ginkgo", NIH_NOTE)],
  beet: [ais("a", AIS_NOTE)],
  berberine: [],

  // ── 간 ──
  milkThistle: [nccih("Milk Thistle", "/milk-thistle", NIH_NOTE)],
  curcumin: [nccih("Turmeric", "/turmeric", NIH_NOTE), ais("b", AIS_NOTE)],
  nac: [ais("b", AIS_NOTE)],

  // ── 수면·스트레스 ──
  theanine: [],
  ashwagandha: [nccih("Ashwagandha", "/ashwagandha", NIH_NOTE)],
  melatonin: [nccih("Melatonin", "/melatonin-what-you-need-to-know", NIH_NOTE)],

  // ── 피부 ──
  collagen: [ais("b", AIS_NOTE)],
  hyaluronic: [],

  // ── 활력 ──
  redGinseng: [nccih("Asian Ginseng", "/asian-ginseng", NIH_NOTE)],
  taurine: [],
  carnitine: [ais("b", AIS_NOTE)],

  // ── 면역 ──
  propolis: [],
  echinacea: [nccih("Echinacea", "/echinacea", NIH_NOTE)],
  spirulina: [],

  // ── 남성·여성·인지 ──
  sawPalmetto: [nccih("Saw Palmetto", "/saw-palmetto", NIH_NOTE)],
  maca: [],
  cranberry: [nccih("Cranberry", "/cranberry", NIH_NOTE)],
  phosphatidylserine: [],
};

/** 성분 하나에 보여줄 출처. 전용 출처가 없으면 공통 출처로 안내해요. */
export function sourcesFor(id: string | undefined): {
  sources: Source[];
  hasOwn: boolean;
} {
  const own = id ? SUPPLEMENT_SOURCES[id] : undefined;
  if (own && own.length) return { sources: own, hasOwn: true };
  return { sources: FALLBACK_SOURCES, hasOwn: false };
}
