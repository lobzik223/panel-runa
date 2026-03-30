import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';

type ThemeContextType = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('panel-theme') as ThemeMode | null;
      if (stored === 'dark' || stored === 'light') return stored;
    }
    return 'light';
  });

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    if (typeof window !== 'undefined') localStorage.setItem('panel-theme', t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
