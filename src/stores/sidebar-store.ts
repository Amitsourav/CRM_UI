import { create } from "zustand";

const STORAGE_KEY = "sidebar_collapsed";

interface SidebarState {
  collapsed: boolean;
  /** False until the stored preference has been read on the client. */
  hydrated: boolean;
  toggle: () => void;
  setCollapsed: (value: boolean) => void;
  hydrate: () => void;
}

/**
 * Desktop sidebar visibility. Persisted by hand rather than through zustand's
 * persist middleware: the store has to start `collapsed: false` on both the
 * server and the first client render or the markup mismatches, so the stored
 * value is applied in an effect afterwards. `hydrated` lets the shell skip its
 * transition on that first correction — otherwise a collapsed sidebar visibly
 * slides away on every page load.
 */
export const useSidebarStore = create<SidebarState>((set, get) => ({
  collapsed: false,
  hydrated: false,

  toggle: () => {
    const next = !get().collapsed;
    set({ collapsed: next });
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Private mode / storage disabled — the preference just won't persist.
    }
  },

  setCollapsed: (value) => {
    set({ collapsed: value });
    try {
      localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      // See above.
    }
  },

  hydrate: () => {
    if (get().hydrated) return;
    try {
      set({ collapsed: localStorage.getItem(STORAGE_KEY) === "1", hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
}));
