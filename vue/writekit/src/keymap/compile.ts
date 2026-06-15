import type { Command } from '../state';
import type { Platform } from '../view/config';
import type { Keymap } from './types';
import { normalizeCombo } from './normalize';

/**
 * Merge ordered keymaps into a single normalized lookup. Earlier keymaps win, so
 * pass user overrides before the defaults: `compileKeymaps([user, defaults], …)`.
 */
export function compileKeymaps(keymaps: readonly Keymap[], platform: Platform): Map<string, Command> {
  const compiled = new Map<string, Command>();

  for (const keymap of keymaps) {
    for (const combo in keymap) {
      const normalized = normalizeCombo(combo, platform);
      if (!compiled.has(normalized))
        compiled.set(normalized, keymap[combo]!);
    }
  }

  return compiled;
}
