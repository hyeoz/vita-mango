import { NativeModules, Platform } from "react-native";
import type { PendingTakenAction } from "./actionLogic";

export { applyPendingTakenActions } from "./actionLogic";
export type { PendingTakenAction } from "./actionLogic";

type NotificationActionStore = {
  consumePendingActions(): Promise<unknown>;
};

const nativeStore = NativeModules.VMNotificationActionStore as
  | NotificationActionStore
  | undefined;

function isPendingTakenAction(value: unknown): value is PendingTakenAction {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.eventId === "string" &&
    typeof item.name === "string" &&
    item.name.length > 0 &&
    typeof item.deliveredAt === "number" &&
    Number.isFinite(item.deliveredAt) &&
    (item.supplementId === undefined || typeof item.supplementId === "string")
  );
}

/** Atomically drains actions saved by the iOS notification delegate. */
export async function consumePendingTakenActions(): Promise<PendingTakenAction[]> {
  if (Platform.OS !== "ios" || !nativeStore) return [];
  try {
    const raw = await nativeStore.consumePendingActions();
    return Array.isArray(raw) ? raw.filter(isPendingTakenAction) : [];
  } catch (error) {
    console.warn("[notify] could not consume pending intake actions", error);
    return [];
  }
}
