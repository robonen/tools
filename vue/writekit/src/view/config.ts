import { isIOS, isMac } from '@robonen/platform/browsers';

export type Platform = 'mac' | 'other';

/** Writekit-wide configuration provided through the writekit context. */
export interface WritekitConfig {
  /** Whether content is editable (false renders read-only). */
  editable: boolean;
  /** Platform for keybinding normalization (`Mod` → Cmd/Ctrl). */
  platform: Platform;
  /** Text direction. */
  dir: 'ltr' | 'rtl';
  /** Native spellcheck on the contenteditable hosts. */
  spellcheck: boolean;
  /** Show per-block drag handles for reordering. */
  draggable: boolean;
}

/**
 * Detect the platform for keybinding normalization (defaults to `'other'`
 * off-browser). Delegates UA sniffing to `@robonen/platform`, which also handles
 * iPadOS masquerading as a Mac; `isMac`/`isIOS` return `undefined` off-browser.
 */
export function detectPlatform(): Platform {
  return (isMac() || isIOS()) ? 'mac' : 'other';
}

/** Build a config with sensible defaults. */
export function resolveConfig(partial?: Partial<WritekitConfig>): WritekitConfig {
  return {
    editable: partial?.editable ?? true,
    platform: partial?.platform ?? detectPlatform(),
    dir: partial?.dir ?? 'ltr',
    spellcheck: partial?.spellcheck ?? true,
    draggable: partial?.draggable ?? false,
  };
}
