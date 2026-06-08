import { computed, ref, toValue, watch } from 'vue';
import type { ComputedRef, MaybeRef, MaybeRefOrGetter, Ref } from 'vue';
import { isFunction, isString } from '@robonen/stdlib';
import { defaultDocument } from '@/types';
import type { ConfigurableDocument } from '@/types';
import { useMutationObserver } from '@/composables/elements/useMutationObserver';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseTitleOptionsBase extends ConfigurableDocument {
  /**
   * Observe the `<title>` element for external changes and sync them back to the ref.
   * Ignored when `titleTemplate` is provided, to avoid a write/observe feedback loop.
   *
   * @default false
   */
  observe?: boolean;

  /**
   * Template used to format the title. Every `%s` is replaced with the value.
   *
   * @default '%s'
   */
  titleTemplate?: MaybeRef<string> | ((title: string) => string);

  /**
   * Restore the original document title when the active scope is disposed.
   * Pass a function to compute the title to restore, or `false` to keep the
   * last value in place.
   *
   * @default false
   */
  restoreOnUnmount?: false | ((originalTitle: string, currentTitle: string) => string | null | undefined);
}

export type UseTitleOptions = UseTitleOptionsBase;

export type UseTitleReturn = Ref<string | null | undefined> | ComputedRef<string | null | undefined>;

/**
 * @name useTitle
 * @category Browser
 * @description Reactive `document.title`. Pass a getter to derive the title from
 * other reactive state (returns a read-only ref), or a plain value/ref for two-way binding.
 *
 * @param {MaybeRefOrGetter<string | null | undefined>} [newTitle] Initial title (getter source returns a read-only ref)
 * @param {UseTitleOptions} [options={}] Options
 * @returns {UseTitleReturn} A ref bound to the document title (read-only when a getter source is passed)
 *
 * @example
 * const title = useTitle();
 * title.value = 'New title';
 *
 * @example
 * useTitle('Dashboard', { titleTemplate: '%s | My App' });
 *
 * @example
 * // Derive from reactive state (read-only result)
 * useTitle(() => `Inbox (${count.value})`);
 *
 * @example
 * // Restore the previous title when the component unmounts
 * useTitle('Checkout', { restoreOnUnmount: (original) => original });
 *
 * @since 0.0.15
 */
export function useTitle(
  newTitle: () => string | null | undefined,
  options?: UseTitleOptions,
): ComputedRef<string | null | undefined>;
export function useTitle(
  newTitle?: MaybeRef<string | null | undefined>,
  options?: UseTitleOptions,
): Ref<string | null | undefined>;
export function useTitle(
  newTitle: MaybeRefOrGetter<string | null | undefined> = null,
  options: UseTitleOptions = {},
): UseTitleReturn {
  const {
    document = defaultDocument,
    observe = false,
    titleTemplate = '%s',
    restoreOnUnmount = false,
  } = options;

  const originalTitle = document?.title ?? '';
  const hasTemplate = 'titleTemplate' in options;

  const isReadonly = isFunction(newTitle);

  const title = ref<string | null | undefined>(toValue(newTitle) ?? document?.title ?? null);

  const format = (value: string): string => {
    if (!hasTemplate)
      return value;

    return isFunction(titleTemplate)
      ? titleTemplate(value)
      : toValue(titleTemplate).split('%s').join(value);
  };

  watch(
    title,
    (value, oldValue) => {
      if (value !== oldValue && document)
        document.title = format(isString(value) ? value : '');
    },
    { immediate: true },
  );

  // Keep a read-only ref in sync when the getter source changes
  if (isReadonly) {
    watch(
      () => toValue(newTitle),
      (value) => {
        title.value = value;
      },
    );
  }

  // Observing only makes sense without a template, otherwise the formatted
  // write would feed back through the observer.
  if (observe && !hasTemplate && document && !isReadonly) {
    useMutationObserver(
      document.head?.querySelector('title'),
      () => {
        if (document && document.title !== title.value)
          title.value = document.title;
      },
      { childList: true },
    );
  }

  if (restoreOnUnmount) {
    tryOnScopeDispose(() => {
      const restored = restoreOnUnmount(originalTitle, isString(title.value) ? title.value : '');
      if (restored !== null && restored !== undefined && document)
        document.title = restored;
    });
  }

  if (isReadonly)
    return computed(() => title.value);

  return title;
}
