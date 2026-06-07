import type { $Fetch, CreateFetchOptions, Fetch, FetchContext, FetchHook, FetchOptions, FetchPlugin, FetchRequest, FetchResponse, MappedResponseType, MergePluginOptions, ResolvedFetchOptions, ResponseType } from './types';
import { isString } from '@robonen/stdlib';
import { FetchError, createFetchError } from './error';
import { composePlugins, runHookPhase } from './plugin';
import { retryPlugin, timeoutPlugin } from './plugins';
import {
  NULL_BODY_STATUSES,
  buildURL,
  detectResponseType,
  isJSONSerializable,
  isPayloadMethod,
  joinURL,
  resolveFetchOptions,
} from './utils';

// ---------------------------------------------------------------------------
// Module-scope constants and helpers
// ---------------------------------------------------------------------------

/**
 * Built-in plugins prepended to every `createFetch` call.
 * Frozen tuple: stable array identity + V8 can treat entries as constants.
 */
const BUILTIN_PLUGINS: readonly FetchPlugin[] = /* @__PURE__ */ Object.freeze([
  retryPlugin(),
  timeoutPlugin(),
]) as readonly FetchPlugin[];

/** Default HTTP method — hoisted once so string literal is interned and reused */
const DEFAULT_METHOD = 'GET';

/**
 * V8/Node expose `Error.captureStackTrace`, browsers do not. Resolve once at
 * module load so the error path doesn't pay a dynamic lookup + typeof check.
 */
const captureStackTrace: typeof Error.captureStackTrace | undefined
  = typeof Error.captureStackTrace === 'function' ? Error.captureStackTrace : undefined;

/**
 * Parse a successful fetch Response body into `response._data` according to
 * the caller's `parseResponse` / `responseType` options (or detected from
 * Content-Type). Hoisted to module scope so `$fetchRaw` / `runAttempt`
 * stay small and inlineable.
 */
async function parseResponseBody(
  response: FetchResponse<unknown>,
  options: ResolvedFetchOptions<ResponseType, unknown>,
  method: string,
): Promise<void> {
  if (
    response.body === null
    || method === 'HEAD'
    || NULL_BODY_STATUSES.has(response.status)
  ) return;

  const parseResponse = options.parseResponse;
  const responseType = parseResponse !== undefined
    ? 'json'
    : (options.responseType ?? detectResponseType(response.headers.get('content-type') ?? ''));

  switch (responseType) {
    case 'json': {
      const text = await response.text();
      if (text.length > 0) {
        response._data = parseResponse !== undefined ? parseResponse(text) : JSON.parse(text);
      }
      return;
    }
    case 'stream': {
      response._data = response.body;
      return;
    }
    default: {
      response._data = await response[responseType]();
    }
  }
}

/**
 * Serialize the request body for payload-bearing methods and set the
 * appropriate content-type / accept / duplex hints. Mutates `options` in place.
 */
function serializeRequestBody(options: ResolvedFetchOptions<ResponseType, unknown>, method: string): void {
  const body = options.body;
  if (body === undefined || body === null || !isPayloadMethod(method)) return;

  if (isJSONSerializable(body)) {
    // A raw string body is passed through untouched — the caller owns its
    // content-type (it may be plain text, NDJSON, GraphQL, etc.).
    if (isString(body)) return;

    const headers = options.headers;
    const contentType = headers.get('content-type');

    options.body = contentType === 'application/x-www-form-urlencoded'
      ? new URLSearchParams(body as Record<string, string>).toString()
      : JSON.stringify(body);

    if (contentType === null) {
      headers.set('content-type', 'application/json');
    }
    if (!headers.has('accept')) {
      headers.set('accept', 'application/json');
    }
    return;
  }

  // Web Streams body — mark duplex if caller didn't set it explicitly.
  // `options.duplex === undefined` avoids the `in` operator slow path on
  // dictionary-mode objects and keeps the IC monomorphic on a single key load.
  if (typeof (body as ReadableStream).pipeTo === 'function' && options.duplex === undefined) {
    options.duplex = 'half';
  }
}

