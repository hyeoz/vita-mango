import React, { createContext, useContext, useEffect, useState } from "react";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { signInWithGoogle, signOutEverywhere } from "../firebase/auth";

type AuthState = {
  user: FirebaseAuthTypes.User | null;
  initializing: boolean;
  signingIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth().onAuthStateChanged((u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsub;
  }, []);

  const signIn = async () => {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      console.warn("[auth] sign-in failed", e);
      setError(e?.message ?? "로그인에 실패했어요.");
    } finally {
      setSigningIn(false);
    }
  };

  const signOut = async () => {
    try {
      await signOutEverywhere();
    } catch (e) {
      console.warn("[auth] sign-out failed", e);
    }
  };

  return (
    <Ctx.Provider value={{ user, initializing, signingIn, error, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
