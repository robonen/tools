export type Platform = 'mac' | 'other';

/** Editor-wide configuration provided through the editor context. */
export interface EditorConfig {
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

/** Detect the platform from the user agent (defaults to `'other'` off-browser). */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined')
    return 'other';

  const probe = navigator.userAgent || '';
  return /Mac|iPhone|iPad|iPod/.test(probe) ? 'mac' : 'other';
}

/** Build a config with sensible defaults. */
export function resolveConfig(partial?: Partial<EditorConfig>): EditorConfig {
  return {
    editable: partial?.editable ?? true,
    platform: partial?.platform ?? detectPlatform(),
    dir: partial?.dir ?? 'ltr',
    spellcheck: partial?.spellcheck ?? true,
    draggable: partial?.draggable ?? false,
  };
}
