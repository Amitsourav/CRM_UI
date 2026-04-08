import { create } from "zustand";

interface VoiceState {
  lastCallFailed: boolean;
  setLastCallFailed: (failed: boolean) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  lastCallFailed: false,
  setLastCallFailed: (failed) => set({ lastCallFailed: failed }),
}));
