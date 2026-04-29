import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { API_BASE } from "@/shell/api/client";

const STORAGE_KEY = "vendor_auth";
const HEADERS = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true",
};

export type VendorAuth = {
  token: string;
  role: string;
  loginId: string;
  bankName: string | null;
  bankRole: string | null;
  displayName: string | null;
  mustChangePassword: boolean;
};

type LoginResult = { success: boolean; mustChangePassword?: boolean; reason?: string };

type AuthContextValue = {
  auth: VendorAuth | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStorage(): VendorAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as VendorAuth) : null;
  } catch {
    return null;
  }
}

function writeStorage(value: VendorAuth | null) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<VendorAuth | null>(() => readStorage());
  const [loading, setLoading] = useState(false);

  async function login(username: string, password: string): Promise<LoginResult> {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data?.success) {
        return { success: false, reason: data?.message || "로그인 실패" };
      }
      const next: VendorAuth = {
        token: data.token,
        role: data.role,
        loginId: username,
        bankName: data.bank_name ?? null,
        bankRole: data.bank_role ?? null,
        displayName: data.display_name ?? null,
        mustChangePassword: !!data.must_change_password,
      };
      writeStorage(next);
      setAuth(next);
      return { success: true, mustChangePassword: next.mustChangePassword };
    } catch (e) {
      return { success: false, reason: "네트워크 오류" };
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    writeStorage(null);
    setAuth(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      isAuthenticated: !!auth?.token,
      loading,
      login,
      logout,
    }),
    [auth, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
