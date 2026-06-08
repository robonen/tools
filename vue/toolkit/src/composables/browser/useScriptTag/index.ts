import { shallowRef, toValue } from 'vue';
import type { MaybeRefOrGetter, ShallowRef } from 'vue';
import { noop } from '@robonen/stdlib';
import { defaultDocument } from '@/types';
import type { ConfigurableDocument } from '@/types';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';
import { useEventListener } from '@/composables/browser/useEventListener';

export type ScriptReferrerPolicy
  = | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url';

export interface UseScriptTagOptions extends ConfigurableDocument {
  /**
   * Load the script immediately on mount.
   *
   * @default true
   */
  immediate?: boolean;

  /**
   * Add the `async` attribute to the script tag.
   *
   * @default true
   */
  async?: boolean;

  /**
   * Script `type` attribute.
   *
   * @default 'text/javascript'
   */
  type?: string;

  /**
   * Take manual control of the timing of loading and unloading. When `true`,
   * the script is neither loaded on mount nor unloaded on scope dispose — call
   * `load()` / `unload()` yourself.
   *
   * @default false
   */
  manual?: boolean;

  /**
   * CORS setting for the script tag.
   */
  crossOrigin?: 'anonymous' | 'use-credentials';

  /**
   * Referrer policy for the script request.
   */
  referrerPolicy?: ScriptReferrerPolicy;

  /**
   * Add the `nomodule` attribute, so the script is skipped by browsers that
   * support ES modules.
   */
  noModule?: boolean;

  /**
   * Add the `defer` attribute to the script tag.
   */
  defer?: boolean;

  /**
   * Nonce value for CSP (Content Security Policy).
   *
   * @default undefined
   */
  nonce?: string;

  /**
   * Custom attributes applied to the script tag via `setAttribute`.
   *
   * @default {}
   */
  attrs?: Record<string, string>;
}

export interface UseScriptTagReturn {
  /**
   * Reactive reference to the underlying `<script>` element, or `null` when not loaded.
   */
  scriptTag: ShallowRef<HTMLScriptElement | null>;

  /**
   * Load the script into the document `<head>`.
   *
   * @param waitForScriptLoad Resolve once the `load` event fires (default `true`)
   * rather than immediately after appending the element to the DOM.
   */
  load: (waitForScriptLoad?: boolean) => Promise<HTMLScriptElement | boolean>;

  /**
   * Remove the `<script>` element from the document `<head>`.
   */
  unload: () => void;
}

/**
 * @name useScriptTag
 * @category Browser
 * @description Dynamically inject and manage a `<script>` tag. The returned
 * `load`/`unload` controls append the element to the document `<head>` (reusing
 * an existing tag with the same `src`) and resolve once the script has loaded.
 * Loading is de-duplicated, listeners are passive, and everything is SSR-safe.
 *
 * @param {MaybeRefOrGetter<string>} src Reactive source URL for the script
 * @param {(el: HTMLScriptElement) => void} [onLoaded=noop] Called when the script finishes loading
 * @param {UseScriptTagOptions} [options={}] Options
 * @param {boolean} [options.immediate=true] Load the script on mount
 * @param {boolean} [options.async=true] Add the `async` attribute
 * @param {string} [options.type='text/javascript'] Script `type` attribute
 * @param {boolean} [options.manual=false] Take manual control of load/unload timing
 * @param {'anonymous' | 'use-credentials'} [options.crossOrigin] CORS setting
 * @param {ScriptReferrerPolicy} [options.referrerPolicy] Referrer policy
 * @param {boolean} [options.noModule] Add the `nomodule` attribute
 * @param {boolean} [options.defer] Add the `defer` attribute
 * @param {string} [options.nonce] CSP nonce value
 * @param {Record<string, string>} [options.attrs={}] Custom attributes for the tag
 * @param {Document} [options.document=defaultDocument] Custom document instance
 * @returns {UseScriptTagReturn} `{ scriptTag, load, unload }`
 *
 * @example
 * const { scriptTag, load, unload } = useScriptTag(
 *   'https://example.com/sdk.js',
 *   (el) => console.log('loaded', el),
 * );
 *
 * @example
 * // Manual control
 * const { load, unload } = useScriptTag('https://example.com/a.js', undefined, { manual: true });
 * await load();
 * unload();
 *
 * @since 0.0.15
 */
export function useScriptTag(
  src: MaybeRefOrGetter<string>,
  onLoaded: (el: HTMLScriptElement) => void = noop,
  options: UseScriptTagOptions = {},
): UseScriptTagReturn {
  const {
    immediate = true,
    manual = false,
    type = 'text/javascript',
    async = true,
    crossOrigin,
    referrerPolicy,
    noModule,
    defer,
    document = defaultDocument,
    attrs = {},
    nonce,
  } = options;

  const scriptTag = shallowRef<HTMLScriptElement | null>(null);

  let _promise: Promise<HTMLScriptElement | boolean> | null = null;

  const loadScript = (waitForScriptLoad: boolean): Promise<HTMLScriptElement | boolean> =>
    new Promise<HTMLScriptElement | boolean>((resolve, reject) => {
      const resolveWithElement = (el: HTMLScriptElement): void => {
        scriptTag.value = el;
        resolve(el);
      };

      // SSR / unsupported: no document to append to.
      if (!document) {
        resolve(false);
        return;
      }

      const url = toValue(src);
      let shouldAppend = false;
      let el = document.querySelector<HTMLScriptElement>(`script[src="${url}"]`);

      if (!el) {
        el = document.createElement('script');
        el.type = type;
        el.async = async;
        el.src = url;

        if (defer) el.defer = defer;
        if (crossOrigin) el.crossOrigin = crossOrigin;
        if (noModule) el.noModule = noModule;
        if (referrerPolicy) el.referrerPolicy = referrerPolicy;
        if (nonce) el.nonce = nonce;

        for (const [name, value] of Object.entries(attrs))
          el.setAttribute(name, value);

        shouldAppend = true;
      }
      else if (el.hasAttribute('data-loaded')) {
        // Already loaded — short-circuit.
        resolveWithElement(el);
        return;
      }

      const listenerOptions = { passive: true } as const;

      useEventListener(el, 'error', event => reject(event), listenerOptions);
      useEventListener(el, 'abort', event => reject(event), listenerOptions);
      useEventListener(el, 'load', () => {
        el!.setAttribute('data-loaded', 'true');
        onLoaded(el!);
        resolveWithElement(el!);
      }, listenerOptions);

      if (shouldAppend)
        el = document.head.appendChild(el);

      if (!waitForScriptLoad)
        resolveWithElement(el);
    });

  const load = (waitForScriptLoad = true): Promise<HTMLScriptElement | boolean> => {
    if (!_promise)
      _promise = loadScript(waitForScriptLoad);

    return _promise;
  };

  const unload = (): void => {
    if (!document) return;

    _promise = null;
    scriptTag.value = null;

    const el = document.querySelector<HTMLScriptElement>(`script[src="${toValue(src)}"]`);
    if (el)
      document.head.removeChild(el);
  };

  if (immediate && !manual)
    tryOnMounted(load);

  if (!manual)
    tryOnScopeDispose(unload);

  return {
    scriptTag,
    load,
    unload,
  };
}
