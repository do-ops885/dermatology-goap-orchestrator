import React from 'react';
import { useTheme, Theme } from '../context/ThemeContext';
import { Sun, Moon, Contrast } from 'lucide-react';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themes: { id: Theme; icon: React.ReactNode; label: string }[] = [
    { id: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
    { id: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
    { id: 'contrast', icon: <Contrast className="w-4 h-4" />, label: 'Contrast' },
  ];

  return (
    <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-full border border-stone-200 dark:border-stone-700">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={`p-1.5 rounded-full transition-all flex items-center justify-center ${
            theme === t.id
              ? 'bg-white dark:bg-stone-600 text-terracotta-600 shadow-sm'
              : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
          }`}
          title={t.label}
          aria-label={`Switch to ${t.label} theme`}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
};