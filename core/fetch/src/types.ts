import type { MaybePromise, ReadonlyArrayable } from '@robonen/stdlib';

// --------------------------
// Fetch API
// --------------------------

/**
 * @name $Fetch
 * @category Fetch
 * @description The main fetch interface with method shortcuts, raw access, and factory methods
 */
export interface $Fetch {
  <T = unknown, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options?: FetchOptions<R, T>,
  ): Promise<MappedResponseType<R, T>>;
  raw<T = unknown, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options?: FetchOptions<R, T>,
  ): Promise<FetchResponse<MappedResponseType<R, T>>>;
  /** Access to the underlying native fetch function */
  native: Fetch;
  /** Create a new fetch instance with merged defaults */
  create(defaults?: FetchOptions, globalOptions?: CreateFetchOptions): $Fetch;
  /** Alias for create — extend this instance with new defaults */
  extend(defaults?: FetchOptions, globalOptions?: CreateFetchOptions): $Fetch;
  /** Shorthand for GET requests */
  get<T = unknown, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options?: Omit<FetchOptions<R, T>, 'method'>,
  ): Promise<MappedResponseType<R, T>>;
  /** Shorthand for POST requests */
  post<T = unknown, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options?: Omit<FetchOptions<R, T>, 'method'>,
  ): Promise<MappedResponseType<R, T>>;
  /** Shorthand for PUT requests */
  put<T = unknown, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options?: Omit<FetchOptions<R, T>, 'method'>,
  ): Promise<MappedResponseType<R, T>>;
  /** Shorthand for PATCH requests */
  patch<T = unknown, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options?: Omit<FetchOptions<R, T>, 'method'>,
  ): Promise<MappedResponseType<R, T>>;
  /** Shorthand for DELETE requests */
  delete<T = unknown, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options?: Omit<FetchOptions<R, T>, 'method'>,
  ): Promise<MappedResponseType<R, T>>;
  /** Shorthand for HEAD requests */
  head(
    request: FetchRequest,
    options?: Omit<FetchOptions, 'method'>,
  ): Promise<FetchResponse<unknown>>;
}

// --------------------------
// Options
// --------------------------

/**
 * @name FetchOptions
 * @category Fetch
 * @description Options for a fetch request, extending native RequestInit with additional features
 */
export interface FetchOptions<R extends ResponseType = 'json', T = unknown>
  extends Omit<RequestInit, 'body'>,
  FetchHooks<T, R> {
  /** Base URL prepended to all relative request URLs */
  baseURL?: string;
  /** Request body — plain objects are automatically JSON-serialized */
  body?: RequestInit['body'] | Record<string, unknown> | unknown[] | null;
  /** Suppress throwing on 4xx/5xx responses */
  ignoreResponseError?: boolean;
  /** URL query parameters serialized and appended to the request URL */
  query?: Record<string, string | number | boolean | null | undefined>;
  /**
   * @deprecated use `query` instead
   */
  params?: Record<string, string | number | boolean | null | undefined>;
  /** Custom response parser — overrides built-in JSON.parse */
  parseResponse?: (responseText: string) => T;
  /** Expected response format — drives body parsing */
  responseType?: R;
  /**
   * Enable duplex streaming.
   * Automatically set to "half" when a ReadableStream is used as body.
   * @see https://fetch.spec.whatwg.org/#enumdef-requestduplex
   */
  duplex?: 'half';
  /** Request timeout in milliseconds. Uses AbortSignal.timeout internally. */
  timeout?: number;
  /** Number of retry attempts on failure, or false to disable. Defaults to 1 for non-payload methods. */
  retry?: number | false;
  /** Delay in milliseconds between retries, or a function receiving the context */
  retryDelay?: number | ((context: FetchContext<T, R>) => number);
  /**
   * HTTP status codes that trigger a retry.
   * Defaults to [408, 409, 425, 429, 500, 502, 503, 504].
   */
  retryStatusCodes?: readonly number[];
}

/**
 * @name ResolvedFetchOptions
 * @category Fetch
 * @description FetchOptions after merging defaults — headers are always a Headers instance
 */
