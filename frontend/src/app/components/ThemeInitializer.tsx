"use client";
import { useEffect } from "react";
import { useTheme } from "@/store/useTheme";

export function ThemeInitializer() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Apply stored theme on mount
    const stored = localStorage.getItem('pulse-theme');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const t = parsed.state?.theme || 'dark';
        document.documentElement.setAttribute('data-theme', t);
        setTheme(t);
      } catch {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } else {
      // Check system preference on first visit
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = prefersDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', initial);
      setTheme(initial);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
