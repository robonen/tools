import { customRef, onScopeDispose } from 'vue';

/**
 * @name broadcastedRef
 * @category Reactivity
 * @description Creates a custom ref that syncs its value across browser tabs via the BroadcastChannel API
 *
 * @param {string} key The channel key to use for broadcasting
 * @param {T} initialValue The initial value of the ref
 * @returns {Ref<T>} A custom ref that broadcasts value changes across tabs
 *
 * @example
 * const count = broadcastedRef('counter', 0);
 *
 * @since 0.0.1
 */
export function broadcastedRef<T>(key: string, initialValue: T) {
  const channel = new BroadcastChannel(key);

  onScopeDispose(channel.close);

  return customRef<T>((track, trigger) => {
    channel.onmessage = (event) => {
      track();
      return event.data;
    };

    channel.postMessage(initialValue);

    return {
      get() {
        return initialValue;
      },
      set(newValue: T) {
        initialValue = newValue;
        channel.postMessage(newValue);
        trigger();
      },
    };
  });
}