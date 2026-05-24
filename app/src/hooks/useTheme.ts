import { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';

export type Theme = 'dark' | 'light';

function getInitial(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('theme') as Theme | null;
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  localStorage.setItem('theme', theme);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitial);

  // Sync class on mount and whenever theme changes
  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggle = useCallback((e?: React.MouseEvent) => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';

    // Capture click origin for the circular clip-path animation
    const x = e?.clientX ?? window.innerWidth  / 2;
    const y = e?.clientY ?? window.innerHeight / 2;
    const r = Math.hypot(
      Math.max(x, window.innerWidth  - x),
      Math.max(y, window.innerHeight - y),
    );
    document.documentElement.style.setProperty('--vt-x', `${x}px`);
    document.documentElement.style.setProperty('--vt-y', `${y}px`);
    document.documentElement.style.setProperty('--vt-r', `${r}px`);

    // View Transitions API — flushSync ensures React updates the DOM
    // synchronously inside the transition callback
    if (!document.startViewTransition) {
      setTheme(next);
      return;
    }
    document.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });
  }, [theme]);

  return { theme, toggle };
}
