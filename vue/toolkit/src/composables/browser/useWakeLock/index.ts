import { computed, shallowRef, watch } from 'vue';
import type { ComputedRef, ShallowRef } from 'vue';
import { defaultDocument, defaultNavigator } from '@/types';
import type { ConfigurableDocument, ConfigurableNavigator } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useSupported } from '@/composables/utilities/useSupported';
import { useDocumentVisibility } from '@/composables/elements/useDocumentVisibility';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export type WakeLockType = 'screen';

export interface WakeLockSentinel extends EventTarget {
  type: WakeLockType;
  released: boolean;
  release: () => Promise<void>;
}

type NavigatorWithWakeLock
  = Navigator & {
    wakeLock: { request: (type: WakeLockType) => Promise<WakeLockSentinel> };
  };

export type UseWakeLockOptions
  = ConfigurableNavigator & ConfigurableDocument;

export interface UseWakeLockReturn {
  /**
   * Whether the Screen Wake Lock API is supported.
   */
  isSupported: ComputedRef<boolean>;
  /**
   * The current `WakeLockSentinel`, or `null` when no lock is held.
   */
  sentinel: ShallowRef<WakeLockSentinel | null>;
  /**
   * Whether a wake lock is currently held AND the document is visible.
   */
  isActive: ComputedRef<boolean>;
  /**
   * Request a wake lock. If the document is hidden, the request is deferred
   * and automatically (re)acquired once the document becomes visible again.
   */
  request: (type: WakeLockType) => Promise<void>;
  /**
   * Request a wake lock immediately, releasing any existing one first.
   * Will reject (via `onError`) if the document is hidden.
   */
  forceRequest: (type: WakeLockType) => Promise<void>;
  /**
   * Release the current wake lock and cancel any deferred request.
   */
  release: () => Promise<void>;
}

/**
 * @name useWakeLock
 * @category Browser
 * @description Reactive wrapper over the Screen Wake Lock API to keep the screen awake.
 * Re-acquires a deferred lock automatically when the document returns to visible.
 *
 * @param {UseWakeLockOptions} [options={}] Options (custom `navigator`, `document`)
 * @returns {UseWakeLockReturn} `{ isSupported, sentinel, isActive, request, forceRequest, release }`
 *
 * @example
 * const { isSupported, isActive, request, release } = useWakeLock();
 * await request('screen');
 * // ...later
 * await release();
 *
 * @example
 * // forceRequest re-acquires immediately, dropping any existing lock
 * const { forceRequest } = useWakeLock();
 * await forceRequest('screen');
 *
 * @since 0.0.15
 */
export function useWakeLock(options: UseWakeLockOptions = {}): UseWakeLockReturn {
  const {
    navigator = defaultNavigator,
    document = defaultDocument,
  } = options;

  // Type to re-acquire once the document becomes visible again, or `false` when none pending.
  const requestedType = shallowRef<WakeLockType | false>(false);
  const sentinel = shallowRef<WakeLockSentinel | null>(null);
  const visibility = useDocumentVisibility({ document });

  const isSupported = useSupported(() => !!navigator && 'wakeLock' in navigator);
  const isActive = computed(() => !!sentinel.value && visibility.value === 'visible');

  async function forceRequest(type: WakeLockType): Promise<void> {
    await sentinel.value?.release();
    sentinel.value = isSupported.value
      ? await (navigator as NavigatorWithWakeLock).wakeLock.request(type)
      : null;
  }

  async function request(type: WakeLockType): Promise<void> {
    if (visibility.value === 'visible')
      await forceRequest(type);
    else
      requestedType.value = type;
  }

  async function release(): Promise<void> {
    requestedType.value = false;
    const current = sentinel.value;
    sentinel.value = null;
    await current?.release();
  }

  if (isSupported.value) {
    // The browser auto-releases the lock when the document is hidden;
    // remember the type so we can re-acquire on the next visible transition.
    useEventListener(sentinel, 'release', () => {
      requestedType.value = sentinel.value?.type ?? false;
    }, { passive: true });

    watch(
      () => visibility.value === 'visible' && requestedType.value,
      (type) => {
        if (!type)
          return;

        requestedType.value = false;
        forceRequest(type);
      },
    );
  }

  tryOnScopeDispose(() => {
    release();
  });

  return {
    isSupported,
    sentinel,
    isActive,
    request,
    forceRequest,
    release,
  };
}
