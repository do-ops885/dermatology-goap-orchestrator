import { createContext } from 'react';

import { type Theme } from './types';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (_theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: (_theme: Theme) => {},
});
