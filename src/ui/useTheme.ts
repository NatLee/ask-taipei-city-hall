import { useEffect, useState } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';

const THEME_KEY = 'ask-taipei-city-hall:theme';
const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];

function readChoice(): ThemeChoice {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    return ORDER.includes(saved as ThemeChoice) ? (saved as ThemeChoice) : 'system';
  } catch {
    return 'system';
  }
}

/** Light, dark or follow the system; the choice is remembered on this device. */
export function useTheme(): { choice: ThemeChoice; cycle: () => void } {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = choice === 'dark' || (choice === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [choice]);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length] as ThemeChoice;
    setChoice(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Applies to this visit only.
    }
  };

  return { choice, cycle };
}
