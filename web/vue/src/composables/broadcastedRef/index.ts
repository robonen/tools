import { customRef, onScopeDispose } from 'vue';

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