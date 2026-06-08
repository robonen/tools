export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'docs-theme';

/**
 * Theme controller. The actual `.dark` class is set as early as possible by the
 * inline head script (see nuxt.config) to avoid a flash; this composable keeps a
 * reactive preference, persists it, and re-applies the resolved theme on change.
 */
export function useTheme() {
  const preference = useState<ThemePreference>('theme-preference', () => 'system');

  function resolve(pref: ThemePreference): 'light' | 'dark' {
    if (pref === 'system') {
      return import.meta.client && globalThis.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return pref;
  }

  function apply(pref: ThemePreference) {
    if (!import.meta.client) return;
    const resolved = resolve(pref);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }

  function setTheme(pref: ThemePreference) {
    preference.value = pref;
    if (import.meta.client) {
      if (pref === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, pref);
      apply(pref);
    }
  }

  function cycle() {
    const order: ThemePreference[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(preference.value) + 1) % order.length]!;
    setTheme(next);
  }

  // Initialise reactive preference from storage on the client.
  if (import.meta.client) {
    onMounted(() => {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
      preference.value = stored ?? 'system';

      // Track OS changes while in `system` mode.
      const mq = globalThis.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () => {
        if (preference.value === 'system') apply('system');
      };
      mq.addEventListener('change', onChange);
      onUnmounted(() => mq.removeEventListener('change', onChange));
    });
  }

  const resolved = computed(() => resolve(preference.value));

  return { preference, resolved, setTheme, cycle };
}
