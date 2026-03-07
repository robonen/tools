import { ref, readonly } from 'vue';
import type { Ref, DeepReadonly, ComputedRef } from 'vue';
import { useSupported } from '@/composables/browser/useSupported';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseTabLeaderOptions {
  /**
   * Immediately attempt to acquire leadership on creation
   * @default true
   */
  immediate?: boolean;
}

export interface UseTabLeaderReturn {
  /**
   * Whether the current tab is the leader
   */
  isLeader: DeepReadonly<Ref<boolean>>;
  /**
   * Whether the Web Locks API is supported
   */
  isSupported: ComputedRef<boolean>;
  /**
   * Manually acquire leadership
   */
  acquire: () => void;
  /**
   * Manually release leadership
   */
  release: () => void;
}

/**
 * @name useTabLeader
 * @category Browser
 * @description Elects a single leader tab using the Web Locks API.
 * Only one tab at a time holds the lock for a given key.
 * When the leader tab closes or the scope is disposed, another tab automatically becomes the leader.
 *
 * @param {string} key A unique lock name identifying the leader group
 * @param {UseTabLeaderOptions} [options={}] Options
 * @returns {UseTabLeaderReturn} Leader state and controls
 *
 * @example
 * const { isLeader } = useTabLeader('payment-polling');
 *
 * watchEffect(() => {
 *   if (isLeader.value) {
 *     // Only this tab performs polling
 *     startPolling();
 *   } else {
 *     stopPolling();
 *   }
 * });
 *
 * @since 0.0.13
 */
export function useTabLeader(key: string, options: UseTabLeaderOptions = {}): UseTabLeaderReturn {
  const { immediate = true } = options;

  const isLeader = ref(false);
  const isSupported = useSupported(() => navigator?.locks);

  let releaseResolve: (() => void) | null = null;
  let abortController: AbortController | null = null;

  function acquire() {
    if (!isSupported.value || abortController) return;

    abortController = new AbortController();

    navigator.locks.request(
      key,
      { signal: abortController.signal },
      () => {
        isLeader.value = true;

        return new Promise<void>((resolve) => {
          releaseResolve = resolve;
        });
      },
    ).catch((error: unknown) => {
      // AbortError is expected when release() is called before lock is acquired
      if (error instanceof DOMException && error.name === 'AbortError') return;
      throw error;
    });
  }

  function release() {
    isLeader.value = false;

    if (releaseResolve) {
      releaseResolve();
      releaseResolve = null;
    }

    if (abortController) {
      abortController.abort();
      abortController = null;
    }
  }

  if (immediate) {
    acquire();
  }

  tryOnScopeDispose(release);

  return {
    isLeader: readonly(isLeader),
    isSupported,
    acquire,
    release,
  };
}
