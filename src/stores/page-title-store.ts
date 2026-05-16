import { create } from "zustand";

interface PageTitleState {
  // Optional display name to substitute for a UUID-shaped breadcrumb
  // segment. The detail pages set this on mount and clear on unmount.
  segmentOverride: string | null;
  setSegmentOverride: (value: string | null) => void;
}

export const usePageTitleStore = create<PageTitleState>((set) => ({
  segmentOverride: null,
  setSegmentOverride: (value) => set({ segmentOverride: value }),
}));