export interface ResolvedFetchOptions<R extends ResponseType = 'json', T = unknown>
  extends FetchOptions<R, T> {
  headers: Headers;
}

/**
 * @name CreateFetchOptions
 * @category Fetch
 * @description Global options for createFetch
 */
export interface CreateFetchOptions {
  /** Default options merged into every request */
  defaults?: FetchOptions;
  /** Custom fetch implementation — defaults to globalThis.fetch */
  fetch?: Fetch;
}

// --------------------------
// Hooks and Context
// --------------------------

/**
 * @name FetchContext
 * @category Fetch
 * @description Mutable context object passed to all hooks and the core fetch pipeline
 */
export interface FetchContext<T = unknown, R extends ResponseType = 'json'> {
  request: FetchRequest;
  options: ResolvedFetchOptions<R, T>;
  response?: FetchResponse<T>;
  error?: Error;
}

/**
 * @name FetchHook
 * @category Fetch
 * @description A function invoked at a specific point in the fetch lifecycle
 */
export type FetchHook<C = FetchContext> = (context: C) => MaybePromise<void>;

/**
 * @name FetchHooks
 * @category Fetch
 * @description Lifecycle hooks for the fetch pipeline
 */
export interface FetchHooks<T = unknown, R extends ResponseType = 'json'> {
  /** Called before the request is sent */
  onRequest?: ReadonlyArrayable<FetchHook<FetchContext<T, R>>>;
  /** Called when the request itself throws (e.g. network error, timeout) */
  onRequestError?: ReadonlyArrayable<FetchHook<FetchContext<T, R> & { error: Error }>>;
  /** Called after a successful response is received and parsed */
  onResponse?: ReadonlyArrayable<FetchHook<FetchContext<T, R> & { response: FetchResponse<T> }>>;
  /** Called when the response status is 4xx or 5xx */
  onResponseError?: ReadonlyArrayable<FetchHook<FetchContext<T, R> & { response: FetchResponse<T> }>>;
}

// --------------------------
// Response Types
// --------------------------

/**
 * @name ResponseMap
 * @category Fetch
 * @description Maps response type keys to their parsed value types
 */
export interface ResponseMap {
  blob: Blob;
  text: string;
  arrayBuffer: ArrayBuffer;
  stream: ReadableStream<Uint8Array>;
}

/**
 * @name ResponseType
 * @category Fetch
 * @description Supported response body parsing modes
 */
export type ResponseType = keyof ResponseMap | 'json';

/**
 * @name MappedResponseType
 * @category Fetch
 * @description Resolves the response value type from a ResponseType key
 */
export type MappedResponseType<R extends ResponseType, T = unknown> = R extends keyof ResponseMap
  ? ResponseMap[R]
  : T;

/**
 * @name FetchResponse
 * @category Fetch
 * @description Extended Response with a parsed `_data` field
 */
export interface FetchResponse<T> extends Response {
  _data?: T;
}

// --------------------------
// Error
// --------------------------

/**
 * @name FetchErrorOptions
 * @category Fetch
 * @description Subset of FetchOptions stored on FetchError — strips lifecycle hooks,
 * parseResponse, and retryDelay callback that are invariant in T/R
 */
export type FetchErrorOptions = Omit<
  FetchOptions<ResponseType>,
  keyof FetchHooks | 'parseResponse' | 'retryDelay'
>;

/**
 * @name IFetchError
 * @category Fetch
 * @description Shape of errors thrown by $fetch
 */
export interface IFetchError<T = unknown> extends Error {
  request?: FetchRequest;
  options?: FetchErrorOptions;
  response?: FetchResponse<T>;
  data?: T;
  status?: number;
  statusText?: string;
  statusCode?: number;
  statusMessage?: string;
}

// --------------------------
// Primitives
// --------------------------

/** The native fetch function signature */
export type Fetch = typeof globalThis.fetch;

/** A fetch request — URL string, URL object, or Request object */
export type FetchRequest = string | URL | Request;
