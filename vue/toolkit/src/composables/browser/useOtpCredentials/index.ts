import { shallowReadonly, shallowRef } from 'vue';
import type { ComputedRef, ShallowRef } from 'vue';
import { noop } from '@robonen/stdlib';
import { defaultNavigator, defaultWindow } from '@/types';
import type { ConfigurableNavigator, ConfigurableWindow } from '@/types';
import { useSupported } from '@/composables/utilities/useSupported';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';
import { createEventHook } from '@/composables/utilities/createEventHook';
import type { EventHookOn } from '@/composables/utilities/createEventHook';

/**
 * Per-call overrides for {@link UseOtpCredentialsReturn.receive}.
 */
export interface OtpCredentialsRequestOptions {
  /**
   * Transports the OTP may be delivered over. Currently only `'sms'` is
   * specified by the WebOTP API.
   *
   * @default the composable-level `transport` option (`['sms']`)
   */
  transport?: OTPTransportType[];

  /**
   * An external `AbortSignal` merged with the composable's own controller, so
   * the request is aborted when either fires (e.g. pair with
   * `AbortSignal.timeout(30_000)` to give up after 30s).
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
   */
  signal?: AbortSignal;
}

export interface UseOtpCredentialsOptions extends ConfigurableWindow, ConfigurableNavigator {
  /**
   * Transports the OTP may be delivered over. Currently only `'sms'` is
   * specified by the WebOTP API.
   *
   * @default ['sms']
   */
  transport?: OTPTransportType[];

  /**
   * Begin listening for an OTP immediately (on the client). The request is a
   * no-op during SSR or when the API is unsupported.
   *
   * @default false
   */
  immediate?: boolean;

  /**
   * An external `AbortSignal` merged with the composable's own controller for
   * every `receive()` call.
   */
  signal?: AbortSignal;

  /**
   * Called with the OTP code whenever one is received. Equivalent to
   * registering a listener via the returned `onReceive`.
   *
   * @default () => {}
   */
  onReceive?: (code: string) => void;

  /**
   * Called when a request fails for a reason other than abort. Equivalent to
   * registering a listener via the returned `onError`.
   *
   * @default () => {}
   */
  onError?: (error: unknown) => void;
}

export interface UseOtpCredentialsReturn {
  /**
   * Whether the [WebOTP API](https://developer.mozilla.org/en-US/docs/Web/API/WebOTP_API) is supported.
   */
  isSupported: ComputedRef<boolean>;

  /**
   * The most recently received OTP code, or `null` before the first one
   * arrives. Writable so consumers can clear it.
   */
  code: ShallowRef<string | null>;

  /**
   * Whether a request is currently in flight (waiting for the user to deliver
   * the OTP).
   */
  isReceiving: Readonly<ShallowRef<boolean>>;

  /**
   * The last non-abort error, or `null`. Aborts are part of normal lifecycle
   * and are never surfaced here.
   */
  error: Readonly<ShallowRef<unknown>>;

  /**
   * Start listening for an OTP. Resolves with the received code, or
   * `undefined` when the request is aborted, errors, or the API is
   * unsupported. Only one request can be active at a time — calling `receive`
   * again aborts the previous one. Never rejects; failures surface via
   * `error` / `onError`.
   */
  receive: (overrideOptions?: OtpCredentialsRequestOptions) => Promise<string | undefined>;

  /**
   * Abort the in-flight request, if any.
   */
  abort: () => void;

  /**
   * Register a listener fired with the code each time an OTP is received.
   */
  onReceive: EventHookOn<string>;

  /**
   * Register a listener fired with the error when a request fails (non-abort).
   */
  onError: EventHookOn<unknown>;
}

const DEFAULT_TRANSPORT: OTPTransportType[] = ['sms'];

