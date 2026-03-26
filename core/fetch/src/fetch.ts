import type { $Fetch, CreateFetchOptions, FetchContext, FetchOptions, FetchRequest, FetchResponse, MappedResponseType, ResponseType } from './types';
import { FetchError, createFetchError } from './error';
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
import { isFunction, isNumber, isString, retry } from '@robonen/stdlib';

function assignResponseData(response: { _data?: unknown }, data: unknown): void {
  response._data = data;
}

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
 * @param {CreateFetchOptions} [globalOptions={}] - Global defaults and custom fetch implementation
 * @returns {$Fetch} Configured fetch instance
 *
 * @since 0.0.1
 */
export function createFetch(globalOptions: CreateFetchOptions = {}): $Fetch {
  const fetchImpl = globalOptions.fetch ?? globalThis.fetch;

  // -------------------------------------------------------------------------
  // executeFetch — performs a single fetch attempt (no retry logic)
  // -------------------------------------------------------------------------

  async function executeFetch<T = unknown, R extends ResponseType = 'json'>(context: FetchContext<T, R>): Promise<FetchResponse<T>> {
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

      throw createFetchError(context);
    }

    // Response body parsing
    const method = context.options.method ?? 'GET';
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

      switch (responseType) {
        case 'json': {
          const text = await context.response.text();
          if (text) {
            context.response._data
              = context.options.parseResponse !== undefined
                ? context.options.parseResponse(text)
                : JSON.parse(text);
          }
          break;
        }
        case 'stream': {
          assignResponseData(context.response, context.response.body);
          break;
        }
        default: {
          assignResponseData(context.response, await context.response[responseType]());
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

      throw createFetchError(context);
    }

    return context.response;
  }

  // -------------------------------------------------------------------------
  // $fetchRaw — returns the full Response object with a parsed `_data` field
  // -------------------------------------------------------------------------

  const $fetchRaw = async function $fetchRaw<
    T = unknown,
    R extends ResponseType = 'json',
  >(
    _request: FetchRequest,
    _options?: FetchOptions<R, T>,
  ): Promise<FetchResponse<MappedResponseType<R, T>>> {
    const context: FetchContext<T, R> = {
      request: _request,
      options: resolveFetchOptions(
        _request,
        _options,
        globalOptions.defaults,
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
    if (isString(context.request)) {
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

        if (!isString(context.options.body)) {
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

    // -----------------------------------------------------------------------
    // Retry configuration — computed once, not per attempt
    // -----------------------------------------------------------------------

    const retryDisabled = context.options.retry === false;
    const maxRetries = retryDisabled
      ? 0
      : isNumber(context.options.retry)
        ? context.options.retry
        : isPayloadMethod(method)
          ? 0
          : 1;

    if (maxRetries === 0) {
      try {
        return await executeFetch(context) as FetchResponse<MappedResponseType<R, T>>;
      }
      catch (err) {
        const error = err instanceof FetchError ? err : createFetchError(context);

        if (isFunction(Error.captureStackTrace)) {
          Error.captureStackTrace(error, $fetchRaw);
        }

        throw error;
      }
    }

    // Retry path — delegates to stdlib retry with iterative while-loop
    try {
      return await retry(
        async ({ stop }) => {
          try {
            return await executeFetch(context) as FetchResponse<MappedResponseType<R, T>>;
          }
          catch (error) {
            // User-initiated abort (not timeout) should not be retried
            const isAbort
              = context.error !== undefined
                && context.error.name === 'AbortError'
                && context.options.timeout === undefined;

            if (isAbort) {
              stop(error);
            }

            throw error;
          }
        },
        {
          // stdlib retry counts total attempts; fetch `retry` means retries only
          times: maxRetries + 1,
          delay: isFunction(context.options.retryDelay)
            ? () => (context.options.retryDelay as (ctx: FetchContext<T, R>) => number)(context)
            : (context.options.retryDelay ?? 0),
          shouldRetry: () => {
            const status = context.response?.status ?? 500;
            return context.options.retryStatusCodes !== undefined
              ? context.options.retryStatusCodes.includes(status)
              : DEFAULT_RETRY_STATUS_CODES.has(status);
          },
        },
      );
    }
    catch (err) {
      const error = err instanceof FetchError ? err : createFetchError(context);

      // V8 / Node.js — clip internal frames from the error stack trace
      if (isFunction(Error.captureStackTrace)) {
        Error.captureStackTrace(error, $fetchRaw);
      }

      throw error;
    }
  };

  // -------------------------------------------------------------------------
  // $fetch — convenience wrapper that returns only the parsed data
  // -------------------------------------------------------------------------

  const $fetch = async function $fetch<T = unknown, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options?: FetchOptions<R, T>,
  ): Promise<MappedResponseType<R, T>> {
    const response = await $fetchRaw<T, R>(request, options);
    return response._data as MappedResponseType<R, T>;
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
