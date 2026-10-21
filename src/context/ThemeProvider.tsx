import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_PALETTE, PALETTES } from './palettes';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'wsi-theme';
const PALETTE_STORAGE_KEY = 'wsi-palette';
const FONT_LINK_ID = 'palette-font';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  /** Colour palette id (see palettes.ts); applied as `data-palette` on <html>. */
  palette: string;
  setPalette: (palette: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the choice just isn't remembered.
  }
}

function getInitialTheme(): Theme {
  const stored = readStorage(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialPalette(): string {
  const stored = readStorage(PALETTE_STORAGE_KEY);
  return PALETTES.some((p) => p.id === stored) ? (stored as string) : DEFAULT_PALETTE;
}

interface ThemeProviderProps {
  children: ReactNode;
}

/** Applies `data-theme` and `data-palette` to <html> (see assets/styles) and persists the user's choice. */
export default function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [palette, setPalette] = useState<string>(getInitialPalette);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeStorage(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    writeStorage(PALETTE_STORAGE_KEY, palette);
    // Load the palette's extra font only while it is active (IBM Plex stays the fallback).
    const href = PALETTES.find((p) => p.id === palette)?.fontHref;
    const existing = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
    if (!href) {
      existing?.remove();
    } else if (existing?.href !== href) {
      const link = existing ?? document.createElement('link');
      link.id = FONT_LINK_ID;
      link.rel = 'stylesheet';
      link.href = href;
      if (!existing) document.head.appendChild(link);
    }
  }, [palette]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, palette, setPalette }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
