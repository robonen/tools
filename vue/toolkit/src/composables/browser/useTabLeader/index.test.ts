import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, effectScope, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useTabLeader } from '.';

type LockGrantedCallback = (lock: unknown) => Promise<void>;
interface MockLockRequest {
  key: string;
  callback: LockGrantedCallback;
  resolve: () => void;
  signal?: AbortSignal;
}

const pendingRequests: MockLockRequest[] = [];
let heldLocks: Set<string>;

function setupLocksMock() {
  heldLocks = new Set();

  const mockLocks = {
    request: vi.fn(async (key: string, options: { signal?: AbortSignal }, callback: LockGrantedCallback) => {
      if (options.signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

      if (heldLocks.has(key)) {
        // Queue the request — lock is held
        return new Promise<void>((resolve) => {
          const request: MockLockRequest = { key, callback, resolve, signal: options.signal };

          options.signal?.addEventListener('abort', () => {
            const index = pendingRequests.indexOf(request);
            if (index > -1) pendingRequests.splice(index, 1);
            resolve();
          });

          pendingRequests.push(request);
        });
      }

      heldLocks.add(key);
      const result = callback({} as unknown);

      // When the callback promise resolves (lock released), grant to next waiter
      result.then(() => {
        heldLocks.delete(key);
        grantNextLock(key);
      });

      return result;
    }),
  };

  Object.defineProperty(navigator, 'locks', {
    value: mockLocks,
    writable: true,
    configurable: true,
  });
}

function grantNextLock(key: string) {
  const index = pendingRequests.findIndex(r => r.key === key);
  if (index === -1) return;

  const [request] = pendingRequests.splice(index, 1);
  if (!request) return;

  heldLocks.add(key);

  const result = request.callback({} as unknown);
  result.then(() => {
    heldLocks.delete(key);
    request.resolve();
    grantNextLock(key);
  });
}

const mountWithComposable = (setup: () => Record<string, any> | void) => {
  return mount(
    defineComponent({
      setup,
      template: '<div></div>',
    }),
  );
};

describe(useTabLeader, () => {
  let component: ReturnType<typeof mountWithComposable>;

  beforeEach(() => {
    pendingRequests.length = 0;
    setupLocksMock();
  });

  afterEach(() => {
    component?.unmount();
  });

  it('acquire leadership when lock is available', async () => {
    component = mountWithComposable(() => {
      const { isLeader, isSupported } = useTabLeader('test-leader');
      return { isLeader, isSupported };
    });

    await nextTick();

    expect(component.vm.isSupported).toBeTruthy();
    expect(component.vm.isLeader).toBeTruthy();
  });

  it('not grant leadership when another tab holds the lock', async () => {
    const scope1 = effectScope();
    let leader1: ReturnType<typeof useTabLeader>;

    scope1.run(() => {
      leader1 = useTabLeader('exclusive');
    });

    const scope2 = effectScope();
    let leader2: ReturnType<typeof useTabLeader>;

    scope2.run(() => {
      leader2 = useTabLeader('exclusive');
    });

    await nextTick();

    expect(leader1!.isLeader.value).toBeTruthy();
    expect(leader2!.isLeader.value).toBeFalsy();

    scope1.stop();
    scope2.stop();
  });

  it('transfer leadership when the leader releases the lock', async () => {
    const scope1 = effectScope();
    let leader1: ReturnType<typeof useTabLeader>;

    scope1.run(() => {
      leader1 = useTabLeader('transfer');
    });

    const scope2 = effectScope();
    let leader2: ReturnType<typeof useTabLeader>;

    scope2.run(() => {
      leader2 = useTabLeader('transfer');
    });

    await nextTick();
    expect(leader1!.isLeader.value).toBeTruthy();
    expect(leader2!.isLeader.value).toBeFalsy();

    // Leader 1 releases (e.g., tab closes)
    scope1.stop();
    await nextTick();

    expect(leader1!.isLeader.value).toBeFalsy();
    expect(leader2!.isLeader.value).toBeTruthy();

    scope2.stop();
  });

  it('manually release and re-acquire leadership', async () => {
    const scope = effectScope();
    let leader: ReturnType<typeof useTabLeader>;

    scope.run(() => {
      leader = useTabLeader('manual');
    });

    await nextTick();
    expect(leader!.isLeader.value).toBeTruthy();

    leader!.release();
    await nextTick();
    expect(leader!.isLeader.value).toBeFalsy();

    leader!.acquire();
    await nextTick();
    expect(leader!.isLeader.value).toBeTruthy();

    scope.stop();
  });

  it('not acquire when immediate is false', async () => {
    const scope = effectScope();
    let leader: ReturnType<typeof useTabLeader>;

    scope.run(() => {
      leader = useTabLeader('deferred', { immediate: false });
    });

    await nextTick();
    expect(leader!.isLeader.value).toBeFalsy();
    expect(navigator.locks.request).not.toHaveBeenCalled();

    leader!.acquire();
    await nextTick();
    expect(leader!.isLeader.value).toBeTruthy();

    scope.stop();
  });

  it('fallback to isLeader always false when locks API is not supported', async () => {
    Object.defineProperty(navigator, 'locks', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    component = mountWithComposable(() => {
      const { isLeader, isSupported } = useTabLeader('unsupported');
      return { isLeader, isSupported };
    });

    await nextTick();

    expect(component.vm.isSupported).toBeFalsy();
    expect(component.vm.isLeader).toBeFalsy();
  });
});
