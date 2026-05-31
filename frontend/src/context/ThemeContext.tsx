import React, { createContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({ theme: 'light', toggleTheme: () => {} });

export const ThemeProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme('light');
    document.documentElement.classList.remove('theme-dark');
    localStorage.setItem('theme', 'light');
  }, []);

  const toggleTheme = () => {
    setTheme('light');
    document.documentElement.classList.remove('theme-dark');
    localStorage.setItem('theme', 'light');
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};
