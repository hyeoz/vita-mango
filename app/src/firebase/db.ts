import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import type { Supplement } from "../state/AppContext";

// One document per user holds the whole app state. Diaries and supplements are
// small arrays, so a single doc (+ one read, debounced writes) keeps the data
// layer simple and cheap. Scales fine well past this app's needs.
export type UserData = {
  supplements: Supplement[];
  diaries: string[];
  onbSelected: string[];
  addedRecs: string[];
  onboarded: boolean;
};

export function userDoc(
  uid: string
): FirebaseFirestoreTypes.DocumentReference {
  return firestore().collection("users").doc(uid);
}

export async function loadUserData(uid: string): Promise<UserData | null> {
  const snap = await userDoc(uid).get();
  if (!snap.exists) return null;
  const d = snap.data() ?? {};
  return {
    supplements: d.supplements ?? [],
    diaries: d.diaries ?? [],
    onbSelected: d.onbSelected ?? [],
    addedRecs: d.addedRecs ?? [],
    onboarded: !!d.onboarded,
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