/**
 * @name useOtpCredentials
 * @category Browser
 * @description Reactive, SSR-safe wrapper around the [WebOTP API](https://developer.mozilla.org/en-US/docs/Web/API/WebOTP_API)
 * (`navigator.credentials.get({ otp })`) for auto-reading one-time passwords
 * delivered by SMS. Exposes the received `code`, in-flight/error state,
 * `receive()`/`abort()` controls, and `onReceive`/`onError` hooks. Pairs with
 * an `<input autocomplete="one-time-code">`.
 *
 * @param {UseOtpCredentialsOptions} [options={}] Options (`transport`, `immediate`, `signal`, `onReceive`, `onError`, custom `window`/`navigator`)
 * @returns {UseOtpCredentialsReturn} `{ isSupported, code, isReceiving, error, receive, abort, onReceive, onError }`
 *
 * @example
 * const { isSupported, code, receive } = useOtpCredentials();
 * if (isSupported.value) {
 *   const otp = await receive();
 *   if (otp)
 *     form.code = otp;
 * }
 *
 * @example
 * // Start listening on mount and react via the hook
 * const { onReceive } = useOtpCredentials({ immediate: true });
 * onReceive((code) => { form.code = code; });
 *
 * @example
 * // Give up after 30 seconds via an external signal
 * const { receive } = useOtpCredentials();
 * receive({ signal: AbortSignal.timeout(30_000) });
 *
 * @since 0.0.15
 */
export function useOtpCredentials(options: UseOtpCredentialsOptions = {}): UseOtpCredentialsReturn {
  const {
    window = defaultWindow,
    navigator = defaultNavigator,
    transport = DEFAULT_TRANSPORT,
    immediate = false,
    signal: defaultSignal,
    onReceive: onReceiveCallback = noop,
    onError: onErrorCallback = noop,
  } = options;

  const isSupported = useSupported(() =>
    !!window
    && 'OTPCredential' in window
    && !!navigator
    && 'credentials' in navigator,
  );

  const code = shallowRef<string | null>(null);
  const isReceiving = shallowRef(false);
  const error = shallowRef<unknown>(null);

  const { on: onReceive, trigger: receiveTrigger } = createEventHook<string>();
  const { on: onError, trigger: errorTrigger } = createEventHook<unknown>();

  if (onReceiveCallback !== noop)
    onReceive(onReceiveCallback);
  if (onErrorCallback !== noop)
    onError(onErrorCallback);

  // Only one WebOTP request may be in flight at a time. We keep the active
  // controller so a new receive() (or abort()) can cancel the previous one.
  let controller: AbortController | null = null;

  function abort(): void {
    controller?.abort();
    controller = null;
    isReceiving.value = false;
  }

  async function receive(overrideOptions: OtpCredentialsRequestOptions = {}): Promise<string | undefined> {
    if (!isSupported.value || !navigator)
      return undefined;

    // Cancel any previous request before starting a new one.
    controller?.abort();

    const ownController = new AbortController();
    controller = ownController;

    // Merge an external signal: abort our controller when it fires.
    const externalSignal = overrideOptions.signal ?? defaultSignal;
    let unlinkExternal = noop;
    if (externalSignal) {
      if (externalSignal.aborted) {
        ownController.abort();
      }
      else {
        const onExternalAbort = (): void => ownController.abort();
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
        unlinkExternal = () => externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }

    error.value = null;
    isReceiving.value = true;

    // A request is "current" only while it still owns the shared controller. A
    // newer receive() or an abort() replaces/clears it, after which this
    // request must neither commit its result nor tear down shared state — so a
    // superseded or late-resolving request can never clobber a fresher one.
    const isCurrent = (): boolean => controller === ownController;

    try {
      const credential = await navigator.credentials.get({
        otp: { transport: overrideOptions.transport ?? transport },
        signal: ownController.signal,
      }) as OTPCredential | null;

      const received = credential?.code;
      if (!received || !isCurrent())
        return undefined;

      code.value = received;
      receiveTrigger(received);

      return received;
    }
    catch (err) {
      // Aborts are part of normal lifecycle (unmount, re-request, timeout) —
      // swallow them rather than surfacing as errors. A superseded request's
      // error is likewise stale and must not overwrite the live one's state.
      if (!isCurrent() || (err instanceof DOMException && err.name === 'AbortError'))
        return undefined;

      error.value = err;
      errorTrigger(err);

      return undefined;
    }
    finally {
      unlinkExternal();
      // Only the latest request owns the shared state.
      if (isCurrent()) {
        controller = null;
        isReceiving.value = false;
      }
    }
  }

  if (immediate)
    receive();

  tryOnScopeDispose(abort);

  return {
    isSupported,
    code,
    isReceiving: shallowReadonly(isReceiving),
    error: shallowReadonly(error),
    receive,
    abort,
    onReceive,
    onError,
  };
}
