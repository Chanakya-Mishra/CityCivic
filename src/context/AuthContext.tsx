"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface User {
  id: string;
  email: string;
  phone: string;
  name?: string;
  role: "CITIZEN" | "WARD_OFFICER" | "ADMIN";
  wardId?: string;
  ward?: { id: string; name: string; code: string };
  karma?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  refreshUser: () => Promise<void>;
  switchPersona: (role: "CITIZEN" | "WARD_OFFICER" | "ADMIN", password?: string) => Promise<{ success: boolean; error?: string }>;
  governanceLogin: (email: string, password: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const switchPersona = async (
    role: "CITIZEN" | "WARD_OFFICER" | "ADMIN",
    password?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const governanceLogin = async (
    email: string,
    password: string,
    role?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/governance-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Authentication failed" };
      }
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Network error" };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        refreshUser: fetchCurrentUser,
        switchPersona,
        governanceLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
