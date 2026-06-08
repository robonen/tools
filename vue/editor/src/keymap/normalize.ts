import type { Platform } from '../view/config';

const MOD_ORDER = ['Ctrl', 'Alt', 'Shift', 'Meta'] as const;

function modAlias(token: string, platform: Platform): string | null {
  switch (token.toLowerCase()) {
    case 'mod': return platform === 'mac' ? 'Meta' : 'Ctrl';
    case 'cmd':
    case 'command':
    case 'meta': return 'Meta';
    case 'ctrl':
    case 'control': return 'Ctrl';
    case 'alt':
    case 'option': return 'Alt';
    case 'shift': return 'Shift';
    default: return null;
  }
}

/**
 * Normalize a human combo (`'Mod-Shift-z'`) to a canonical, platform-resolved
 * form (`'Shift-Meta-z'` on mac). Modifiers are ordered deterministically so a
 * keydown event maps to the same string via {@link eventToCombo}.
 */
export function normalizeCombo(combo: string, platform: Platform): string {
  const parts = combo.split(/[-+]/).map(part => part.trim()).filter(Boolean);
  const key = parts.pop() ?? '';
  const mods = new Set<string>();

  for (const part of parts) {
    const mod = modAlias(part, platform);
    if (mod)
      mods.add(mod);
  }

  const order = MOD_ORDER.filter(mod => mods.has(mod));
  const normalizedKey = key.length === 1 ? key.toLowerCase() : key;
  return [...order, normalizedKey].join('-');
}

/** Canonical combo string for a keydown event (matches {@link normalizeCombo}). */
export function eventToCombo(event: KeyboardEvent): string {
  const mods: string[] = [];

  if (event.ctrlKey) mods.push('Ctrl');
  if (event.altKey) mods.push('Alt');
  if (event.shiftKey) mods.push('Shift');
  if (event.metaKey) mods.push('Meta');

  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  return [...mods, key].join('-');
}
