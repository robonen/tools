import type { MaybeRef, MultiWatchSources, Ref, WatchSource } from 'vue';
import { nextTick, toRef, toValue, watch } from 'vue';
import type { VoidFunction } from '@robonen/stdlib';
import { noop } from '@robonen/stdlib';
import type { ConfigurableWindow } from '@/types';
import { defaultWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useResizeObserver } from '@/composables/elements/useResizeObserver';

export interface UseTextareaAutosizeOptions extends ConfigurableWindow {
  /**
   * The textarea element to autosize. May also be bound via the returned `textarea` ref
   */
  element?: MaybeRef<HTMLTextAreaElement | undefined | null>;

  /**
   * The textarea content. May also be bound via the returned `input` ref
   */
  input?: MaybeRef<string>;

  /**
   * Cap the resulting height (in pixels). Beyond this the textarea scrolls
   */
  maxHeight?: number;

  /**
   * Additional reactive sources that should trigger a resize when they change
   */
  watch?: WatchSource | MultiWatchSources;

  /**
   * Invoked after each resize once the textarea height settles
   *
   * @default noop
   */
  onResize?: VoidFunction;

  /**
   * Apply the computed height to this element instead of the textarea itself.
   * Useful when the textarea is wrapped (e.g. for a CSS grid auto-grow trick)
   */
  styleTarget?: MaybeRef<HTMLElement | undefined | null>;

  /**
   * Which style property carries the computed height
   *
   * @default 'height'
   */
  styleProp?: 'height' | 'minHeight';
}

export interface UseTextareaAutosizeReturn {
  /**
   * The textarea element being autosized. Bind it with `ref` in the template
   */
  textarea: Ref<HTMLTextAreaElement | undefined | null>;

  /**
   * Two-way bound textarea content
   */
  input: Ref<string>;

  /**
   * Force a resize on demand (e.g. after a programmatic value change)
   */
  triggerResize: VoidFunction;
}

/**
 * @name useTextareaAutosize
 * @category Browser
 * @description Auto-resizes a `<textarea>` to fit its content. Reacts to user
 * input, programmatic content changes, and element resize. Reuses
 * `useEventListener` for a passive, auto-cleaned `input` listener and
 * `useResizeObserver` to re-measure when the textarea's width changes (so
 * reflowed text is re-fitted). SSR safe.
 *
 * @param {UseTextareaAutosizeOptions} [options={}] Options
 * @returns {UseTextareaAutosizeReturn} `textarea`, `input`, and `triggerResize`
 *
 * @example
 * const { textarea, input } = useTextareaAutosize();
 * // <textarea ref="textarea" v-model="input" />
 *
 * @example
 * const { textarea, input, triggerResize } = useTextareaAutosize({ maxHeight: 320 });
 *
 * @since 0.0.15
 */
export function useTextareaAutosize(options: UseTextareaAutosizeOptions = {}): UseTextareaAutosizeReturn {
  const {
    window = defaultWindow,
    maxHeight,
    styleProp = 'height',
    onResize = noop,
  } = options;

  const textarea = toRef(options.element) as Ref<HTMLTextAreaElement | undefined | null>;
  const input = toRef(options.input ?? '') as Ref<string>;

  // Cached, non-reactive — only used to skip redundant resizes on height-only
  // ResizeObserver callbacks (we resize on width changes, not our own height edits)
  let lastWidth = -1;
  let lastScrollHeight = -1;

  const triggerResize: VoidFunction = () => {
    const el = textarea.value;

    if (!el)
      return;

    const target = (toValue(options.styleTarget) ?? el) as HTMLElement;

    // Collapse to a single line so scrollHeight reports the true content height
    el.style[styleProp] = '1px';

    const scrollHeight = el.scrollHeight;
    const height = maxHeight !== undefined ? Math.min(scrollHeight, maxHeight) : scrollHeight;

    if (target === el)
      el.style[styleProp] = `${height}px`;
    else {
      // Restore the textarea to its natural value and size the wrapper instead
      el.style[styleProp] = '';
      target.style[styleProp] = `${height}px`;
    }

    if (scrollHeight !== lastScrollHeight) {
      lastScrollHeight = scrollHeight;
      onResize();
    }
  };

  // React to programmatic content changes and to the element binding itself.
  // flush 'post' guarantees the DOM (and v-model'd value) is updated before we measure
  watch(
    [input, textarea],
    () => nextTick(triggerResize),
    { immediate: true, flush: 'post' },
  );

  // React to direct user typing without waiting for the bound model to round-trip.
  // Passive: we never call preventDefault here
  useEventListener(textarea, 'input', triggerResize, { passive: true });

  // React to width changes (font/box reflow). Ignore pure height deltas — those
  // are usually our own edits and would otherwise loop
  useResizeObserver(textarea, (entries) => {
    const entry = entries[0];

    if (!entry)
      return;

    const width = entry.contentRect.width;

    if (width === lastWidth)
      return;

    const run = () => {
      lastWidth = width;
      triggerResize();
    };

    if (window && typeof window.requestAnimationFrame === 'function')
      window.requestAnimationFrame(run);
    else
      run();
  });

  if (options.watch)
    watch(options.watch, triggerResize, { immediate: true, deep: true });

  return {
    textarea,
    input,
    triggerResize,
  };
}
