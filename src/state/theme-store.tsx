import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { themes, ThemeId, defaultTheme } from '../lib/themes';
import { getSetting, setSetting } from '../lib/indexeddb';
import { events } from '../lib/events';

interface ThemeContextValue {
  theme: ThemeId;
  setTheme(id: ThemeId): void;
  available: ThemeId[];
  ready: boolean; // indicates preload complete
}

const ThemeCtx = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(defaultTheme);
  const [ready, setReady] = useState(false);

  // Preload stored theme before paint
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await getSetting<ThemeId>('activeTheme');
        if (!cancelled && stored && stored in themes) {
          setThemeState(stored);
          applyThemeClass(stored);
        } else {
          applyThemeClass(defaultTheme);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const applyThemeClass = (id: ThemeId) => {
    const root = document.documentElement; // <html>
    root.classList.remove('theme-classic','theme-subtle');
    root.classList.add(`theme-${id}`);
  };

  const setTheme = useCallback((id: ThemeId) => {
    if (!(id in themes)) return;
    setThemeState(prev => {
      if (prev === id) return prev;
      const previous = prev;
      applyThemeClass(id);
      setSetting('activeTheme', id).catch(()=>{});
      events.emit('theme:changed', { previousTheme: previous, newTheme: id, ts: performance.now() });
      return id;
    });
  }, []);

  return <ThemeCtx.Provider value={{ theme, setTheme, available: Object.keys(themes) as ThemeId[], ready }}>{children}</ThemeCtx.Provider>;
};

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('ThemeProvider missing');
  return ctx;
}
