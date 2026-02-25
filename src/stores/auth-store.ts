import { create } from "zustand";
import api from "@/lib/api";
import type { User, AuthTokens } from "@/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAdmin: false,

  login: async (email, password) => {
    const { data } = await api.post<AuthTokens>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    try {
      const me = await api.get<User>("/users/me");
      set({ user: me.data, isAdmin: me.data.role === "admin", isLoading: false });
    } catch {
      // /users/me failed — extract minimal info from JWT as fallback
      const payload = JSON.parse(atob(data.access_token.split(".")[1]));
      const role = payload.user_metadata?.role || "agent";
      set({
        user: {
          id: payload.sub,
          email: payload.email,
          full_name: payload.user_metadata?.full_name || email,
          role: role as "admin" | "agent",
          is_active: true,
          created_at: "",
          updated_at: "",
        } as User,
        isAdmin: role === "admin",
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
      set({ user: null, isAdmin: false });
    }
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get<User>("/users/me");
      set({ user: data, isAdmin: data.role === "admin", isLoading: false });
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      // Only clear user on 401 (unauthorized). For 500/network errors,
      // keep existing user state to avoid false logouts.
      if (err.response?.status === 401 || !localStorage.getItem("access_token")) {
        set({ user: null, isAdmin: false, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    }
  },

  reset: () => set({ user: null, isAdmin: false, isLoading: false }),
}));
