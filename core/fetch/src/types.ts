import type { MaybePromise, ReadonlyArrayable, UnionToIntersection } from '@robonen/stdlib';

// --------------------------
// Fetch API
// --------------------------

/**
 * @name $Fetch
 * @category Fetch
 * @description The main fetch interface with method shortcuts, raw access, and factory methods
 *
 * @typeParam Plugins - Tuple of plugins attached to this instance; their option
 * extensions are merged into every request's options type.
 */
export interface $Fetch<Plugins extends readonly FetchPlugin[] = []> {
  <T = unknown, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options?: FetchOptions<R, T> & MergePluginOptions<Plugins>,
  ): Promise<MappedResponseType<R, T>>;
  raw<T = unknown, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options?: FetchOptions<R, T> & MergePluginOptions<Plugins>,
  ): Promise<FetchResponse<MappedResponseType<R, T>>>;
  /** Access to the underlying native fetch function */
  native: Fetch;
  /** Create a new fetch instance with merged defaults and (optionally) additional plugins */
  create<NewPlugins extends readonly FetchPlugin[] = []>(
    defaults?: FetchOptions & MergePluginOptions<[...Plugins, ...NewPlugins]>,
    globalOptions?: CreateFetchOptions<NewPlugins>,
  ): $Fetch<[...Plugins, ...NewPlugins]>;
  /** Alias for create — extend this instance with new defaults and (optionally) additional plugins */
  extend<NewPlugins extends readonly FetchPlugin[] = []>(
    defaults?: FetchOptions & MergePluginOptions<[...Plugins, ...NewPlugins]>,
    globalOptions?: CreateFetchOptions<NewPlugins>,
  ): $Fetch<[...Plugins, ...NewPlugins]>;
  /** Shorthand for GET requests */
  get<T = unknown, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options?: Omit<FetchOptions<R, T>, 'method'> & MergePluginOptions<Plugins>,
  ): Promise<MappedResponseType<R, T>>;
  /** Shorthand for POST requests */
  post<T = unknown, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options?: Omit<FetchOptions<R, T>, 'method'> & MergePluginOptions<Plugins>,
  ): Promise<MappedResponseType<R, T>>;
  /** Shorthand for PUT requests */
  put<T = unknown, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options?: Omit<FetchOptions<R, T>, 'method'> & MergePluginOptions<Plugins>,
  ): Promise<MappedResponseType<R, T>>;
  /** Shorthand for PATCH requests */
  patch<T = unknown, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options?: Omit<FetchOptions<R, T>, 'method'> & MergePluginOptions<Plugins>,
  ): Promise<MappedResponseType<R, T>>;
  /** Shorthand for DELETE requests */
  delete<T = unknown, R extends ResponseType = 'json'>(
    request: FetchRequest,
    options?: Omit<FetchOptions<R, T>, 'method'> & MergePluginOptions<Plugins>,
  ): Promise<MappedResponseType<R, T>>;
  /** Shorthand for HEAD requests */
  head(
    request: FetchRequest,
    options?: Omit<FetchOptions, 'method'> & MergePluginOptions<Plugins>,
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
 *
 * @typeParam Plugins - Tuple of plugins to attach to the instance
 */
export interface CreateFetchOptions<Plugins extends readonly FetchPlugin[] = []> {
  /** Default options merged into every request */
  defaults?: FetchOptions & MergePluginOptions<Plugins>;
  /** Custom fetch implementation — defaults to globalThis.fetch */
  fetch?: Fetch;
  /**
   * Plugins composed once at createFetch time.
   * Each plugin may contribute defaults, lifecycle hooks, and typed option fields.
   */
  plugins?: Plugins;
}

// --------------------------
// Plugins
// --------------------------

/**
 * @name FetchPlugin
 * @category Fetch
 * @description A reusable bundle of defaults and lifecycle hooks that extends a fetch instance.
 *
 * Plugins are composed once at `createFetch` time — their defaults and hooks are
 * flattened into the instance closure, so attaching plugins adds zero per-request
 * overhead beyond the contributed hooks themselves.
 *
 * @typeParam Name - Unique plugin identifier (for debugging / duplicate detection)
 * @typeParam OptionsExt - Extra fields merged into every request's options type
 * @typeParam ContextExt - Extra fields that the plugin may attach to FetchContext
 * at runtime (advisory; not enforced by the core pipeline)
 *
 * @example
 * const authPlugin = definePlugin<'auth', { token?: string }>({
 *   name: 'auth',
 *   hooks: {
 *     onRequest: (ctx) => {
 *       const token = (ctx.options as { token?: string }).token;
 *       if (token) ctx.options.headers.set('authorization', `Bearer ${token}`);
 *     },
 *   },
 * });
 */
export interface FetchPlugin<
  Name extends string = string,
  OptionsExt = unknown,
  ContextExt = unknown,
> {
  /** Plugin identifier */
  readonly name: Name;
  /** Default options contributed by the plugin — merged under user defaults */
  readonly defaults?: FetchOptions;
  /** Lifecycle hooks executed before any user per-request hooks */
  readonly hooks?: FetchHooks;
  /**
   * Onion-style middleware wrapping the fetch attempt + response parse.
   * Plugins compose in registration order; calling `next()` invokes the next
   * middleware or ultimately the core executor. May call `next()` multiple
   * times (e.g. to implement retries).
   */
  readonly execute?: FetchExecuteMiddleware;
  /** Invoked once per createFetch, after all plugin defaults are merged */
  readonly setup?: (context: { readonly defaults: FetchOptions }) => void;
  /**
   * Phantom marker for type-only option/context extensions — never present at runtime.
   * Populated via dummy field in `definePlugin` generics.
   * @internal
   */
  readonly __types?: { options: OptionsExt; context: ContextExt };
}

/**
 * @name FetchExecuteMiddleware
 * @category Fetch
 * @description Onion-style wrapper around a single fetch attempt.
 *
 * Invoking `next()` delegates to the next middleware in the chain or, at the
 * innermost layer, performs the actual `fetch` call and response body parsing.
 * `context.response` / `context.error` are populated by the time `next()` resolves.
 *
 * Middlewares may call `next()` zero, one, or many times (retries).
 */
export type FetchExecuteMiddleware = (
  context: FetchContext,
  next: () => Promise<void>,
) => Promise<void>;

/**
 * @name MergePluginOptions
 * @category Fetch
 * @description Intersection of all `OptionsExt` carried by a plugin tuple. Empty tuple resolves to `unknown`.
 */
export type MergePluginOptions<Plugins extends readonly FetchPlugin[]>
  = [Plugins[number]] extends [never]
    ? unknown
    : UnionToIntersection<PluginOptionsOf<Plugins[number]>>;

/**
 * @name MergePluginContext
 * @category Fetch
 * @description Intersection of all `ContextExt` carried by a plugin tuple. Empty tuple resolves to `unknown`.
 */
export type MergePluginContext<Plugins extends readonly FetchPlugin[]>
  = [Plugins[number]] extends [never]
    ? unknown
    : UnionToIntersection<PluginContextOf<Plugins[number]>>;

type PluginOptionsOf<P> = P extends FetchPlugin<infer _N, infer O, infer _C> ? O : unknown;
type PluginContextOf<P> = P extends FetchPlugin<infer _N, infer _O, infer C> ? C : unknown;

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
