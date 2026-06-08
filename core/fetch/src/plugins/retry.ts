import type { FetchContext, ResolvedFetchOptions } from '../types';
import { isFunction, isNumber, retry } from '@robonen/stdlib';
import { definePlugin } from '../plugin';
import { isPayloadMethod } from '../utils';

/** HTTP status codes that trigger automatic retry by default */
const DEFAULT_RETRY_STATUS_CODES: ReadonlySet<number> = /* @__PURE__ */ new Set([
  408, // Request Timeout
  409, // Conflict
  425, // Too Early (Experimental)
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
]);

const ABORT_ERROR_NAME = 'AbortError';

/**
 * Compute the number of retries for a given request. Module-scope so the
 * function site stays monomorphic (always sees `ResolvedFetchOptions` / string).
 */
function computeMaxRetries(options: ResolvedFetchOptions, method: string): number {
  const retryOpt = options.retry;
  if (retryOpt === false) return 0;
  if (isNumber(retryOpt)) return retryOpt;
  return isPayloadMethod(method) ? 0 : 1;
}

/** True when the current response status is in the effective retry-status allowlist. */
function shouldRetryStatus(options: ResolvedFetchOptions, status: number): boolean {
  const list = options.retryStatusCodes;
  return list !== undefined
    ? list.includes(status)
    : DEFAULT_RETRY_STATUS_CODES.has(status);
}

/**
 * @name retryPlugin
 * @category Fetch
 * @description Retries failed attempts based on status code, respecting
 * `retry` / `retryDelay` / `retryStatusCodes` request options.
 *
 * Auto-registered by `createFetch`; disable per-request via `retry: false`.
 *
 * @since 0.1.0
 */
export function retryPlugin() {
  return definePlugin({
    name: 'retry',
    execute: async (context, next) => {
      const options = context.options;
      const maxRetries = computeMaxRetries(options, options.method ?? 'GET');

      // Fast path — no retries requested; avoid the stdlib retry wrapper
      if (maxRetries === 0) {
        await next();
        return;
      }

      const retryDelay = options.retryDelay;
      const delay = isFunction(retryDelay)
        ? () => (retryDelay as (ctx: FetchContext) => number)(context)
        : (retryDelay ?? 0);

      await retry(
        async ({ stop }) => {
          try {
            await next();
          }
          catch (error) {
            // User-initiated abort must never be retried. `AbortSignal.timeout`
            // aborts with a `TimeoutError`, so a plain `AbortError` is always
            // caller-driven and should stop the retry loop immediately.
            const err = context.error;
            if (err !== undefined && err.name === ABORT_ERROR_NAME) {
              stop(error);
            }
            throw error;
          }
        },
        {
          // stdlib retry counts total attempts; fetch `retry` means retries only
          times: maxRetries + 1,
          delay,
          shouldRetry: () => shouldRetryStatus(options, context.response?.status ?? 500),
        },
      );
    },
  });
}
