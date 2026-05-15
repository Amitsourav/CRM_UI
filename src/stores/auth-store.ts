import { create } from "zustand";
import api from "@/lib/api";
import type { User, Role, AuthTokens } from "@/types";

interface CompanyInfo {
  company_id: string;
  company_name: string;
  company_slug: string | null;
  company_timezone: string;
}

interface AuthState {
  user: User | null;
  company: CompanyInfo | null;
  isLoading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isPreCounsellor: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  reset: () => void;
}

function extractCompany(data: Record<string, unknown>): CompanyInfo | null {
  if (data.company_id && data.company_name) {
    return {
      company_id: data.company_id as string,
      company_name: data.company_name as string,
      company_slug: (data.company_slug as string | null | undefined) ?? null,
      company_timezone: (data.company_timezone as string) || "UTC",
    };
  }
  return null;
}

// 24-hour compat shim: backend renamed the user_role enum value from
// "telecaller" → "pre_counsellor". Cached JWTs may still carry "telecaller"
// until the user logs out + back in. Treat both as the pre-counsellor role.
function isPreCounsellorRole(role: string | undefined | null): boolean {
  return role === "pre_counsellor" || role === "telecaller";
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  company: null,
  isLoading: true,
  isAdmin: false,
  isManager: false,
  isPreCounsellor: false,

  login: async (email, password) => {
    const { data } = await api.post<AuthTokens>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    try {
      const me = await api.get<User>("/users/me");
      set({
        user: me.data,
        company: extractCompany(me.data as unknown as Record<string, unknown>),
        isAdmin: me.data.role === "admin",
        isManager: me.data.role === "admin" || me.data.role === "manager",
        isPreCounsellor: isPreCounsellorRole(me.data.role),
        isLoading: false,
      });
    } catch {
      // /users/me failed — extract minimal info from JWT as fallback
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      const role = payload.user_metadata?.role || "pre_counsellor";
      set({
        user: {
          id: payload.sub,
          email: payload.email,
          full_name: payload.user_metadata?.full_name || email,
          role: role as Role,
          is_active: true,
          created_at: "",
          updated_at: "",
        } as User,
        isAdmin: role === "admin",
        isManager: role === "admin" || role === "manager",
        isPreCounsellor: isPreCounsellorRole(role),
        isLoading: false,
      });
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      localStorage.clear();
      // Clear the httpOnly cookie used by middleware
      await fetch("/api/auth/set-cookie", { method: "DELETE" }).catch(() => {});
      set({ user: null, company: null, isAdmin: false, isManager: false, isPreCounsellor: false });
    }
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get<User>("/users/me");
      set({
        user: data,
        company: extractCompany(data as unknown as Record<string, unknown>),
        isAdmin: data.role === "admin",
        isManager: data.role === "admin" || data.role === "manager",
        isPreCounsellor: isPreCounsellorRole(data.role),
        isLoading: false,
      });
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      // Only clear user on 401 (unauthorized). For 500/network errors,
      // keep existing user state to avoid false logouts.
      if (err.response?.status === 401 || !localStorage.getItem("access_token")) {
        set({ user: null, company: null, isAdmin: false, isManager: false, isPreCounsellor: false, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    }
  },

  reset: () => set({ user: null, company: null, isAdmin: false, isManager: false, isPreCounsellor: false, isLoading: false }),
}));
