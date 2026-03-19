"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

export type CustomerUser = {
  customerId: string;
  name: string;
  email: string;
};

type AuthModalMode = "login" | "register";

type AuthContextType = {
  user: CustomerUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    phone?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  authModalOpen: boolean;
  authModalMode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>("login");

  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/customer/me", {
          credentials: "include",
        });
        const data = await res.json();
        if (data.success && data.data) {
          setUser(data.data);
        }
      } catch {
        // Not logged in
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/customer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Login failed");
    }
    setUser(data.data);
  }, []);

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      phone?: string
    ) => {
      const res = await fetch("/api/auth/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password, phone }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Registration failed");
      }
      setUser(data.data);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/customer/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore
    }
    setUser(null);
  }, []);

  const openAuthModal = useCallback((mode: AuthModalMode = "login") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
