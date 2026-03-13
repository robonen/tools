import type {
  FetchContext,
  FetchHook,
  FetchOptions,
  FetchRequest,
  ResolvedFetchOptions,
  ResponseType,
} from './types';

// ---------------------------------------------------------------------------
// V8 optimisation: module-level frozen Sets avoid per-call allocations and
// allow V8 to treat them as compile-time constants in hidden-class analysis.
// ---------------------------------------------------------------------------

/** HTTP methods whose requests carry a body */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const PAYLOAD_METHODS: ReadonlySet<string> = /* @__PURE__ */ new Set(['PATCH', 'POST', 'PUT', 'DELETE']);

/** HTTP status codes whose responses never have a body */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const NULL_BODY_STATUSES: ReadonlySet<number> = /* @__PURE__ */ new Set([101, 204, 205, 304]);

/** Content-types treated as plain text */
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const TEXT_CONTENT_TYPES: ReadonlySet<string> = /* @__PURE__ */ new Set([
  'image/svg',
  'application/xml',
  'application/xhtml',
  'application/html',
]);

/** V8: pre-compiled at module load — avoids per-call RegExp construction */
const JSON_CONTENT_TYPE_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;

// ---------------------------------------------------------------------------
// Predicate helpers
// ---------------------------------------------------------------------------

/**
 * @name isPayloadMethod
 * @category Fetch
 * @description Returns true for HTTP methods that carry a request body
 *
 * V8: function is monomorphic — always called with an uppercase string.
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
 * V8: typeof checks are ordered from most-common to least-common to maximise
 * the probability of an early return and keep the IC monomorphic.
 *
 * @param {unknown} value - Any value
 * @returns {boolean}
 *
 * @since 0.0.1
 */
export function isJSONSerializable(value: unknown): boolean {
  if (value === undefined) return false;

  const type = typeof value;

  // Fast path — primitives are always serialisable
  if (type === 'string' || type === 'number' || type === 'boolean' || value === null) return true;

  // Non-object types (bigint, function, symbol) are not serialisable
  if (type !== 'object') return false;

  // Arrays are serialisable
  if (Array.isArray(value)) return true;

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

  // V8: split once and reuse — avoids calling split multiple times
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
 * V8: the returned object always has the same property set (fixed shape),
 * which lets V8 reuse its hidden class across all calls.
 *
 * @since 0.0.1
 */
export function resolveFetchOptions<R extends ResponseType = 'json', T = unknown>(
  request: FetchRequest,
  input: FetchOptions<R, T> | undefined,
  defaults: FetchOptions<R, T> | undefined,
): ResolvedFetchOptions<R, T> {
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

/**
 * Merge two HeadersInit sources into a single Headers instance.
 * Input headers override default headers.
 *
 * V8: avoids constructing an intermediate Headers when defaults are absent.
 */
function mergeHeaders(
  input: HeadersInit | undefined,
  defaults: HeadersInit | undefined,
): Headers {
  if (defaults === undefined) {
    return new Headers(input);
  }

  const merged = new Headers(defaults);

  if (input !== undefined) {
    const src = input instanceof Headers ? input : new Headers(input);
    for (const [key, value] of src) {
      merged.set(key, value);
    }
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
 * V8: the single-hook path avoids Array creation; the Array path uses a
 * for-loop with a cached length to stay monomorphic inside the loop body.
 *
 * @since 0.0.1
 */
export async function callHooks<C extends FetchContext = FetchContext>(
  context: C,
  hooks: FetchHook<C> | readonly FetchHook<C>[] | undefined,
): Promise<void> {
  if (hooks === undefined) return;

  if (Array.isArray(hooks)) {
    const len = hooks.length;
    for (let i = 0; i < len; i++) {
      await (hooks as Array<FetchHook<C>>)[i]!(context);
    }
  }
  else {
    await (hooks as FetchHook<C>)(context);
  }
}
