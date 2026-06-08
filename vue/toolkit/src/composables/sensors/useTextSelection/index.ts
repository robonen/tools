import type { ComputedRef, ShallowRef } from 'vue';
import { computed, shallowRef } from 'vue';
import type { ConfigurableDocument, ConfigurableWindow } from '@/types';
import { defaultWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';

export interface UseTextSelectionOptions extends ConfigurableWindow, ConfigurableDocument {}

export interface UseTextSelectionReturn {
  /**
   * The selected text, equivalent to `Selection.toString()`.
   */
  text: ComputedRef<string>;
  /**
   * Bounding rectangles for every range in the current selection.
   */
  rects: ComputedRef<DOMRect[]>;
  /**
   * The `Range` objects that make up the current selection.
   */
  ranges: ComputedRef<Range[]>;
  /**
   * The raw `Selection` object, or `null` when nothing is selected / unsupported.
   */
  selection: ShallowRef<Selection | null>;
}

function getRangesFromSelection(selection: Selection): Range[] {
  const rangeCount = selection.rangeCount ?? 0;
  const ranges: Range[] = [];

  for (let i = 0; i < rangeCount; i++)
    ranges.push(selection.getRangeAt(i));

  return ranges;
}

/**
 * @name useTextSelection
 * @category Sensors
 * @description Reactively track the user's text selection via `Window.getSelection`.
 *
 * @param {UseTextSelectionOptions} [options={}] Options (custom `window`, `document`)
 * @returns {UseTextSelectionReturn} Reactive `text`, `rects`, `ranges`, and the raw `selection`
 *
 * @example
 * const { text, rects, ranges, selection } = useTextSelection();
 * watch(text, (value) => console.log('selected:', value));
 *
 * @since 0.0.15
 */
export function useTextSelection(
  options: UseTextSelectionOptions = {},
): UseTextSelectionReturn {
  const { window = defaultWindow } = options;
  const document = options.document ?? window?.document;

  const selection = shallowRef<Selection | null>(window?.getSelection() ?? null);
  const text = computed<string>(() => selection.value?.toString() ?? '');
  const ranges = computed<Range[]>(() => (selection.value ? getRangesFromSelection(selection.value) : []));
  const rects = computed<DOMRect[]>(() => ranges.value.map(range => range.getBoundingClientRect()));

  const onSelectionChange = (): void => {
    // Reassign through `null` so the shallowRef sees a new identity even when the
    // browser mutates and reuses the same live `Selection` object in place.
    selection.value = null;

    if (window)
      selection.value = window.getSelection();
  };

  if (document)
    useEventListener(document, 'selectionchange', onSelectionChange, { passive: true });

  return {
    text,
    rects,
    ranges,
    selection,
  };
}
