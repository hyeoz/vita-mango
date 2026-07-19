import { postJSON } from "./http";

export type Signal = { emoji: string; label: string };

export type Recommendation = {
  name: string;
  time: string;
  score: number;
  color: string; // colour key — see theme/colors.ts pillColor
  tags: string[];
  reason: string;
};

export type RecommendResult = {
  analysis: string;
  signals: Signal[];
  recommendations: Recommendation[];
};

export type SuppInput = { name: string; time: string };

// Calls the backend, which calls Claude (claude-opus-4-8) and returns a
// structured recommendation. Throws on network / server error so the screen can
// show a retry state.
export async function fetchRecommendation(
  diaries: string[],
  supplements: SuppInput[]
): Promise<RecommendResult> {
  return postJSON<RecommendResult>("/api/recommend", { diaries, supplements });
}
