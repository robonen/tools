import { watch } from 'vue';
import { noop } from '@robonen/stdlib';
import type { VoidFunction } from '@robonen/stdlib';
import type { ConfigurableDocument, ConfigurableFlush, ConfigurableWindow } from '@/types';
import { defaultWindow } from '@/types';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { unrefElement } from '@/composables/component/unrefElement';
import { useMutationObserver } from '@/composables/elements/useMutationObserver';

export interface OnElementRemovalOptions extends ConfigurableWindow, ConfigurableDocument, ConfigurableFlush {}

export type OnElementRemovalCallback = (mutationRecords: MutationRecord[]) => void;

export type OnElementRemovalReturn = VoidFunction;

/**
 * @name onElementRemoval
 * @category Elements
 * @description Fire a callback when the target element — or any ancestor containing it — is
 * removed from the DOM. Backed by a single `childList`/`subtree` `MutationObserver` on the
 * element's owning document, so it also catches removal of a parent further up the tree.
 *
 * @param {MaybeComputedElementRef} target Element (or ref/getter) to watch for removal
 * @param {OnElementRemovalCallback} callback Invoked with the mutation records that removed the element
 * @param {OnElementRemovalOptions} [options={}] `window`, `document`, and watcher `flush` timing
 * @returns {OnElementRemovalReturn} Stop handle that tears down the watcher and observer
 *
 * @example
 * const el = useTemplateRef<HTMLElement>('el');
 * onElementRemoval(el, () => console.log('gone'));
 *
 * @example
 * const stop = onElementRemoval(el, (records) => report(records), { flush: 'post' });
 *
 * @since 0.0.15
 */
export function onElementRemoval(
  target: MaybeComputedElementRef,
  callback: OnElementRemovalCallback,
  options: OnElementRemovalOptions = {},
): OnElementRemovalReturn {
  const {
    window = defaultWindow,
    document = window?.document,
    flush = 'sync',
  } = options;

  // SSR
  if (!window || !document)
    return noop;

  let stopObserver: VoidFunction | undefined;

  const disconnect = () => {
    stopObserver?.();
    stopObserver = undefined;
  };

  const stopWatch = watch(
    () => unrefElement(target),
    (el) => {
      disconnect();

      if (!el)
        return;

      // Observe the element's owning document so removal of any ancestor is caught,
      // and so the correct root is used for elements inside iframes / shadow trees.
      const root = el.ownerDocument ?? document;

      const { stop } = useMutationObserver(
        root.documentElement ?? (root as unknown as Element),
        (mutationRecords) => {
          const removed = mutationRecords.some(record =>
            Array.prototype.some.call(record.removedNodes, (node: Node) => node === el || node.contains(el)),
          );

          if (removed)
            callback(mutationRecords);
        },
        {
          window,
          childList: true,
          subtree: true,
        },
      );

      stopObserver = stop;
    },
    { immediate: true, flush },
  );

  const stop: VoidFunction = () => {
    stopWatch();
    disconnect();
  };

  return stop;
}
