import type { ResponseMap, $Fetch, CreateFetchOptions, FetchContext, FetchOptions, FetchRequest, FetchResponse, ResponseType } from './types';
import { createFetchError } from './error';
import {
  NULL_BODY_STATUSES,
  buildURL,
  callHooks,
  detectResponseType,
  isJSONSerializable,
  isPayloadMethod,
  joinURL,
  resolveFetchOptions,
} from './utils';

// ---------------------------------------------------------------------------
// V8: module-level Set — initialised once, never mutated, allows V8 to
// embed the set reference as a constant in compiled code.
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// createFetch
// ---------------------------------------------------------------------------

/**
 * @name createFetch
 * @category Fetch
 * @description Creates a configured $fetch instance
 *
 * V8 optimisation notes:
 * - All inner objects are created with a fixed property set so V8 can reuse
 *   their hidden class across invocations (no dynamic property additions).
 * - `Error.captureStackTrace` is called only when available (V8 / Node.js)
 *   to produce clean stack traces without internal frames.
 * - Retry and timeout paths avoid allocating closures on the hot path.
 * - `NULL_BODY_STATUSES` / `DEFAULT_RETRY_STATUS_CODES` are frozen module-
 *   level Sets, so their `.has()` calls are always monomorphic.
 *
 * @param {CreateFetchOptions} [globalOptions={}] - Global defaults and custom fetch implementation
 * @returns {$Fetch} Configured fetch instance
 *
 * @since 0.0.1
 */
