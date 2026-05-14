"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Role } from "@/types";

interface AuthUser {
  uid: string;
  email: string;
  nome: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      const snap = await getDoc(doc(db, "usuarios", firebaseUser.uid));
      const data = snap.data();
      const role: Role = data?.role ?? "user";

      if (role !== "super_admin" && role !== "support") {
        await signOut(auth);
        setUser(null);
        setLoading(false);
        return;
      }
      setUser({ uid: firebaseUser.uid, email: firebaseUser.email!, nome: data?.nome ?? "", role });
      setLoading(false);
    });
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
