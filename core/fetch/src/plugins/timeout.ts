import { definePlugin } from '../plugin';

/**
 * Caller's original `signal`, captured once per request so each retry attempt
 * recombines a *fresh* timeout signal with it instead of reusing an already
 * aborted one. Keyed on the FetchContext to keep its hidden class stable.
 */
const baseSignals = new WeakMap<object, AbortSignal | undefined>();

/**
 * @name timeoutPlugin
 * @category Fetch
 * @description Composes an `AbortSignal.timeout(ms)` with any caller-supplied signal
 * when `options.timeout` is set.
 *
 * Implemented as an `execute` middleware (inner to `retry`) so every retry attempt
 * gets a brand-new timeout signal — a single timeout no longer poisons all
 * subsequent attempts. The timeout therefore applies per attempt, not to the whole
 * retry sequence.
 *
 * Auto-registered by `createFetch`; no-op when `timeout` is unset.
 *
 * @since 0.1.0
 */
export function timeoutPlugin() {
  return definePlugin({
    name: 'timeout',
    execute: async (context, next) => {
      const options = context.options;
      const timeout = options.timeout;
      if (timeout === undefined) {
        await next();
        return;
      }

      // Fix the caller's signal once; reuse it across retry attempts.
      let base: AbortSignal | undefined;
      if (baseSignals.has(context)) {
        base = baseSignals.get(context);
      }
      else {
        base = options.signal as AbortSignal | undefined;
        baseSignals.set(context, base);
      }

      const timeoutSignal = AbortSignal.timeout(timeout);
      options.signal = base === undefined
        ? timeoutSignal
        : AbortSignal.any([timeoutSignal, base]);

      await next();
    },
  });
}
