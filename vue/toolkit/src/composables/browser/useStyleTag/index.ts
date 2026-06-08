import { shallowReadonly, shallowRef, toRef, watch } from 'vue';
import type { MaybeRefOrGetter, ShallowRef } from 'vue';
import { defaultDocument } from '@/types';
import type { ConfigurableDocument } from '@/types';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseStyleTagOptions extends ConfigurableDocument {
  /**
   * Media query applied to the `<style>` element (e.g. `'screen and (max-width: 600px)'`).
   */
  media?: string;

  /**
   * Load the style immediately on mount.
   *
   * @default true
   */
  immediate?: boolean;

  /**
   * Take manual control of the timing of loading and unloading. When `true`,
   * the style is neither loaded on mount nor unloaded on scope dispose — call
   * `load()` / `unload()` yourself.
   *
   * @default false
   */
  manual?: boolean;

  /**
   * DOM `id` of the `<style>` tag. Sharing an `id` across instances reuses the
   * same element and reference-counts it.
   *
   * @default auto-incremented (`vuetools_styletag_N`)
   */
  id?: string;

  /**
   * Nonce value for CSP (Content Security Policy).
   *
   * @default undefined
   */
  nonce?: string;
}

export interface UseStyleTagReturn {
  /**
   * DOM `id` of the injected `<style>` tag.
   */
  id: string;

  /**
   * Reactive, writable CSS text content of the tag.
   */
  css: ShallowRef<string>;

  /**
   * Inject the `<style>` tag into `<head>` (or reuse an existing one).
   */
  load: () => void;

  /**
   * Remove the `<style>` tag from `<head>` when no other instance references it.
   */
  unload: () => void;

  /**
   * Whether the tag is currently loaded.
   */
  isLoaded: Readonly<ShallowRef<boolean>>;
}

let _id = 0;
const _refCount = new WeakMap<HTMLStyleElement, number>();

/**
 * @name useStyleTag
 * @category Browser
 * @description Inject a reactive `<style>` tag into the document `<head>`. The
 * CSS is a writable ref — assigning to it updates the live stylesheet. Multiple
 * instances sharing an `id` reuse a single element via reference counting, and
 * everything is SSR-safe.
 *
 * @param {MaybeRefOrGetter<string>} css Reactive CSS source for the tag
 * @param {UseStyleTagOptions} [options={}] Options
 * @param {string} [options.media] Media query applied to the tag
 * @param {boolean} [options.immediate=true] Load the style on mount
 * @param {boolean} [options.manual=false] Take manual control of load/unload timing
 * @param {string} [options.id] DOM id of the tag (default auto-incremented)
 * @param {string} [options.nonce] CSP nonce value
 * @param {Document} [options.document=defaultDocument] Custom document instance
 * @returns {UseStyleTagReturn} `{ id, css, load, unload, isLoaded }`
 *
 * @example
 * const { css, isLoaded } = useStyleTag('body { color: red }');
 * css.value = 'body { color: blue }';
 *
 * @example
 * // Manual control
 * const { load, unload } = useStyleTag('.a { color: red }', { manual: true });
 * load();
 * unload();
 *
 * @since 0.0.15
 */
export function useStyleTag(
  css: MaybeRefOrGetter<string>,
  options: UseStyleTagOptions = {},
): UseStyleTagReturn {
  const {
    document = defaultDocument,
    immediate = true,
    manual = false,
    id = `vuetools_styletag_${++_id}`,
    media,
    nonce,
  } = options;

  const cssRef = toRef(css);
  const isLoaded = shallowRef(false);

  let stop = (): void => {};

  const load = (): void => {
    if (!document) return;

    const el = (document.getElementById(id) ?? document.createElement('style')) as HTMLStyleElement;

    if (!el.isConnected) {
      el.id = id;
      if (nonce) el.nonce = nonce;
      if (media) el.media = media;
      document.head.appendChild(el);
    }

    if (isLoaded.value) return;

    _refCount.set(el, (_refCount.get(el) ?? 0) + 1);

    stop = watch(
      cssRef,
      (value) => {
        el.textContent = value;
      },
      { immediate: true },
    );

    isLoaded.value = true;
  };

  const unload = (): void => {
    if (!document || !isLoaded.value) return;

    stop();
    stop = (): void => {};

    const el = document.getElementById(id) as HTMLStyleElement | null;
    if (el) {
      const count = (_refCount.get(el) ?? 1) - 1;
      if (count <= 0) {
        _refCount.delete(el);
        document.head.removeChild(el);
      }
      else {
        _refCount.set(el, count);
      }
    }

    isLoaded.value = false;
  };

  if (immediate && !manual)
    tryOnMounted(load);

  if (!manual)
    tryOnScopeDispose(unload);

  return {
    id,
    css: cssRef,
    load,
    unload,
    isLoaded: shallowReadonly(isLoaded),
  };
}