/**
 * Shortcut for method-specialized helpers (get/post/...). Avoids a spread
 * allocation when `options` is undefined, which is the common case.
 */
function withMethod<O>(options: O | undefined, method: string): O & { method: string } {
  return options === undefined
    ? ({ method } as O & { method: string })
    : ({ ...options, method } as O & { method: string });
}

// ---------------------------------------------------------------------------
// createFetch
// ---------------------------------------------------------------------------

/**
 * @name createFetch
 * @category Fetch
 * @description Creates a configured $fetch instance
 *
 * @param {CreateFetchOptions} [globalOptions={}] - Global defaults, custom fetch implementation, and plugins
 * @returns {$Fetch} Configured fetch instance
 *
 * @since 0.0.1
 */
export function createFetch<Plugins extends readonly FetchPlugin[] = []>(
  globalOptions: CreateFetchOptions<Plugins> = {},
): $Fetch<Plugins> {
  const fetchImpl = globalOptions.fetch ?? globalThis.fetch;

  // Built-ins compose first, user plugins layer on top. composePlugins runs once.
  const userPlugins = (globalOptions.plugins ?? []) as readonly FetchPlugin[];
  const allPlugins = userPlugins.length === 0
    ? BUILTIN_PLUGINS
    : [...BUILTIN_PLUGINS, ...userPlugins];

  const composed = composePlugins(
    allPlugins,
    globalOptions.defaults as FetchOptions | undefined,
  );
  const composedHooks = composed.hooks;
  const composedExecute = composed.execute;
  const composedDefaults = composed.defaults;

  // -------------------------------------------------------------------------
  // runAttempt — a single fetch attempt (fetch + body parse + response hooks)
  // Closure over fetchImpl + composedHooks; stable shape per instance.
  // -------------------------------------------------------------------------

  async function runAttempt<T, R extends ResponseType>(context: FetchContext<T, R>): Promise<void> {
    const options = context.options;

    // Reset per-attempt outcome so a successful retry never carries a stale
    // error/response from a previous attempt into the response hooks.
    context.error = undefined;
    context.response = undefined;

    try {
      context.response = await fetchImpl(context.request, options as RequestInit);
    }
    catch (err) {
      context.error = err as Error;

      if (composedHooks.onRequestError !== undefined || options.onRequestError !== undefined) {
        await runHookPhase(
          composedHooks.onRequestError as ReadonlyArray<FetchHook<FetchContext<T, R> & { error: Error }>> | undefined,
          options.onRequestError,
          context as FetchContext<T, R> & { error: Error },
        );
      }

      throw createFetchError(context);
    }

    const response = context.response;
    const method = options.method ?? DEFAULT_METHOD;

    await parseResponseBody(response as FetchResponse<unknown>, options as unknown as ResolvedFetchOptions<ResponseType, unknown>, method);

    if (composedHooks.onResponse !== undefined || options.onResponse !== undefined) {
      await runHookPhase(
        composedHooks.onResponse as ReadonlyArray<FetchHook<FetchContext<T, R> & { response: FetchResponse<T> }>> | undefined,
        options.onResponse,
        context as FetchContext<T, R> & { response: FetchResponse<T> },
      );
    }

    const status = response.status;
    if (!options.ignoreResponseError && status >= 400 && status < 600) {
      if (composedHooks.onResponseError !== undefined || options.onResponseError !== undefined) {
        await runHookPhase(
          composedHooks.onResponseError as ReadonlyArray<FetchHook<FetchContext<T, R> & { response: FetchResponse<T> }>> | undefined,
          options.onResponseError,
          context as FetchContext<T, R> & { response: FetchResponse<T> },
        );
      }

      throw createFetchError(context);
    }
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
    // Fixed key order → single hidden class for FetchContext across all requests
    const context: FetchContext<T, R> = {
      request: _request,
      options: resolveFetchOptions(_request, _options, composedDefaults),
      response: undefined,
      error: undefined,
    };

    const options = context.options;

    // Normalise method to uppercase before any hook or header logic, then
    // cache the resolved method string for reuse below (avoids repeating
    // `options.method ?? DEFAULT_METHOD` at every downstream call site).
    let method: string;
    if (options.method !== undefined) {
      method = options.method.toUpperCase();
      options.method = method;
    }
    else {
      method = DEFAULT_METHOD;
    }

    if (composedHooks.onRequest !== undefined || options.onRequest !== undefined) {
      await runHookPhase(
        composedHooks.onRequest as ReadonlyArray<FetchHook<FetchContext<T, R>>> | undefined,
        options.onRequest,
        context,
      );
    }

    // URL transformations — only when request is a plain string
    if (isString(context.request)) {
      if (options.baseURL !== undefined) {
        context.request = joinURL(options.baseURL, context.request);
      }

      const query = options.query ?? options.params;
      if (query !== undefined) {
        context.request = buildURL(context.request, query);
      }
    }

    serializeRequestBody(options as unknown as ResolvedFetchOptions<ResponseType, unknown>, method);

    // -----------------------------------------------------------------------
    // Execute — fast path (no execute middleware) vs onion chain
    // -----------------------------------------------------------------------

    try {
      if (composedExecute === undefined) {
        await runAttempt(context);
      }
      else {
        await composedExecute(context as unknown as FetchContext, () => runAttempt(context));
      }
      return context.response as FetchResponse<MappedResponseType<R, T>>;
    }
    catch (err) {
      const error = err instanceof FetchError ? err : createFetchError(context);

      // V8 / Node.js — clip internal frames from the error stack trace
      if (captureStackTrace !== undefined) {
        captureStackTrace(error, $fetchRaw);
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
  } as $Fetch<Plugins>;

  $fetch.raw = $fetchRaw;

  $fetch.native = fetchImpl as Fetch;

  $fetch.create = (<NewPlugins extends readonly FetchPlugin[] = []>(
    defaults: FetchOptions = {},
    customGlobalOptions: CreateFetchOptions<NewPlugins> = {},
  ) =>
    createFetch<[...Plugins, ...NewPlugins]>({
      fetch: customGlobalOptions.fetch ?? globalOptions.fetch,
      plugins: [
        ...((globalOptions.plugins ?? []) as readonly FetchPlugin[]),
        ...((customGlobalOptions.plugins ?? []) as readonly FetchPlugin[]),
      ] as unknown as [...Plugins, ...NewPlugins],
      defaults: {
        ...(globalOptions.defaults as FetchOptions | undefined),
        ...(customGlobalOptions.defaults as FetchOptions | undefined),
        ...defaults,
      } as FetchOptions & MergePluginOptions<[...Plugins, ...NewPlugins]>,
    })) as $Fetch<Plugins>['create'];

  $fetch.extend = $fetch.create;

  // -------------------------------------------------------------------------
  // Method shortcuts — `withMethod` keeps the fast path allocation-free
  // when no per-request options are provided.
  // -------------------------------------------------------------------------

  type ShortcutOptions = FetchOptions & MergePluginOptions<Plugins>;
  $fetch.get = ((req, opt) => $fetch(req, withMethod(opt, 'GET') as ShortcutOptions)) as $Fetch<Plugins>['get'];
  $fetch.post = ((req, opt) => $fetch(req, withMethod(opt, 'POST') as ShortcutOptions)) as $Fetch<Plugins>['post'];
  $fetch.put = ((req, opt) => $fetch(req, withMethod(opt, 'PUT') as ShortcutOptions)) as $Fetch<Plugins>['put'];
  $fetch.patch = ((req, opt) => $fetch(req, withMethod(opt, 'PATCH') as ShortcutOptions)) as $Fetch<Plugins>['patch'];
  $fetch.delete = ((req, opt) => $fetch(req, withMethod(opt, 'DELETE') as ShortcutOptions)) as $Fetch<Plugins>['delete'];
  $fetch.head = ((req, opt) => $fetchRaw(req, withMethod(opt, 'HEAD') as ShortcutOptions)) as $Fetch<Plugins>['head'];

  return $fetch;
}
