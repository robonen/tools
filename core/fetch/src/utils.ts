import type {
  FetchHook,
  FetchOptions,
  FetchRequest,
  ResolvedFetchOptions,
  ResponseType,
} from './types';
import { isArray, isFunction } from '@robonen/stdlib';

/** HTTP methods whose requests carry a body */
const PAYLOAD_METHODS: ReadonlySet<string> = /* @__PURE__ */ new Set(['PATCH', 'POST', 'PUT', 'DELETE']);

/** HTTP status codes whose responses never have a body */
export const NULL_BODY_STATUSES: ReadonlySet<number> = /* @__PURE__ */ new Set([101, 204, 205, 304]);

/** Content-types treated as plain text */
const TEXT_CONTENT_TYPES: ReadonlySet<string> = /* @__PURE__ */ new Set([
  'image/svg',
  'application/xml',
  'application/xhtml',
  'application/html',
]);

const JSON_CONTENT_TYPE_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;

// ---------------------------------------------------------------------------
// Predicate helpers
// ---------------------------------------------------------------------------

/**
 * @name isPayloadMethod
 * @category Fetch
 * @description Returns true for HTTP methods that carry a request body
 *
 * @param {string} method - Uppercase HTTP method string
 * @returns {boolean}
 *
 * @since 0.0.1
 */
export function isPayloadMethod(method: string): boolean {
  return PAYLOAD_METHODS.has(method);
}

/**
 * @name isJSONSerializable
 * @category Fetch
 * @description Returns true when a value can be serialised with JSON.stringify
 *
 * @param {unknown} value - Any value
 * @returns {boolean}
 *
 * @since 0.0.1
 */
export function isJSONSerializable(value: unknown): boolean {
  if (value === undefined)
    return false;

  const type = typeof value;

  // Fast path — primitives are always serialisable
  if (type === 'string' || type === 'number' || type === 'boolean' || value === null) return true;

  // Non-object types (bigint, function, symbol) are not serialisable
  if (type !== 'object') return false;

  // Arrays are serialisable
  if (isArray(value)) return true;

  // TypedArrays / ArrayBuffers carry a .buffer property — not JSON-serialisable
  if ((value as Record<string, unknown>).buffer !== undefined) return false;

  // FormData and URLSearchParams should not be auto-serialised
  if (value instanceof FormData || value instanceof URLSearchParams) return false;

  // Plain objects or objects with a custom toJSON
  const ctor = (value as object).constructor;
  return (
    ctor === undefined
    || ctor === Object
    || typeof (value as Record<string, unknown>).toJSON === 'function'
  );
}

// ---------------------------------------------------------------------------
// Response type detection
// ---------------------------------------------------------------------------

/**
 * @name detectResponseType
 * @category Fetch
 * @description Infers the response body parsing strategy from a Content-Type header value
 *
 * @param {string} [contentType] - Value of the Content-Type response header
 * @returns {ResponseType}
 *
 * @since 0.0.1
 */
export function detectResponseType(contentType = ''): ResponseType {
  if (!contentType) return 'json';

  const type = contentType.split(';')[0] ?? '';

  if (JSON_CONTENT_TYPE_RE.test(type)) return 'json';
  if (type === 'text/event-stream') return 'stream';
  if (TEXT_CONTENT_TYPES.has(type) || type.startsWith('text/')) return 'text';

  return 'blob';
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/**
 * @name buildURL
 * @category Fetch
 * @description Appends serialised query parameters to a URL string
 *
 * Null and undefined values are omitted. Existing query strings are preserved.
 *
 * @param {string} url - Base URL (may already contain a query string)
 * @param {Record<string, string | number | boolean | null | undefined>} query - Parameters to append
 * @returns {string} URL with query string
 *
 * @since 0.0.1
 */
export function buildURL(
  url: string,
  query: Record<string, string | number | boolean | null | undefined>,
): string {
  const params = new URLSearchParams();

  for (const key of Object.keys(query)) {
    const value = query[key];
    if (value !== null && value !== undefined) {
      params.append(key, String(value));
    }
  }

  const qs = params.toString();
  if (!qs) return url;

  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
}

/**
 * @name joinURL
 * @category Fetch
 * @description Joins a base URL with a relative path, normalising the slash boundary
 *
 * @param {string} base - Base URL (e.g. "https://api.example.com/v1")
 * @param {string} path - Relative path (e.g. "/users")
 * @returns {string} Joined URL
 *
 * @since 0.0.1
 */
export function joinURL(base: string, path: string): string {
  if (!path || path === '/') return base;

  const baseEnds = base.endsWith('/');
  const pathStarts = path.startsWith('/');

  if (baseEnds && pathStarts) return `${base}${path.slice(1)}`;
  if (!baseEnds && !pathStarts) return `${base}/${path}`;
  return `${base}${path}`;
}

// ---------------------------------------------------------------------------
// Options resolution
// ---------------------------------------------------------------------------

/**
 * @name resolveFetchOptions
 * @category Fetch
 * @description Merges per-request options with global defaults
 *
 * @since 0.0.1
 */
export function resolveFetchOptions<R extends ResponseType = 'json', T = unknown>(
  request: FetchRequest,
  input: FetchOptions<R, T> | undefined,
  defaults: FetchOptions | undefined,
): ResolvedFetchOptions<R, T>;
export function resolveFetchOptions(
  request: FetchRequest,
  input: FetchOptions | undefined,
  defaults: FetchOptions | undefined,
): ResolvedFetchOptions {
  const headers = mergeHeaders(
    input?.headers ?? (request as Request)?.headers,
    defaults?.headers,
  );

  let query: Record<string, string | number | boolean | null | undefined> | undefined;
  if (
    defaults?.query !== undefined
    || defaults?.params !== undefined
    || input?.params !== undefined
    || input?.query !== undefined
  ) {
    query = {
      ...defaults?.params,
      ...defaults?.query,
      ...input?.params,
      ...input?.query,
    };
  }

  return {
    ...defaults,
    ...input,
    query,
    params: query,
    headers,
  };
}

/** Header sources accepted by the merge function */
type HeadersInput = Headers | Record<string, string | undefined> | Array<[string, string]>;

/**
 * Merge two header sources into a single Headers instance.
 * Input headers override default headers.
 *
 */
function mergeHeaders(
  input: HeadersInput | undefined,
  defaults: HeadersInput | undefined,
): Headers {
  if (defaults === undefined) {
    return new Headers(input);
  }

  const merged = new Headers(defaults);

  if (input !== undefined) {
    const src = input instanceof Headers ? input : new Headers(input);
    src.forEach((value, key) => {
      merged.set(key, value);
    });
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Hook dispatch
// ---------------------------------------------------------------------------

/**
 * @name callHooks
 * @category Fetch
 * @description Invokes one or more lifecycle hooks with the given context
 *
 * @since 0.0.1
 */
export async function callHooks<C>(
  context: C,
  hooks: FetchHook<C> | ReadonlyArray<FetchHook<C>> | undefined,
): Promise<void> {
  if (hooks === undefined) return;

  if (isFunction(hooks)) {
    await hooks(context);
    return;
  }

  const len = hooks.length;
  for (let i = 0; i < len; i++) {
    await hooks[i]!(context);
  }
}
