import { create } from "zustand";
import api from "@/lib/api";
import type { User } from "@/types";

interface UsersState {
  users: User[];
  byId: Record<string, User>;
  isLoading: boolean;
  fetched: boolean;
  ensureFetched: () => Promise<void>;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: [],
  byId: {},
  isLoading: false,
  fetched: false,
  ensureFetched: async () => {
    if (get().fetched || get().isLoading) return;
    set({ isLoading: true });
    try {
      const { data } = await api.get<User[] | { items: User[] }>(
        "/users?is_active=true"
      );
      const list = Array.isArray(data) ? data : (data.items ?? []);
      const byId: Record<string, User> = {};
      for (const u of list) byId[u.id] = u;
      set({ users: list, byId, fetched: true, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
