import { computed, nextTick, ref, shallowRef, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref, ShallowRef, UnwrapRef } from 'vue';
import { SyncMutex, isFunction } from '@robonen/stdlib';
import type { ConfigurableFlush, ConfigurableWindow } from '@/types';
import { defaultWindow } from '@/types';
import type { ConfigurableEventFilter, EventFilter } from '@/utils/filters';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';
import { useEventListener } from '@/composables/browser/useEventListener';
import { customStorageEventName, guessSerializer, shallowMerge } from '../useStorage';
import type { StorageEventLike } from '../useStorage';

export interface StorageSerializerAsync<T> {
  read: (raw: string) => T | Promise<T>;
  write: (value: T) => string | Promise<string>;
}

export interface StorageLikeAsync {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

export interface UseStorageAsyncOptions<T, Shallow extends boolean = true> extends ConfigurableFlush, ConfigurableWindow, ConfigurableEventFilter {
  /**
   * Use shallowRef instead of ref for the internal state
   * @default true
   */
  shallow?: Shallow;
  /**
   * Watch for deep changes
   * @default true
   */
  deep?: boolean;
  /**
   * Listen to storage changes from other tabs/windows
   * @default true
   */
  listenToStorageChanges?: boolean;
  /**
   * Write the default value to the storage when it does not exist
   * @default true
   */
  writeDefaults?: boolean;
  /**
   * Custom serializer for reading/writing storage values
   */
  serializer?: StorageSerializerAsync<T>;
  /**
   * Merge the default value with the stored value
   * @default false
   */
  mergeDefaults?: boolean | ((stored: T, defaults: T) => T);
  /**
   * Called once when the initial value has been loaded from storage
   */
  onReady?: (value: T) => void;
  /**
   * Error handler for read/write failures
   */
  onError?: (error: unknown) => void;
  /**
   * Wait for the component to be mounted before reading the storage
   *
   * Useful for SSR hydration to prevent mismatch
   * @default false
   */
  initOnMounted?: boolean;
}

export interface UseStorageAsyncReturnBase<T, Shallow extends boolean> {
  state: Shallow extends true ? ShallowRef<T> : Ref<UnwrapRef<T>>;
  isReady: Ref<boolean>;
}

export type UseStorageAsyncReturn<T, Shallow extends boolean>
  = & UseStorageAsyncReturnBase<T, Shallow>
    & PromiseLike<UseStorageAsyncReturnBase<T, Shallow>>;

/**
 * @name useStorageAsync
 * @category Storage
 * @description Reactive Storage binding with async support — creates a ref synced with an async storage backend
 *
 * @param {MaybeRefOrGetter<string>} key The storage key (can be reactive)
 * @param {MaybeRefOrGetter<T>} initialValue The initial/default value
 * @param {StorageLikeAsync} storage The async storage backend
 * @param {UseStorageAsyncOptions<T>} [options={}] Options
 * @returns {UseStorageAsyncReturn<T, Shallow>} An object with state ref and isReady flag, also awaitable
 *
 * @example
 * const { state } = useStorageAsync('access-token', '', asyncStorage);
 *
 * @example
 * const { state, isReady } = await useStorageAsync('settings', { theme: 'dark' }, asyncStorage);
 *
 * @example
 * const { state } = useStorageAsync('key', 'default', asyncStorage, {
 *   onReady: (value) => console.log('Loaded:', value),
 * });
 *
 * @since 0.0.12
 */
export function useStorageAsync<T extends string, Shallow extends boolean = true>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, storage: StorageLikeAsync, options?: UseStorageAsyncOptions<T, Shallow>): UseStorageAsyncReturn<T, Shallow>;
export function useStorageAsync<T extends number, Shallow extends boolean = true>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, storage: StorageLikeAsync, options?: UseStorageAsyncOptions<T, Shallow>): UseStorageAsyncReturn<T, Shallow>;
export function useStorageAsync<T extends boolean, Shallow extends boolean = true>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, storage: StorageLikeAsync, options?: UseStorageAsyncOptions<T, Shallow>): UseStorageAsyncReturn<T, Shallow>;
export function useStorageAsync<T, Shallow extends boolean = true>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, storage: StorageLikeAsync, options?: UseStorageAsyncOptions<T, Shallow>): UseStorageAsyncReturn<T, Shallow>;
export function useStorageAsync<T = unknown, Shallow extends boolean = true>(key: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<null>, storage: StorageLikeAsync, options?: UseStorageAsyncOptions<T, Shallow>): UseStorageAsyncReturn<T, Shallow>;
export function useStorageAsync<T, Shallow extends boolean = true>(
  key: MaybeRefOrGetter<string>,
  initialValue: MaybeRefOrGetter<T>,
  storage: StorageLikeAsync,
  options: UseStorageAsyncOptions<T, Shallow> = {},
): UseStorageAsyncReturn<T, Shallow> {
  const {
    shallow = true,
    deep = true,
    flush = 'pre',
    writeDefaults = true,
    mergeDefaults = false,
    listenToStorageChanges = true,
    window = defaultWindow,
    eventFilter,
    initOnMounted = false,
    onReady,
    onError = console.error, // eslint-disable-line no-console
  } = options;

  const defaults = toValue(initialValue);
  const serializer = options.serializer ?? guessSerializer(defaults);

  const state = (shallow ? shallowRef : ref)(defaults) as Shallow extends true ? ShallowRef<T> : Ref<UnwrapRef<T>>;
  const isReady = ref(false);
  const keyComputed = computed<string>(() => toValue(key));

  async function read(event?: StorageEventLike): Promise<T> {
    try {
      const rawValue = event
        ? event.newValue
        : await storage.getItem(keyComputed.value);

      if (rawValue === undefined || rawValue === null) {
        if (writeDefaults && defaults !== undefined && defaults !== null) {
          // Through the FIFO queue so the write is ordered with user writes
          // and dispatches a change event like any other write; awaited so
          // the defaults are persisted by the time the composable is ready.
          queueWrite(defaults, true);
          await writeQueue;
        }

        return defaults;
      }

      if (!event && mergeDefaults) {
        const value: T = await serializer.read(rawValue) as T;

        return isFunction(mergeDefaults)
          ? mergeDefaults(value, defaults)
          : shallowMerge(value, defaults);
      }

      return await serializer.read(rawValue) as T;
    }
    catch (e) {
      onError(e);
      return defaults;
    }
  }

  // Reentrancy guard: dispatchEvent runs same-tab listeners synchronously, so
  // while it is on the stack the only incoming event is this instance's own —
  // which must be ignored. During rapid queued writes the state may already
  // hold a newer value, and consuming the own (stale) event would clobber it
  // and ping-pong with the write queue.
  let dispatchingWriteEvent = false;

  function dispatchWriteEvent(key: string, oldValue: string | null, newValue: string | null) {
    if (!window)
      return;

    const payload = {
      key,
      oldValue,
      newValue,
      storageArea: storage as Storage,
    };

    dispatchingWriteEvent = true;

    try {
      // Use native StorageEvent for built-in Storage, CustomEvent for custom backends
      window.dispatchEvent(
        storage instanceof Storage
          ? new StorageEvent('storage', payload)
          : new CustomEvent<StorageEventLike>(customStorageEventName, { detail: payload }),
      );
    }
    finally {
      dispatchingWriteEvent = false;
    }
  }

  async function write(value: T, key: string, onlyIfAbsent = false) {
    try {
      const oldValue = await storage.getItem(key) ?? null;

      // A defaults write re-checks at execution time: another instance may
      // have persisted a value since this was enqueued, and writing the
      // defaults over it would stomp that newer value.
      if (onlyIfAbsent && oldValue !== null) {
        needsReconcile = true;
        return;
      }

      if (value === undefined || value === null) {
        await storage.removeItem(key);
        dispatchWriteEvent(key, oldValue, null);
      }
      else {
        const serialized = await serializer.write(value);

        if (oldValue !== serialized) {
          await storage.setItem(key, serialized);
          dispatchWriteEvent(key, oldValue, serialized);
        }
      }
    }
    catch (e) {
      onError(e);
    }
  }

  // Bumped on every reactive key switch: in-flight writes finish against
  // their snapshotted key without touching the new key's state.
  let keyEpoch = 0;

  // The key writes target. Updated ONLY by the key watcher — by watcher flush
  // time the keyComputed already reflects a same-tick key change, so a write
  // enqueued in that flush would otherwise land on the new key.
  let currentKey = keyComputed.value;

  // Writes still queued or in flight. Foreign events arriving while > 0 are
  // ordering-ambiguous and deferred to a reconciling re-read after the drain.
  let pendingWrites = 0;
  let needsReconcile = false;

  // Bumped when an external event lands in the state — an async snapshot
  // read (init, key switch, reconcile) that started earlier compares stamps
  // so it never clobbers the newer value
  let changeStamp = 0;

  // FIFO write queue: keeps rapid writes ordered when the backend resolves
  // them out of order, and keeps dispatched event payloads in commit order.
  let writeQueue: Promise<void> = Promise.resolve();

  function queueWrite(value: T, onlyIfAbsent = false) {
    // Snapshot the target: a write enqueued before a key switch must land on
    // the key it was meant for, never on the new one.
    const target = currentKey;

    pendingWrites++;

    writeQueue = writeQueue
      .then(() => write(value, target, onlyIfAbsent))
      .then(() => {
        pendingWrites--;
        maybeReconcile();
      });
  }

  // Resolve a change deferred by in-flight writes: re-read the source of
  // truth once instead of trusting possibly-reordered events.
  function maybeReconcile() {
    if (pendingWrites > 0 || !needsReconcile)
      return;

    needsReconcile = false;

    const epoch = keyEpoch;
    const stamp = changeStamp;

    read().then((value) => {
      // A key switch or a newer external event supersedes this snapshot
      if (epoch !== keyEpoch || stamp !== changeStamp)
        return;

      lockWritesUntilFlush();
      (state as Ref).value = value;
    });
  }

  // Apply event filter if provided
  const writeWithFilter: (value: T) => void = eventFilter
    ? (value: T) => (eventFilter as EventFilter)(() => queueWrite(value))
    : queueWrite;

  // Write-lock prevents the state watcher from writing the just-read value
  // back to storage when state is updated programmatically (key changes,
  // cross-instance events). Released via nextTick so it persists through the
  // pre-flush watcher cycle.
  const writeLock = new SyncMutex();

  function lockWritesUntilFlush() {
    writeLock.lock();
    nextTick(() => writeLock.unlock());
  }

  async function update(event: StorageEventLike) {
    if (dispatchingWriteEvent)
      return;

    if (event.storageArea !== (storage as unknown as StorageEventLike['storageArea']))
      return;

    if (event.key === null) {
      changeStamp++;
      lockWritesUntilFlush();
      (state as Ref).value = defaults;
      return;
    }

    if (event.key !== keyComputed.value)
      return;

    // A foreign event interleaved with own in-flight writes is ordering-
    // ambiguous: applying it could revert a newer own value with no later
    // event to correct it. Defer to one reconciling re-read after the drain.
    if (pendingWrites > 0) {
      needsReconcile = true;
      return;
    }

    try {
      const currentSerialized = await serializer.write(state.value as T);

      if (event.newValue === currentSerialized)
        return;

      const value = await read(event);

      changeStamp++;
      lockWritesUntilFlush();
      (state as Ref).value = value;
    }
    catch (e) {
      onError(e);
    }
  }

  let stopWatch: (() => void) | null = null;
  let stopKeyWatch: (() => void) | null = null;

  tryOnScopeDispose(() => {
    stopWatch?.();
    stopKeyWatch?.();
  });

  // Event listeners for cross-tab (native Storage) and same-tab cross-instance
  // (custom backends) synchronization
  let firstMounted = false;

  if (window && listenToStorageChanges) {
    if (storage instanceof Storage) {
      useEventListener(window, 'storage', (ev: StorageEvent) => {
        if (initOnMounted && !firstMounted)
          return;

        update(ev);
      }, { passive: true });
    }
    else {
      useEventListener(window as any, customStorageEventName as any, ((ev: CustomEvent<StorageEventLike>) => {
        if (initOnMounted && !firstMounted)
          return;

        update(ev.detail);
      }) as any);
    }
  }

  const shell: UseStorageAsyncReturnBase<T, Shallow> = {
    state,
    isReady,
  };

  function performInit() {
    const stamp = changeStamp;

    return read().then((value) => {
      // An external event applied while the init read was in flight is
      // fresher than the snapshot — keep it
      if (stamp === changeStamp) {
        (state as Ref).value = value;
      }

      isReady.value = true;
      onReady?.(state.value as T);

      // Set up watcher AFTER initial state is set — avoids write-back on init
      const stop = watch(state, (newValue) => {
        if (writeLock.isLocked)
          return;

        writeWithFilter(newValue as T);
      }, { flush, deep });

      stopWatch = stop;

      // Watch for key changes
      stopKeyWatch = watch(keyComputed, () => {
        keyEpoch++;
        currentKey = keyComputed.value;
        needsReconcile = false;

        const stamp = changeStamp;

        read().then((v) => {
          if (stamp !== changeStamp)
            return;

          lockWritesUntilFlush();
          (state as Ref).value = v;
        });
      }, { flush });

      return shell;
    });
  }

  let readyPromise: Promise<UseStorageAsyncReturnBase<T, Shallow>>;

  if (initOnMounted) {
    readyPromise = new Promise<UseStorageAsyncReturnBase<T, Shallow>>((resolve) => {
      tryOnMounted(() => {
        firstMounted = true;
        performInit().then(resolve);
      });
    });
  }
  else {
    readyPromise = performInit();
  }

  return {
    ...shell,
    // eslint-disable-next-line unicorn/no-thenable
    then(onFulfilled, onRejected) {
      return readyPromise.then(onFulfilled, onRejected);
    },
  };
}
