import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

type ThemeState = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark' as Theme,
      toggleTheme() {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        set({ theme: next });
      },
      setTheme(theme: Theme) {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },
    }),
    {
      name: 'pulse-theme',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
