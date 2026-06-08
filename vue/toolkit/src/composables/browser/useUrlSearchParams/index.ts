import { nextTick, reactive } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { watchPausable } from '@/composables/watch/watchPausable';

export type UrlSearchParamsMode = 'history' | 'hash' | 'hash-params';

export type UrlParams = Record<string, string[] | string>;

export interface UseUrlSearchParamsOptions<T> extends ConfigurableWindow {
  /**
   * Remove keys whose value is `null` or `undefined` from the URL.
   *
   * @default true
   */
  removeNullishValues?: boolean;

  /**
   * Remove keys whose value is falsy (`''`, `0`, `false`, `null`, `undefined`) from the URL.
   *
   * @default false
   */
  removeFalsyValues?: boolean;

  /**
   * Seed values applied when the URL has no params on initialization.
   *
   * @default {}
   */
  initialValue?: T;

  /**
   * Write changes back to the URL when the reactive state mutates.
   *
   * @default true
   */
  write?: boolean;

  /**
   * History method used when writing back to the URL.
   * - `replace` rewrites the current entry via `history.replaceState`
   * - `push` adds a new entry via `history.pushState`
   *
   * @default 'replace'
   */
  writeMode?: 'replace' | 'push';

  /**
   * Serialize the params into a query string. Override to control ordering or encoding.
   *
   * @default (params) => params.toString()
   */
  stringify?: (params: URLSearchParams) => string;
}

export type UseUrlSearchParamsReturn<T extends Record<string, any> = UrlParams>
  = T;

/**
 * @name useUrlSearchParams
 * @category Browser
 * @description Reactive `URLSearchParams` exposed as a plain reactive object. Reads from and
 * (optionally) writes back to the URL using the `history`, `hash`, or `hash-params` location source.
 * Listens for `popstate`/`hashchange` with passive listeners and pauses its own writer while syncing
 * to avoid feedback loops. SSR-safe: returns the seeded reactive object when no `window` is available.
 *
 * @param {UrlSearchParamsMode} [mode='history'] Where the params live: `history` (`?a=1`), `hash` (`#/path?a=1`), or `hash-params` (`#a=1`)
 * @param {UseUrlSearchParamsOptions<T>} [options={}] Behavior options
 * @returns {UseUrlSearchParamsReturn<T>} A reactive object mirroring the URL params; mutate it to update the URL
 *
 * @example
 * const params = useUrlSearchParams('history');
 * params.foo = 'bar'; // -> ?foo=bar
 *
 * @example
 * // Hash mode with seeded values and push-history writes
 * const params = useUrlSearchParams('hash', {
 *   initialValue: { tab: 'home' },
 *   writeMode: 'push',
 * });
 *
 * @example
 * // Repeated keys decode to arrays
 * const params = useUrlSearchParams<{ ids: string[] }>('history');
 * params.ids = ['1', '2']; // -> ?ids=1&ids=2
 *
 * @since 0.0.15
 */
export function useUrlSearchParams<T extends Record<string, any> = UrlParams>(
  mode: UrlSearchParamsMode = 'history',
  options: UseUrlSearchParamsOptions<T> = {},
): UseUrlSearchParamsReturn<T> {
  const {
    initialValue = {} as T,
    removeNullishValues = true,
    removeFalsyValues = false,
    write: enableWrite = true,
    writeMode = 'replace',
    window = defaultWindow,
    stringify = (params: URLSearchParams) => params.toString(),
  } = options;

  if (!window)
    return reactive({ ...initialValue }) as UseUrlSearchParamsReturn<T>;

  const state = reactive<Record<string, any>>({});

  const getRawParams = (): string => {
    if (mode === 'history')
      return window.location.search || '';

    if (mode === 'hash') {
      const hash = window.location.hash || '';
      const index = hash.indexOf('?');
      return index > 0 ? hash.slice(index) : '';
    }

    return (window.location.hash || '').replace(/^#/, '');
  };

  const constructQuery = (params: URLSearchParams): string => {
    const stringified = stringify(params);

    if (mode === 'history')
      return `${stringified ? `?${stringified}` : ''}${window.location.hash || ''}`;

    if (mode === 'hash-params')
      return `${window.location.search || ''}${stringified ? `#${stringified}` : ''}`;

    const hash = window.location.hash || '#';
    const index = hash.indexOf('?');
    if (index > 0)
      return `${window.location.search || ''}${hash.slice(0, index)}${stringified ? `?${stringified}` : ''}`;

    return `${window.location.search || ''}${hash}${stringified ? `?${stringified}` : ''}`;
  };

  const read = (): URLSearchParams => new URLSearchParams(getRawParams());

  const updateState = (params: URLSearchParams): void => {
    const unusedKeys = new Set(Object.keys(state));
    for (const key of params.keys()) {
      const valuesForKey = params.getAll(key);
      state[key] = valuesForKey.length > 1 ? valuesForKey : (params.get(key) || '');
      unusedKeys.delete(key);
    }
    for (const key of unusedKeys)
      delete state[key];
  };

  const serializeState = (): URLSearchParams => {
    const params = new URLSearchParams('');
    for (const key of Object.keys(state)) {
      const value = state[key];
      if (Array.isArray(value))
        value.forEach(item => params.append(key, item));
      else if (removeNullishValues && (value === null || value === undefined))
        params.delete(key);
      else if (removeFalsyValues && !value)
        params.delete(key);
      else
        params.set(key, value);
    }
    return params;
  };

  const write = (params: URLSearchParams, shouldUpdateState: boolean, shouldWriteHistory = true): void => {
    pause();

    if (shouldUpdateState)
      updateState(params);

    const url = window.location.pathname + constructQuery(params);

    if (writeMode === 'replace')
      window.history.replaceState(window.history.state, window.document.title, url);
    else if (shouldWriteHistory)
      window.history.pushState(window.history.state, window.document.title, url);

    nextTick(() => resume());
  };

  const { pause, resume } = watchPausable(
    state,
    () => write(serializeState(), false),
    { deep: true, initialState: 'paused' },
  );

  const onChanged = (): void => {
    if (!enableWrite)
      return;

    write(read(), true, false);
  };

  const listenerOptions = { passive: true };

  useEventListener(window, 'popstate', onChanged, listenerOptions);
  if (mode !== 'history')
    useEventListener(window, 'hashchange', onChanged, listenerOptions);

  const initial = read();
  if (!initial.keys().next().done)
    updateState(initial);
  else
    Object.assign(state, initialValue);

  resume();

  return state as UseUrlSearchParamsReturn<T>;
}
