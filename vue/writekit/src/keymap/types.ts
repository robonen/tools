import type { Command } from '../state';

/** A keymap: normalized (or human) key-combos mapped to commands. */
export type Keymap = Record<string, Command>;
