import React, { useState, useEffect } from 'react';

import { ThemeContext } from './ThemeContextDefinition';
import { type Theme } from './types';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export type { ThemeContextType } from './ThemeContextDefinition';
export { ThemeContext } from './ThemeContextDefinition';
export { type Theme } from './types';
