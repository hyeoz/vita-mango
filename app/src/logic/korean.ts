// Korean particle agreement. "아슈와간다와" is right and "테아닌와" is not —
// 와/과 depends on whether the preceding syllable ends in a consonant, and
// getting it wrong is the kind of thing that makes copy read as machine-made.

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

// 에프 · 엘 · 엠 · 엔 · 알 · 에스 · 엑스 all end on a 받침 when read aloud.
const LATIN_CONSONANT_FINAL = new Set(["f", "l", "m", "n", "r", "s", "x"]);
// 영 · 일 · 삼 · 육 · 칠 · 팔 likewise.
const DIGIT_CONSONANT_FINAL = new Set(["0", "1", "3", "6", "7", "8"]);

/** True when the last character is a Hangul syllable carrying a 받침. */
function endsWithConsonant(word: string): boolean {
  const last = word.trim().slice(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code < HANGUL_START || code > HANGUL_END) {
    // Latin letters and digits agree with how they're *read* in Korean:
    // M is 엠 (받침 ㅁ) so "MSM과", while A is 에이 so "BCAA와". Names like
    // 오메가-3 (삼) and 코엔자임Q10 (십) end on a consonant the same way.
    const ch = last.toLowerCase();
    if (LATIN_CONSONANT_FINAL.has(ch)) return true;
    if (DIGIT_CONSONANT_FINAL.has(ch)) return true;
    return false;
  }
  return (code - HANGUL_START) % 28 !== 0;
}

/** Joins names and appends the agreeing 와/과. */
export function joinWithParticle(names: string[]): string {
  if (!names.length) return "";
  const joined = names.join(" · ");
  return `${joined}${endsWithConsonant(names[names.length - 1]) ? "과" : "와"}`;
}
