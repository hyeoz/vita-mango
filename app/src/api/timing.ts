import { API_URL } from "./config";

export type Timing = { time: string; color: string };

type TimingItem = { name: string; time: string; color: string };

// Asks the backend (Gemini) for the generally-recommended intake time + pill
// colour for each supplement name. Returns a map keyed by name. Works for any
// name, including user-typed ones. Throws on network / server error so callers
// can fall back to defaults.
export async function fetchTimings(
  names: string[]
): Promise<Record<string, Timing>> {
  if (!names.length) return {};

  const res = await fetch(`${API_URL}/api/timing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ names }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`timing failed (${res.status}) ${body}`);
  }

  const data = (await res.json()) as { items?: TimingItem[] };
  const map: Record<string, Timing> = {};
  for (const it of data.items ?? []) {
    if (it?.name) map[it.name] = { time: it.time, color: it.color };
  }
  return map;
}
