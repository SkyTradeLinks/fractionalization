/**
 * Theme store for managing dark/light mode state
 * Note: next-themes handles most theme logic, this is for additional UI state if needed
 */

import { create } from 'zustand';

interface ThemeStore {
  isMounted: boolean;
  setMounted: (mounted: boolean) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isMounted: false,
  setMounted: (mounted) => set({ isMounted: mounted }),
}));
