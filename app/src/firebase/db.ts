import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import type { Supplement } from "../state/AppContext";

// One document per user holds the whole app state. Diaries and supplements are
// small arrays, so a single doc (+ one read, debounced writes) keeps the data
// layer simple and cheap. Scales fine well past this app's needs.
//
// UserData is the CLIENT-WRITABLE state. The subscription flag is deliberately
// NOT part of it: it is server-controlled (written by the Admin SDK after a
// verified purchase) and only ever read on the client. Firestore rules block
// the client from writing `subscribed` / `subscriptionExpiresAt`.
export type UserData = {
  supplements: Supplement[];
  diaries: string[];
  onbSelected: string[];
  addedRecs: string[];
  onboarded: boolean;
};

// What loadUserData returns: the writable state plus the read-only subscription.
export type LoadedUserData = UserData & { subscribed: boolean };

export function userDoc(
  uid: string
): FirebaseFirestoreTypes.DocumentReference {
  return firestore().collection("users").doc(uid);
}

// A user counts as subscribed when `subscribed` is true AND (if an expiry is
// set) that expiry is still in the future. No expiry → treated as active.
function isSubscribed(d: FirebaseFirestoreTypes.DocumentData): boolean {
  if (d.subscribed !== true) return false;
  const exp = d.subscriptionExpiresAt;
  if (exp == null) return true;
  const ms =
    typeof exp === "number"
      ? exp
      : typeof exp?.toMillis === "function"
      ? exp.toMillis()
      : 0;
  return ms > Date.now();
}

export async function loadUserData(
  uid: string
): Promise<LoadedUserData | null> {
  const snap = await userDoc(uid).get();
  if (!snap.exists) return null;
  const d = snap.data() ?? {};
  return {
    supplements: d.supplements ?? [],
    diaries: d.diaries ?? [],
    onbSelected: d.onbSelected ?? [],
    addedRecs: d.addedRecs ?? [],
    onboarded: !!d.onboarded,
    subscribed: isSubscribed(d),
  };
}

export async function seedUserData(uid: string, data: UserData): Promise<void> {
  await userDoc(uid).set({
    ...data,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

export async function saveUserData(
  uid: string,
  patch: Partial<UserData>
): Promise<void> {
  await userDoc(uid).set(
    { ...patch, updatedAt: firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
}
