import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useWebNotification } from '.';

// A minimal stub of the `Notification` constructor. `permission` and the
// `requestPermission` result are configurable per test via the static fields.
class StubNotification {
  static permission: NotificationPermission = 'granted';
  static requestPermission = vi.fn(async (): Promise<NotificationPermission> => StubNotification.permission);

  title: string;
  options: any;
  onclick: ((e: Event) => void) | null = null;
  onshow: ((e: Event) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onclose: ((e: Event) => void) | null = null;
  close = vi.fn();

  static instances: StubNotification[] = [];

  constructor(title: string, options?: any) {
    this.title = title;
    this.options = options;
    StubNotification.instances.push(this);
  }
}

interface StubDocument {
  visibilityState: DocumentVisibilityState;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  listeners: Map<string, EventListener[]>;
  dispatch: (type: string) => void;
}

function makeDocument(): StubDocument {
  const listeners = new Map<string, EventListener[]>();
  return {
    visibilityState: 'hidden',
    listeners,
    addEventListener: vi.fn((type: string, fn: EventListener) => {
      const arr = listeners.get(type) ?? [];
      arr.push(fn);
      listeners.set(type, arr);
    }),
    removeEventListener: vi.fn((type: string, fn: EventListener) => {
      const arr = listeners.get(type) ?? [];
      listeners.set(type, arr.filter(l => l !== fn));
    }),
    dispatch(type: string) {
      for (const fn of listeners.get(type) ?? [])
        fn(new Event(type));
    },
  };
}

function makeWindow(overrides: Partial<{ hasNotification: boolean }> = {}): Window {
  const { hasNotification = true } = overrides;
  const doc = makeDocument();
  const win: any = {
    document: doc,
  };
  if (hasNotification)
    win.Notification = StubNotification;
  return win as Window;
}

function withScope<T>(fn: () => T): { result: T; stop: () => void } {
  const scope = effectScope();
  const result = scope.run(fn)!;
  return { result, stop: () => scope.stop() };
}

describe(useWebNotification, () => {
  beforeEach(() => {
    StubNotification.permission = 'granted';
    StubNotification.instances = [];
    StubNotification.requestPermission = vi.fn(async () => StubNotification.permission);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exposes the documented surface', () => {
    const win = makeWindow();
    const { result, stop } = withScope(() => useWebNotification({ window: win, requestPermissions: false }));

    expect(result.isSupported.value).toBeTruthy();
    expect(result.notification.value).toBeNull();
    expect(typeof result.show).toBe('function');
    expect(typeof result.close).toBe('function');
    expect(typeof result.ensurePermissionGranted).toBe('function');
    expect(typeof result.onClick).toBe('function');
    expect(typeof result.onShow).toBe('function');
    expect(typeof result.onError).toBe('function');
    expect(typeof result.onClose).toBe('function');
    stop();
  });

  it('reports unsupported when Notification is absent', () => {
    const win = makeWindow({ hasNotification: false });
    const { result, stop } = withScope(() => useWebNotification({ window: win, requestPermissions: false }));

    expect(result.isSupported.value).toBeFalsy();
    expect(result.permissionGranted.value).toBeFalsy();
    stop();
  });

  it('is SSR-safe with no window', () => {
    const { result, stop } = withScope(() => useWebNotification({ window: undefined, requestPermissions: false }));

    expect(result.isSupported.value).toBeFalsy();
    expect(result.permissionGranted.value).toBeFalsy();
    stop();
  });

  it('show() does nothing when unsupported', async () => {
    const win = makeWindow({ hasNotification: false });
    const { result, stop } = withScope(() => useWebNotification({ window: win, requestPermissions: false }));

    const n = await result.show();
    expect(n).toBeUndefined();
    expect(result.notification.value).toBeNull();
    stop();
  });

  it('show() does nothing when permission not granted', async () => {
    StubNotification.permission = 'default';
    const win = makeWindow();
    const { result, stop } = withScope(() => useWebNotification({ window: win, requestPermissions: false }));

    expect(result.permissionGranted.value).toBeFalsy();
    const n = await result.show();
    expect(n).toBeUndefined();
    expect(result.notification.value).toBeNull();
    stop();
  });

  it('show() creates a notification merging default and override options', async () => {
    const win = makeWindow();
    const { result, stop } = withScope(() => useWebNotification({
      window: win,
      requestPermissions: false,
      title: 'Default title',
      body: 'Default body',
    }));

    const n = await result.show({ body: 'Override body' });
    expect(n).toBeInstanceOf(StubNotification);
    expect(result.notification.value).toBe(n);
    expect((n as unknown as StubNotification).title).toBe('Default title');
    expect((n as unknown as StubNotification).options.body).toBe('Override body');
    stop();
  });

  it('show() uses an empty title when none is provided', async () => {
    const win = makeWindow();
    const { result, stop } = withScope(() => useWebNotification({ window: win, requestPermissions: false }));

    const n = await result.show();
    expect((n as unknown as StubNotification).title).toBe('');
    stop();
  });

  it('wires onClick/onShow/onError/onClose to native handlers', async () => {
    const win = makeWindow();
    const { result, stop } = withScope(() => useWebNotification({ window: win, requestPermissions: false }));

    const click = vi.fn();
    const showed = vi.fn();
    const errored = vi.fn();
    const closed = vi.fn();
    result.onClick(click);
    result.onShow(showed);
    result.onError(errored);
    result.onClose(closed);

    const n = (await result.show()) as unknown as StubNotification;

    n.onclick?.(new Event('click'));
    n.onshow?.(new Event('show'));
    n.onerror?.(new Event('error'));
    n.onclose?.(new Event('close'));
    await nextTick();

    expect(click).toHaveBeenCalledTimes(1);
    expect(showed).toHaveBeenCalledTimes(1);
    expect(errored).toHaveBeenCalledTimes(1);
    expect(closed).toHaveBeenCalledTimes(1);
    stop();
  });

  it('close() closes the active notification and clears the ref', async () => {
    const win = makeWindow();
    const { result, stop } = withScope(() => useWebNotification({ window: win, requestPermissions: false }));

    const n = (await result.show()) as unknown as StubNotification;
    result.close();
    expect(n.close).toHaveBeenCalledTimes(1);
    expect(result.notification.value).toBeNull();
    stop();
  });

  it('ensurePermissionGranted() requests permission and flips the flag', async () => {
    StubNotification.permission = 'default';
    StubNotification.requestPermission = vi.fn(async () => 'granted' as NotificationPermission);
    const win = makeWindow();
    const { result, stop } = withScope(() => useWebNotification({ window: win, requestPermissions: false }));

    expect(result.permissionGranted.value).toBeFalsy();
    const granted = await result.ensurePermissionGranted();
    expect(StubNotification.requestPermission).toHaveBeenCalledTimes(1);
    expect(granted).toBeTruthy();
    expect(result.permissionGranted.value).toBeTruthy();
    stop();
  });

  it('ensurePermissionGranted() does not request when already denied', async () => {
    StubNotification.permission = 'denied';
    const requestSpy = vi.fn(async () => 'denied' as NotificationPermission);
    StubNotification.requestPermission = requestSpy;
    const win = makeWindow();
    const { result, stop } = withScope(() => useWebNotification({ window: win, requestPermissions: false }));

    const granted = await result.ensurePermissionGranted();
    expect(requestSpy).not.toHaveBeenCalled();
    expect(granted).toBeFalsy();
    stop();
  });

  it('ensurePermissionGranted() returns undefined when unsupported', async () => {
    const win = makeWindow({ hasNotification: false });
    const { result, stop } = withScope(() => useWebNotification({ window: win, requestPermissions: false }));

    expect(await result.ensurePermissionGranted()).toBeUndefined();
    stop();
  });

  it('closes the active notification when the tab becomes visible', async () => {
    const win = makeWindow();
    const doc = win.document as unknown as StubDocument;
    const { result, stop } = withScope(() => useWebNotification({ window: win, requestPermissions: false }));

    const n = (await result.show()) as unknown as StubNotification;
    expect(result.notification.value).toBe(n);

    // Listener was registered for visibilitychange.
    expect(doc.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function), expect.objectContaining({ passive: true }));

    doc.visibilityState = 'visible';
    doc.dispatch('visibilitychange');

    expect(n.close).toHaveBeenCalledTimes(1);
    expect(result.notification.value).toBeNull();
    stop();
  });

  it('does not close on visibilitychange when still hidden', async () => {
    const win = makeWindow();
    const doc = win.document as unknown as StubDocument;
    const { result, stop } = withScope(() => useWebNotification({ window: win, requestPermissions: false }));

    const n = (await result.show()) as unknown as StubNotification;
    doc.visibilityState = 'hidden';
    doc.dispatch('visibilitychange');

    expect(n.close).not.toHaveBeenCalled();
    expect(result.notification.value).toBe(n);
    stop();
  });

  it('closes the active notification when the scope is disposed', async () => {
    const win = makeWindow();
    const { result, stop } = withScope(() => useWebNotification({ window: win, requestPermissions: false }));

    const n = (await result.show()) as unknown as StubNotification;
    stop();
    expect(n.close).toHaveBeenCalledTimes(1);
  });
});