export function createFetch(globalOptions: CreateFetchOptions = {}): $Fetch {
  const fetchImpl = globalOptions.fetch ?? globalThis.fetch;

  // -------------------------------------------------------------------------
  // Error handler — shared between network errors and 4xx/5xx responses
  // -------------------------------------------------------------------------

  async function onError(context: FetchContext): Promise<FetchResponse<unknown>> {
    // Explicit user-triggered abort should not be retried automatically
    const isAbort
      = context.error !== undefined
        && context.error.name === 'AbortError'
        && context.options.timeout === undefined;

    if (!isAbort && context.options.retry !== false) {
      // Default retry count: 0 for payload methods, 1 for idempotent methods
      const maxRetries
        = typeof context.options.retry === 'number'
          ? context.options.retry
          : isPayloadMethod(context.options.method ?? 'GET')
            ? 0
            : 1;

      if (maxRetries > 0) {
        const responseStatus = context.response?.status ?? 500;
        const retryStatusCodes = context.options.retryStatusCodes;
        const shouldRetry
          = retryStatusCodes !== undefined
            ? retryStatusCodes.includes(responseStatus)
            : DEFAULT_RETRY_STATUS_CODES.has(responseStatus);

        if (shouldRetry) {
          const retryDelay
            = typeof context.options.retryDelay === 'function'
              ? context.options.retryDelay(context)
              : (context.options.retryDelay ?? 0);

          if (retryDelay > 0) {
            await new Promise<void>((resolve) => {
              setTimeout(resolve, retryDelay);
            });
          }

          return $fetchRaw(context.request, {
            ...context.options,
            retry: maxRetries - 1,
          });
        }
      }
    }

    const error = createFetchError(context);

    // V8 / Node.js — clip internal frames from the error stack trace
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(error, $fetchRaw);
    }

    throw error;
  }

  // -------------------------------------------------------------------------
  // $fetchRaw — returns the full Response object with a parsed `_data` field
  // -------------------------------------------------------------------------

  const $fetchRaw: $Fetch['raw'] = async function $fetchRaw<
    T = unknown,
    R extends ResponseType = 'json',
  >(
    _request: FetchRequest,
    _options: FetchOptions<R, T> = {} as FetchOptions<R, T>,
  ): Promise<FetchResponse<T>> {
    // V8: object literal with a fixed shape — V8 allocates a single hidden
    // class for all context objects created by this function.
    const context: FetchContext<T, R> = {
      request: _request,
      options: resolveFetchOptions(
        _request,
        _options,
        globalOptions.defaults as FetchOptions<R, T>,
      ),
      response: undefined,
      error: undefined,
    };

    // Normalise method to uppercase before any hook or header logic
    if (context.options.method !== undefined) {
      context.options.method = context.options.method.toUpperCase();
    }

    if (context.options.onRequest !== undefined) {
      await callHooks(context, context.options.onRequest);
    }

    // URL transformations — only when request is a plain string
    if (typeof context.request === 'string') {
      if (context.options.baseURL !== undefined) {
        context.request = joinURL(context.options.baseURL, context.request);
      }

      const query = context.options.query ?? context.options.params;
      if (query !== undefined) {
        context.request = buildURL(context.request, query);
      }
    }

    // Body serialisation
    const method = context.options.method ?? 'GET';
    if (context.options.body !== undefined && context.options.body !== null && isPayloadMethod(method)) {
      if (isJSONSerializable(context.options.body)) {
        const contentType = context.options.headers.get('content-type');

        if (typeof context.options.body !== 'string') {
          context.options.body
            = contentType === 'application/x-www-form-urlencoded'
              ? new URLSearchParams(
                  context.options.body as Record<string, string>,
                ).toString()
              : JSON.stringify(context.options.body);
        }

        if (contentType === null) {
          context.options.headers.set('content-type', 'application/json');
        }
        if (!context.options.headers.has('accept')) {
          context.options.headers.set('accept', 'application/json');
        }
      }
      else if (
        // Web Streams API body
        typeof (context.options.body as ReadableStream | null)?.pipeTo === 'function'
      ) {
        if (!('duplex' in context.options)) {
          context.options.duplex = 'half';
        }
      }
    }

    // Timeout via AbortSignal — compose with any caller-supplied signal
    if (context.options.timeout !== undefined) {
      const timeoutSignal = AbortSignal.timeout(context.options.timeout);
      context.options.signal
        = context.options.signal !== undefined
          ? AbortSignal.any([timeoutSignal, context.options.signal as AbortSignal])
          : timeoutSignal;
    }

    // Actual fetch call
    try {
      context.response = await fetchImpl(context.request, context.options as RequestInit);
    }
    catch (err) {
      context.error = err as Error;

      if (context.options.onRequestError !== undefined) {
        await callHooks(
          context as FetchContext<T, R> & { error: Error },
          context.options.onRequestError,
        );
      }

      return (await onError(context)) as FetchResponse<T>;
    }

    // Response body parsing
    const hasBody
      = context.response.body !== null
        && !NULL_BODY_STATUSES.has(context.response.status)
        && method !== 'HEAD';

    if (hasBody) {
      const responseType
        = context.options.parseResponse !== undefined
          ? 'json'
          : (context.options.responseType
            ?? detectResponseType(context.response.headers.get('content-type') ?? ''));

      // V8: switch over a string constant — compiled to a jump table
      switch (responseType) {
        case 'json': {
          const text = await context.response.text();
          if (text) {
            context.response._data
              = context.options.parseResponse !== undefined
                ? context.options.parseResponse(text)
                : (JSON.parse(text) as T);
          }
          break;
        }
        case 'stream': {
          context.response._data = context.response.body as unknown as T;
          break;
        }
        default: {
          context.response._data = (await context.response[responseType]()) as T;
        }
      }
    }

    if (context.options.onResponse !== undefined) {
      await callHooks(
        context as FetchContext<T, R> & { response: FetchResponse<T> },
        context.options.onResponse,
      );
    }

    if (
      !context.options.ignoreResponseError
      && context.response.status >= 400
      && context.response.status < 600
    ) {
      if (context.options.onResponseError !== undefined) {
        await callHooks(
          context as FetchContext<T, R> & { response: FetchResponse<T> },
          context.options.onResponseError,
        );
      }

      return (await onError(context)) as FetchResponse<T>;
    }

    return context.response;
  };

  // -------------------------------------------------------------------------
  // $fetch — convenience wrapper that returns only the parsed data
  // -------------------------------------------------------------------------

  const $fetch = async function $fetch<T = unknown, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options?: FetchOptions<R, T>,
  ): Promise<InferResponseType<R, T>> {
    const response = await $fetchRaw<T, R>(request, options);
    return response._data as InferResponseType<R, T>;
  } as $Fetch;

  $fetch.raw = $fetchRaw;

  $fetch.native = (...args: Parameters<typeof fetchImpl>) => fetchImpl(...args);

  $fetch.create = (defaults: FetchOptions = {}, customGlobalOptions: CreateFetchOptions = {}) =>
    createFetch({
      ...globalOptions,
      ...customGlobalOptions,
      defaults: {
        ...globalOptions.defaults,
        ...customGlobalOptions.defaults,
        ...defaults,
      },
    });

  $fetch.extend = $fetch.create;

  // -------------------------------------------------------------------------
  // Method shortcuts
  // -------------------------------------------------------------------------

  $fetch.get = (request, options) => $fetch(request, { ...options, method: 'GET' });
  $fetch.post = (request, options) => $fetch(request, { ...options, method: 'POST' });
  $fetch.put = (request, options) => $fetch(request, { ...options, method: 'PUT' });
  $fetch.patch = (request, options) => $fetch(request, { ...options, method: 'PATCH' });
  $fetch.delete = (request, options) => $fetch(request, { ...options, method: 'DELETE' });
  $fetch.head = (request, options) => $fetchRaw(request, { ...options, method: 'HEAD' });

  return $fetch;
}

/** Resolves the inferred return value type from a ResponseType key */
type InferResponseType<R extends ResponseType, T> = R extends keyof ResponseMap
  ? ResponseMap[R]
  : T;
