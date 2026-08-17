import React, { createContext, useContext, useEffect, useState } from "react";
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import {
  deleteAccountEverywhere,
  signInAnonymously,
  signInWithGoogle,
  signOutEverywhere,
} from "../firebase/auth";

type AuthState = {
  user: FirebaseAuthTypes.User | null;
  initializing: boolean;
  signingIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
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

  const continueAsGuest = async () => {
    setError(null);
    setSigningIn(true);
    try {
      await signInAnonymously();
    } catch (e: any) {
      console.warn("[auth] anonymous sign-in failed", e);
      setError(e?.message ?? "시작하지 못했어요.");
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

  const deleteAccount = async () => {
    setError(null);
    try {
      await deleteAccountEverywhere();
    } catch (e: any) {
      console.warn("[auth] account deletion failed", e);
      const message =
        e?.message ?? "계정을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.";
      setError(message);
      throw new Error(message);
    }
  };

  return (
    <Ctx.Provider
      value={{
        user,
        initializing,
        signingIn,
        error,
        signIn,
        continueAsGuest,
        signOut,
        deleteAccount,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
