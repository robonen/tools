import { describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import type { UsePermissionReturn } from '.';
import { usePermission } from '.';

function stubPermissions(state: PermissionState) {
  let changeHandler: ((this: PermissionStatus, ev: Event) => any) | undefined;
  const status = {
    state,
    addEventListener: vi.fn((_: string, handler: any) => { changeHandler = handler; }),
    removeEventListener: vi.fn(() => { changeHandler = undefined; }),
  };
  const query = vi.fn(async () => status);
  const navigator = { permissions: { query } } as unknown as Navigator;
  const emitChange = (next: PermissionState) => {
    status.state = next;
    changeHandler?.call(status as unknown as PermissionStatus, new Event('change'));
  };
  return { navigator, status, query, emitChange, getChangeHandler: () => changeHandler };
}

describe(usePermission, () => {
  it('resolves the permission state', async () => {
    const { navigator } = stubPermissions('granted');
    const scope = effectScope();
    let state: UsePermissionReturn;
    scope.run(() => {
      state = usePermission('geolocation', { navigator });
    });

    await vi.waitFor(() => expect(state!.value).toBe('granted'));
    scope.stop();
  });

  it('exposes controls when controls: true', async () => {
    const { navigator, query } = stubPermissions('prompt');
    const scope = effectScope();
    let result: any;
    scope.run(() => {
      result = usePermission('camera', { controls: true, navigator });
    });

    expect(result.isSupported.value).toBeTruthy();
    await result.query();
    expect(query).toHaveBeenCalled();
    scope.stop();
  });

  it('returns undefined state when unsupported', () => {
    const navigator = {} as Navigator;
    const scope = effectScope();
    let state: UsePermissionReturn;
    scope.run(() => {
      state = usePermission('geolocation', { navigator });
    });
    expect(state!.value).toBeUndefined();
    scope.stop();
  });

  it('reacts to the status change event', async () => {
    const { navigator, emitChange } = stubPermissions('prompt');
    const scope = effectScope();
    let state: UsePermissionReturn;
    scope.run(() => {
      state = usePermission('notifications', { navigator });
    });

    await vi.waitFor(() => expect(state!.value).toBe('prompt'));

    emitChange('granted');
    await vi.waitFor(() => expect(state!.value).toBe('granted'));

    emitChange('denied');
    await vi.waitFor(() => expect(state!.value).toBe('denied'));
    scope.stop();
  });

  it('binds the change listener exactly once after resolution', async () => {
    const { navigator, status } = stubPermissions('granted');
    const scope = effectScope();
    let state: UsePermissionReturn;
    scope.run(() => {
      state = usePermission('camera', { navigator });
    });

    await vi.waitFor(() => expect(state!.value).toBe('granted'));
    expect(status.addEventListener).toHaveBeenCalledTimes(1);
    expect(status.addEventListener).toHaveBeenCalledWith('change', expect.any(Function), { passive: true });
    scope.stop();
  });

  it('removes the change listener when the scope is disposed', async () => {
    const { navigator, status } = stubPermissions('granted');
    const scope = effectScope();
    let state: UsePermissionReturn;
    scope.run(() => {
      state = usePermission('camera', { navigator });
    });

    await vi.waitFor(() => expect(state!.value).toBe('granted'));
    scope.stop();
    expect(status.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function), { passive: true });
  });

  it('dedupes concurrent and repeated queries', async () => {
    const { navigator, query } = stubPermissions('granted');
    const scope = effectScope();
    let result: any;
    scope.run(() => {
      result = usePermission('microphone', { controls: true, navigator });
    });

    // initial query() call from setup + two more concurrent calls
    await Promise.all([result.query(), result.query()]);
    // once resolved, subsequent calls reuse the cached status
    await result.query();

    expect(query).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it('query resolves to the raw PermissionStatus with controls', async () => {
    const { navigator, status } = stubPermissions('granted');
    const scope = effectScope();
    let result: any;
    scope.run(() => {
      result = usePermission('geolocation', { controls: true, navigator });
    });

    const resolved = await result.query();
    expect(resolved).toBe(status);
    scope.stop();
  });

  it('query resolves to undefined when unsupported', async () => {
    const navigator = {} as Navigator;
    const scope = effectScope();
    let result: any;
    scope.run(() => {
      result = usePermission('geolocation', { controls: true, navigator });
    });

    expect(result.isSupported.value).toBeFalsy();
    await expect(result.query()).resolves.toBeUndefined();
    scope.stop();
  });

  it('falls back to "prompt" when the query rejects', async () => {
    const query = vi.fn(async () => {
      throw new TypeError('denied descriptor');
    });
    const navigator = { permissions: { query } } as unknown as Navigator;
    const scope = effectScope();
    let state: UsePermissionReturn;
    scope.run(() => {
      state = usePermission('push', { navigator });
    });

    await vi.waitFor(() => expect(state!.value).toBe('prompt'));
    scope.stop();
  });

  it('accepts a descriptor object', async () => {
    const { navigator, query } = stubPermissions('granted');
    const scope = effectScope();
    let state: UsePermissionReturn;
    scope.run(() => {
      state = usePermission({ name: 'push', userVisibleOnly: true } as PermissionDescriptor, { navigator });
    });

    await vi.waitFor(() => expect(state!.value).toBe('granted'));
    expect(query).toHaveBeenCalledWith({ name: 'push', userVisibleOnly: true });
    scope.stop();
  });
});
