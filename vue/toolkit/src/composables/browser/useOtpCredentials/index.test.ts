import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick } from 'vue';
import { useOtpCredentials } from '.';

/**
 * Build a fake `window`/`navigator` pair exposing the WebOTP surface. `get`
 * resolves with an `{ code }` credential by default; tests can override it to
 * reject (e.g. an AbortError) or hang.
 */
function createOtpEnv(get = vi.fn(async (_options?: CredentialRequestOptions) => ({ code: '123456' }))) {
  const window = { OTPCredential: class {} } as unknown as Window & typeof globalThis;
  const navigator = { credentials: { get } } as unknown as Navigator;
  return { window, navigator, get };
}

/**
 * A fake `get` that never resolves on its own — it rejects with an AbortError
 * the moment its signal aborts (or immediately if already aborted), mirroring
 * how a real `navigator.credentials.get` reacts to abortion.
 */
function abortableGet() {
  return vi.fn((options?: CredentialRequestOptions) =>
    new Promise<{ code: string }>((_resolve, reject) => {
      const signal = options!.signal!;
      const fail = (): void => reject(new DOMException('aborted', 'AbortError'));
      if (signal.aborted)
        fail();
      else
        signal.addEventListener('abort', fail);
    }),
  );
}

function withScope<T>(fn: () => T): { result: T; stop: () => void } {
  const scope = effectScope();
  let result!: T;
  scope.run(() => {
    result = fn();
  });
  return { result, stop: () => scope.stop() };
}

