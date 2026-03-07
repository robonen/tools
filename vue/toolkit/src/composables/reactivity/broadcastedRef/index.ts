import { customRef, ref } from 'vue';
import type { Ref } from 'vue';
import { defaultWindow } from '@/types';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface BroadcastedRefOptions {
  /**
   * Immediately broadcast the initial value to other tabs on creation
   * @default false
   */
  immediate?: boolean;
}

/**
 * @name broadcastedRef
 * @category Reactivity
 * @description Creates a custom ref that syncs its value across browser tabs via the BroadcastChannel API
 *
 * @param {string} key The channel key to use for broadcasting
 * @param {T} initialValue The initial value of the ref
 * @param {BroadcastedRefOptions} [options={}] Options
 * @returns {Ref<T>} A custom ref that broadcasts value changes across tabs
 *
 * @example
 * const count = broadcastedRef('counter', 0);
 *
 * @example
 * const state = broadcastedRef('payment-status', { status: 'pending' });
 *
 * @since 0.0.13
 */
export function broadcastedRef<T>(key: string, initialValue: T, options: BroadcastedRefOptions = {}): Ref<T> {
  const { immediate = false } = options;

  if (!defaultWindow || typeof BroadcastChannel === 'undefined') {
    return ref(initialValue) as Ref<T>;
  }

  const channel = new BroadcastChannel(key);
  let value = initialValue;

  const data = customRef<T>((track, trigger) => {
    channel.onmessage = (event: MessageEvent<T>) => {
      value = event.data;
      trigger();
    };

    return {
      get() {
        track();
        return value;
      },
      set(newValue: T) {
        value = newValue;
        channel.postMessage(newValue);
        trigger();
      },
    };
  });

  if (immediate) {
    channel.postMessage(initialValue);
  }

  tryOnScopeDispose(() => channel.close());

  return data;
}
