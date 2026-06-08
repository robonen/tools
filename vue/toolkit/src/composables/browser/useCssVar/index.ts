import { computed, shallowRef, toValue, watch } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, WritableComputedRef } from 'vue';
import type { ConfigurableWindow } from '@/types';
import { defaultWindow } from '@/types';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { unrefElement } from '@/composables/component/unrefElement';
import { useMutationObserver } from '@/composables/elements/useMutationObserver';

export interface UseCssVarOptions extends ConfigurableWindow {
  /**
   * Value used before the variable resolves (and the fallback when the
   * computed value is empty).
   */
  initialValue?: string;
  /**
   * Watch the target with a `MutationObserver` (filtered to `style`/`class`)
   * so the ref reflects external changes to the variable.
   *
   * @default false
   */
  observe?: boolean;
}

export interface UseCssVarReturn extends WritableComputedRef<string | null | undefined> {}

/**
 * @name useCssVar
 * @category Browser
 * @description Read and write a CSS custom property on an element as a reactive ref.
 * Defaults to `document.documentElement`. Set `observe` to react to external
 * changes via a `MutationObserver`.
 *
 * @param {MaybeRefOrGetter<string | null | undefined>} prop The CSS variable name (e.g. `--color`)
 * @param {MaybeComputedElementRef} [target] Element to read/write the variable on (defaults to `documentElement`)
 * @param {UseCssVarOptions} [options={}] `initialValue`, `observe`, and a configurable `window`
 * @returns {UseCssVarReturn} A writable ref; reading returns the current value, writing updates the property
 *
 * @example
 * const color = useCssVar('--color', el);
 * color.value = 'red';
 *
 * @example
 * const theme = useCssVar('--theme', null, { initialValue: 'light', observe: true });
 *
 * @since 0.0.15
 */
export function useCssVar(
  prop: MaybeRefOrGetter<string | null | undefined>,
  target?: MaybeComputedElementRef,
  options: UseCssVarOptions = {},
): UseCssVarReturn {
  const { window = defaultWindow, initialValue, observe = false } = options;

  // Backing store: only mutated on explicit reads / observed changes,
  // so consumers reading `.value` never pay for `getComputedStyle`.
  const store = shallowRef<string | null | undefined>(initialValue);

  const elRef: ComputedRef<HTMLElement | SVGElement | undefined> = computed(
    () => (unrefElement(target) as HTMLElement | SVGElement | undefined) ?? window?.document?.documentElement,
  );

  const read = (): void => {
    const el = elRef.value;
    const key = toValue(prop);

    if (!el || !window || !key)
      return;

    const value = window.getComputedStyle(el).getPropertyValue(key)?.trim();
    store.value = value || store.value || initialValue;
  };

  const write = (value: string | null | undefined): void => {
    const el = elRef.value;
    const key = toValue(prop);

    store.value = value;

    if (!el?.style || !key)
      return;

    if (value === null || value === undefined)
      el.style.removeProperty(key);
    else
      el.style.setProperty(key, value);
  };

  if (observe) {
    useMutationObserver(elRef, read, {
      attributeFilter: ['style', 'class'],
      window,
    });
  }

  // Single watcher: when the element or prop changes, drop the old custom
  // property and re-read the current value.
  watch(
    () => [elRef.value, toValue(prop)] as const,
    ([el, key], old) => {
      const [oldEl, oldKey] = old ?? [];
      if (oldEl?.style && oldKey && (oldEl !== el || oldKey !== key))
        oldEl.style.removeProperty(oldKey);
      read();
    },
    { immediate: true },
  );

  return computed<string | null | undefined>({
    get: () => store.value,
    set: write,
  });
}