describe(useOtpCredentials, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports supported when OTPCredential and navigator.credentials exist', () => {
    const { window, navigator } = createOtpEnv();
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator }));
    expect(result.isSupported.value).toBeTruthy();
    stop();
  });

  it('reports unsupported when OTPCredential is absent', () => {
    const window = {} as unknown as Window & typeof globalThis;
    const navigator = { credentials: { get: vi.fn() } } as unknown as Navigator;
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator }));
    expect(result.isSupported.value).toBeFalsy();
    stop();
  });

  it('is SSR-safe and a no-op when window/navigator are undefined', async () => {
    const { result, stop } = withScope(() =>
      useOtpCredentials({
        window: undefined as unknown as Window,
        navigator: undefined as unknown as Navigator,
      }),
    );
    expect(result.isSupported.value).toBeFalsy();
    await expect(result.receive()).resolves.toBeUndefined();
    expect(result.code.value).toBeNull();
    stop();
  });

  it('defaults code to null and isReceiving to false', () => {
    const { window, navigator } = createOtpEnv();
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator }));
    expect(result.code.value).toBeNull();
    expect(result.isReceiving.value).toBeFalsy();
    expect(result.error.value).toBeNull();
    stop();
  });

  it('resolves with the code, updates code, and clears isReceiving', async () => {
    const { window, navigator, get } = createOtpEnv();
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator }));

    const received = await result.receive();

    expect(get).toHaveBeenCalledTimes(1);
    expect(received).toBe('123456');
    expect(result.code.value).toBe('123456');
    expect(result.isReceiving.value).toBeFalsy();
    stop();
  });

  it('requests the sms transport by default and forwards an abort signal', async () => {
    const { window, navigator, get } = createOtpEnv();
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator }));

    await result.receive();

    const passed = get.mock.calls[0]![0]!;
    expect(passed.otp).toEqual({ transport: ['sms'] });
    expect(passed.signal).toBeInstanceOf(AbortSignal);
    stop();
  });

  it('honors a per-call transport override', async () => {
    const { window, navigator, get } = createOtpEnv();
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator, transport: ['sms'] }));

    await result.receive({ transport: [] as unknown as OTPTransportType[] });

    expect(get.mock.calls[0]![0]!.otp).toEqual({ transport: [] });
    stop();
  });

  it('fires onReceive listeners and the option callback with the code', async () => {
    const callback = vi.fn();
    const listener = vi.fn();
    const { window, navigator } = createOtpEnv();
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator, onReceive: callback }));
    result.onReceive(listener);

    await result.receive();

    expect(callback).toHaveBeenCalledWith('123456');
    expect(listener).toHaveBeenCalledWith('123456');
    stop();
  });

  it('swallows AbortError without setting error or code', async () => {
    const get = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError');
    });
    const { window, navigator } = createOtpEnv(get);
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator }));

    await expect(result.receive()).resolves.toBeUndefined();
    expect(result.error.value).toBeNull();
    expect(result.code.value).toBeNull();
    expect(result.isReceiving.value).toBeFalsy();
    stop();
  });

  it('surfaces non-abort errors via error ref, onError hook, and the callback', async () => {
    const failure = new Error('boom');
    const get = vi.fn(async () => {
      throw failure;
    });
    const callback = vi.fn();
    const listener = vi.fn();
    const { window, navigator } = createOtpEnv(get);
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator, onError: callback }));
    result.onError(listener);

    await expect(result.receive()).resolves.toBeUndefined();

    expect(result.error.value).toBe(failure);
    expect(callback).toHaveBeenCalledWith(failure);
    expect(listener).toHaveBeenCalledWith(failure);
    stop();
  });

  it('aborts the previous in-flight request when receive() is called again', async () => {
    const signals: AbortSignal[] = [];
    const get = vi.fn((options?: CredentialRequestOptions) =>
      new Promise<{ code: string }>((resolve, reject) => {
        const signal = options!.signal!;
        signals.push(signal);
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        // The second call resolves so the test can await a settled value.
        if (signals.length === 2)
          resolve({ code: '654321' });
      }),
    );
    const { window, navigator } = createOtpEnv(get as never);
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator }));

    const first = result.receive();
    const second = result.receive();

    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBe('654321');

    expect(signals[0]!.aborted).toBeTruthy();
    expect(result.code.value).toBe('654321');
    expect(result.isReceiving.value).toBeFalsy();
    stop();
  });

  it('does not let a superseded request that resolves late clobber the newer result', async () => {
    // A signal-unaware `get` (e.g. a polyfill, or an SMS landing as the abort
    // propagates): it resolves only when the test says so, ignoring abort.
    const resolvers: Array<(value: { code: string }) => void> = [];
    const get = vi.fn(() => new Promise<{ code: string }>((resolve) => {
      resolvers.push(resolve);
    }));
    const onReceiveSpy = vi.fn();
    const { window, navigator } = createOtpEnv(get as never);
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator }));
    result.onReceive(onReceiveSpy);

    const first = result.receive(); // #1 -> resolvers[0]
    const second = result.receive(); // #2 supersedes #1 -> resolvers[1]

    // The current request (#2) resolves first with the fresh code.
    resolvers[1]!({ code: 'FRESH2' });
    await expect(second).resolves.toBe('FRESH2');

    // The superseded request (#1) resolves LATE with a stale code — it must be
    // ignored: no clobber of `code`, no onReceive with the stale value.
    resolvers[0]!({ code: 'STALE1' });
    await expect(first).resolves.toBeUndefined();
    await Promise.resolve();

    expect(result.code.value).toBe('FRESH2');
    expect(onReceiveSpy).toHaveBeenCalledTimes(1);
    expect(onReceiveSpy).toHaveBeenCalledWith('FRESH2');
    stop();
  });

  it('keeps isReceiving true while a superseded request settles and a newer one is still in flight', async () => {
    const { window, navigator } = createOtpEnv(abortableGet() as never);
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator }));

    const first = result.receive(); // A: pending
    void result.receive(); // B: supersedes A (aborts it), still pending

    await expect(first).resolves.toBeUndefined(); // A's AbortError swallowed
    await Promise.resolve(); // let A's finally microtask run

    // A is superseded, so its teardown must NOT clear B's in-flight flag.
    expect(result.isReceiving.value).toBeTruthy();

    result.abort();
    expect(result.isReceiving.value).toBeFalsy();
    stop();
  });

  it('clears a previous error after a successful receive', async () => {
    const failure = new Error('boom');
    const get = vi.fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce({ code: '123456' });
    const { window, navigator } = createOtpEnv(get as never);
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator }));

    await result.receive();
    expect(result.error.value).toBe(failure);

    const received = await result.receive();
    expect(received).toBe('123456');
    expect(result.error.value).toBeNull();
    expect(result.code.value).toBe('123456');
    stop();
  });

  it('abort() cancels the in-flight request and clears isReceiving', async () => {
    const { window, navigator } = createOtpEnv(abortableGet() as never);
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator }));

    const pending = result.receive();
    expect(result.isReceiving.value).toBeTruthy();

    result.abort();
    expect(result.isReceiving.value).toBeFalsy();

    await expect(pending).resolves.toBeUndefined();
    stop();
  });

  it('aborts when an already-aborted external signal is supplied', async () => {
    const { window, navigator } = createOtpEnv(abortableGet() as never);
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator }));

    const controller = new AbortController();
    controller.abort();

    await expect(result.receive({ signal: controller.signal })).resolves.toBeUndefined();
    expect(result.error.value).toBeNull();
    stop();
  });

  it('aborts the request when the surrounding scope is disposed', async () => {
    const { window, navigator } = createOtpEnv(abortableGet() as never);
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator }));

    const pending = result.receive();
    stop();

    await expect(pending).resolves.toBeUndefined();
  });

  it('starts listening immediately when immediate is true', async () => {
    const { window, navigator, get } = createOtpEnv();
    const { result, stop } = withScope(() => useOtpCredentials({ window, navigator, immediate: true }));

    await nextTick();
    expect(get).toHaveBeenCalledTimes(1);
    // Allow the microtask chain from the immediate receive() to settle.
    await Promise.resolve();
    expect(result.code.value).toBe('123456');
    stop();
  });
});
