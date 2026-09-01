import type { Domain } from "../data/types";

// ── Free-text scan ───────────────────────────────────────────────────────────
// The box after the survey is mostly there so the result feels like it heard
// you. The survey is the real instrument; this only nudges (max +0.15 per
// domain) and echoes back what it noticed, so a stray sentence can never
// override 50 deliberate answers.

type Rule = { re: RegExp; domains: Partial<Record<Domain, number>>; signal: string };

const RULES: Rule[] = [
  { re: /잠|불면|뒤척|새벽|수면|sleep|insomnia|眠|不眠|sommeil|insomnie/i, domains: { sleep: 0.15 }, signal: "잠 이야기" },
  { re: /피곤|피로|지침|지쳐|방전|기운|tired|fatigue|exhaust|疲|だる|fatigu|épuis/i, domains: { fatigue: 0.15 }, signal: "피로감" },
  { re: /스트레스|불안|긴장|예민|초조|stress|anxi|tense|ストレス|不安|緊張/i, domains: { stress: 0.15 }, signal: "스트레스" },
  { re: /우울|무기력|처지|답답|depress|low mood|sad|落ち込|憂うつ|déprim|moral/i, domains: { mood: 0.12 }, signal: "가라앉은 기분" },
  { re: /눈|시력|모니터|화면|침침|eye|vision|screen|目|視力|écran|yeux|vision/i, domains: { eye: 0.12 }, signal: "눈 피로" },
  { re: /소화|더부룩|배탈|변비|설사|장|digest|bloat|constipat|diarr|消化|便秘|下痢|digestion|ballonn/i, domains: { gut: 0.12, digestion: 0.1 }, signal: "소화·장" },
  { re: /관절|무릎|허리|어깨|결림|joint|knee|back|shoulder|関節|膝|腰|articulation|genou|dos/i, domains: { joint: 0.12 }, signal: "관절 불편" },
  { re: /운동|헬스|근력|웨이트|러닝|workout|exercise|gym|running|運動|筋トレ|ランニング|sport|musculation|course/i, domains: { muscle: 0.12 }, signal: "운동 루틴" },
  { re: /피부|건조|트러블|여드름|주름|skin|dry|acne|wrinkle|肌|乾燥|ニキビ|peau|sèche|acné|ride/i, domains: { skin: 0.12 }, signal: "피부 고민" },
  { re: /머리카락|탈모|모발|머릿결|hair|hair loss|髪|抜け毛|cheveu|chute/i, domains: { hair: 0.12 }, signal: "모발 고민" },
  { re: /술|음주|숙취|회식|alcohol|drink|hangover|酒|飲酒|alcool|gueule de bois/i, domains: { liver: 0.15 }, signal: "음주" },
  { re: /감기|면역|잔병|몸살|cold|immune|風邪|免疫|rhume|immun/i, domains: { immunity: 0.12 }, signal: "잔병치레" },
  { re: /집중|기억|깜빡|건망|focus|concentrat|memory|集中|記憶|concentration|mémoire/i, domains: { cognition: 0.12 }, signal: "집중·기억" },
  { re: /어지|빈혈|창백|dizz|anemia|anaemia|めまい|貧血|vertige|anémie/i, domains: { anemia: 0.12 }, signal: "어지러움" },
  { re: /손발|저림|순환|차가|numb|circulation|cold hands|しびれ|冷え|血行|fourmi|mains froides/i, domains: { circulation: 0.12 }, signal: "혈행" },
];

export function scanFreeText(text: string): {
  domainBumps: Partial<Record<Domain, number>>;
  signals: string[];
} {
  const t = String(text ?? "").slice(0, 500);
  if (!t.trim()) return { domainBumps: {}, signals: [] };

  const bumps: Partial<Record<Domain, number>> = {};
  const signals: string[] = [];

  for (const rule of RULES) {
    if (!rule.re.test(t)) continue;
    signals.push(rule.signal);
    for (const [d, v] of Object.entries(rule.domains)) {
      const key = d as Domain;
      bumps[key] = Math.max(bumps[key] ?? 0, v as number);
    }
  }
  return { domainBumps: bumps, signals: signals.slice(0, 4) };
}
