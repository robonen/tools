import { shallowRef } from 'vue';
import type { ShallowRef } from 'vue';
import { isFunction } from '@robonen/stdlib';
import { defaultDocument } from '@/types';
import type { ConfigurableDocument } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import type { DocumentEventName } from '@/composables/browser/useEventListener';

export type KeyModifier
  = | 'Alt'
    | 'AltGraph'
    | 'CapsLock'
    | 'Control'
    | 'Fn'
    | 'FnLock'
    | 'Meta'
    | 'NumLock'
    | 'ScrollLock'
    | 'Shift'
    | 'Symbol'
    | 'SymbolLock';

const DEFAULT_EVENTS: DocumentEventName[] = ['mousedown', 'mouseup', 'keydown', 'keyup'];

export interface UseKeyModifierOptions<Initial> extends ConfigurableDocument {
  /**
   * Event names that will prompt an update to the modifier state.
   *
   * @default ['mousedown', 'mouseup', 'keydown', 'keyup']
   */
  events?: DocumentEventName[];

  /**
   * Initial value of the returned ref.
   *
   * @default null
   */
  initial?: Initial;
}

export type UseKeyModifierReturn<Initial> = ShallowRef<Initial extends boolean ? boolean : boolean | null>;

/**
 * @name useKeyModifier
 * @category Browser
 * @description Reactive state of a keyboard modifier (CapsLock, NumLock, Shift, Control, Alt, Meta, ...) tracked via `KeyboardEvent.getModifierState`.
 *
 * @param {KeyModifier} modifier The modifier key to observe
 * @param {UseKeyModifierOptions} [options={}] Options (`events` to listen on, `initial` value, custom `document`)
 * @returns {UseKeyModifierReturn} A shallow ref holding the current modifier state (`null` until the first matching event)
 *
 * @example
 * const capsLock = useKeyModifier('CapsLock');
 * watch(capsLock, (on) => {
 *   if (on) showCapsLockWarning();
 * });
 *
 * @example
 * const shift = useKeyModifier('Shift', { initial: false, events: ['keydown', 'keyup'] });
 *
 * @since 0.0.15
 */
export function useKeyModifier<Initial extends boolean | null = null>(
  modifier: KeyModifier,
  options: UseKeyModifierOptions<Initial> = {},
): UseKeyModifierReturn<Initial> {
  const {
    events = DEFAULT_EVENTS,
    document = defaultDocument,
    initial = null,
  } = options;

  const state = shallowRef(initial) as ShallowRef<boolean | null>;

  if (document) {
    useEventListener(document, events, (event: KeyboardEvent | MouseEvent) => {
      if (isFunction(event.getModifierState))
        state.value = event.getModifierState(modifier);
    }, { passive: true });
  }

  return state as UseKeyModifierReturn<Initial>;
}
