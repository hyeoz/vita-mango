import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GOOGLE_WEB_CLIENT_ID } from "./config";

let configured = false;

// Call once before the first sign-in. Wires Google Sign-In to the Firebase
// project via the Web client ID.
export function configureGoogleSignin() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: false,
  });
  configured = true;
}

// Native Google account picker → Firebase credential sign-in.
export async function signInWithGoogle() {
  configureGoogleSignin();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // @react-native-google-signin v13 returns { type, data }; older shapes put the
  // token at the top level. Read both defensively.
  const result: any = await GoogleSignin.signIn();
  const idToken: string | undefined = result?.data?.idToken ?? result?.idToken;
  if (!idToken) {
    throw new Error("Google 로그인에서 idToken을 받지 못했어요.");
  }

  const credential = auth.GoogleAuthProvider.credential(idToken);
  return auth().signInWithCredential(credential);
}

// Privacy-friendly equivalent login: creates a Firebase anonymous account and
// does not request the user's name or email. All app features remain available.
export async function signInAnonymously() {
  return auth().signInAnonymously();
}

// Sign out of both Google and Firebase.
export async function signOutEverywhere() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // ignore — user may not have an active Google session
  }
  await auth().signOut();
}

// Permanently delete the signed-in account and the app data stored for it.
// Re-running Google sign-in immediately before deletion gives Firebase the
// recent credential it requires for this security-sensitive operation.
export async function deleteAccountEverywhere() {
  const current = auth().currentUser;
  if (!current) throw new Error("삭제할 로그인 계정을 찾지 못했어요.");

  // Social credentials can become stale, so refresh them immediately before
  // deletion. Anonymous accounts do not need a separate reauthentication UI.
  const user = current.isAnonymous ? current : (await signInWithGoogle()).user;

  await firestore().collection("users").doc(user.uid).delete();
  await user.delete();

  try {
    await GoogleSignin.signOut();
  } catch {
    // Firebase deletion already completed; stale Google state is non-fatal.
  }
}
