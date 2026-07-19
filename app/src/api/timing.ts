import { postJSON } from "./http";

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

  const data = await postJSON<{ items?: TimingItem[] }>("/api/timing", { names });
  const map: Record<string, Timing> = {};
  for (const it of data.items ?? []) {
    if (it?.name) map[it.name] = { time: it.time, color: it.color };
  }
  return map;
}
