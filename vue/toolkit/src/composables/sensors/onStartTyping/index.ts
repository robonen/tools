import type { VoidFunction } from '@robonen/stdlib';
import { noop } from '@robonen/stdlib';
import { defaultDocument } from '@/types';
import type { ConfigurableDocument } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';

/**
 * Decides whether the currently focused element already swallows text input
 * (an `<input>`, `<textarea>`, or any `contenteditable` host). When it does we
 * leave the keystroke alone so we never steal focus from a real text field.
 */
export function isFocusedElementEditable(document: Document): boolean {
  const { activeElement, body } = document;

  // No focus, or focus parked on <body>, means nothing is being edited.
  if (!activeElement || activeElement === body)
    return false;

  switch (activeElement.tagName) {
    case 'INPUT':
    case 'TEXTAREA':
      return true;
  }

  return activeElement.hasAttribute('contenteditable');
}

/**
 * Returns `true` when the event represents a single printable character typed
 * without a command/control/alt modifier. Uses `KeyboardEvent.key` (a single
 * Unicode grapheme for printable keys) instead of the deprecated `keyCode`, so
 * it transparently covers digits, latin letters and any other printable glyph.
 */
export function isTypedCharValid(event: KeyboardEvent): boolean {
  const { key, metaKey, ctrlKey, altKey } = event;

  if (metaKey || ctrlKey || altKey)
    return false;

  // Named keys ('Enter', 'Tab', 'ArrowUp', ...) are longer than one code unit.
  // Printable characters (including surrogate-pair emoji) are not.
  return key.length === 1 || [...key].length === 1;
}

export interface OnStartTypingOptions extends ConfigurableDocument {
  /**
   * Predicate deciding whether a keystroke counts as the start of typing.
   *
   * @default isTypedCharValid (single printable char, no meta/ctrl/alt)
   */
  isTypedCharValid?: (event: KeyboardEvent) => boolean;
  /**
   * Predicate deciding whether the focused element is already editable, in
   * which case the callback is skipped.
   *
   * @default isFocusedElementEditable
   */
  isFocusedElementEditable?: (document: Document) => boolean;
}

export type OnStartTypingReturn = VoidFunction;

/**
 * @name onStartTyping
 * @category Sensors
 * @description Fires the callback when the user starts typing on a non-editable element, ideal for auto-focusing a search box.
 *
 * @param {(event: KeyboardEvent) => void} callback Invoked with the originating `keydown` event
 * @param {OnStartTypingOptions} [options={}] Options
 * @returns {OnStartTypingReturn} A function that detaches the `keydown` listener
 *
 * @example
 * const input = useTemplateRef('input');
 * onStartTyping(() => {
 *   if (document.activeElement !== input.value)
 *     input.value?.focus();
 * });
 *
 * @example
 * // stop listening manually
 * const stop = onStartTyping(() => openSearch());
 * stop();
 *
 * @since 0.0.15
 */
export function onStartTyping(
  callback: (event: KeyboardEvent) => void,
  options: OnStartTypingOptions = {},
): OnStartTypingReturn {
  const {
    document = defaultDocument,
    isTypedCharValid: isTypedCharValidFn = isTypedCharValid,
    isFocusedElementEditable: isFocusedElementEditableFn = isFocusedElementEditable,
  } = options;

  // SSR / no-DOM: nothing to listen to, hand back a no-op stopper.
  if (!document)
    return noop;

  return useEventListener(
    document,
    'keydown',
    (event: KeyboardEvent) => {
      if (!isFocusedElementEditableFn(document) && isTypedCharValidFn(event))
        callback(event);
    },
    { passive: true },
  );
}
