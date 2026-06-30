import { API_URL } from "./config";

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
  const res = await fetch(`${API_URL}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ diaries, supplements }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`recommend failed (${res.status}) ${body}`);
  }

  return (await res.json()) as RecommendResult;
}
