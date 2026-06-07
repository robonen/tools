import type { FetchExecuteMiddleware, FetchHook, FetchHooks, FetchOptions, FetchPlugin } from './types';

// ---------------------------------------------------------------------------
// definePlugin — identity factory with type-safe inference
// ---------------------------------------------------------------------------

/**
 * @name definePlugin
 * @category Fetch
 * @description Declares a typed fetch plugin. Identity function — returns its input
 * verbatim at runtime, used only to narrow generics for strong option inference.
 *
 * @typeParam Name - Unique plugin identifier
 * @typeParam OptionsExt - Extra fields contributed to FetchOptions by this plugin
 * @typeParam ContextExt - Extra fields advisory for FetchContext
 *
 * @example <caption>Bearer token injection with typed per-request override</caption>
 * const auth = definePlugin<'auth', { token?: string }>({
 *   name: 'auth',
 *   hooks: {
 *     onRequest: (ctx) => {
 *       const token = (ctx.options as { token?: string }).token;
 *       if (token !== undefined) ctx.options.headers.set('authorization', `Bearer ${token}`);
 *     },
 *   },
 * });
 *
 * const api = createFetch({ plugins: [auth] });
 * await api('/me', { token: 'xyz' });
 *
 * @example <caption>Auto-refresh on 401 using a shared factory closure</caption>
 * function createAuthPlugin(getAccessToken: () => Promise<string>) {
 *   let current: Promise<string> | undefined;
 *   const refresh = () => (current ??= getAccessToken().finally(() => { current = undefined; }));
 *
 *   return definePlugin<'auth', { skipAuth?: boolean }>({
 *     name: 'auth',
 *     hooks: {
 *       onRequest: async (ctx) => {
 *         if ((ctx.options as { skipAuth?: boolean }).skipAuth) return;
 *         ctx.options.headers.set('authorization', `Bearer ${await refresh()}`);
 *       },
 *       onResponseError: async (ctx) => {
 *         if (ctx.response.status !== 401) return;
 *         // Invalidate cached token; next attempt via `retry` will pick up a fresh one.
 *         current = undefined;
 *         ctx.options.headers.set('authorization', `Bearer ${await refresh()}`);
 *       },
 *     },
 *     defaults: { retry: 1, retryStatusCodes: [401, 408, 429, 500, 502, 503, 504] },
 *   });
 * }
 *
 * @example <caption>Idempotency-Key for unsafe methods</caption>
 * const idempotency = definePlugin<'idempotency', { idempotencyKey?: string }>({
 *   name: 'idempotency',
 *   hooks: {
 *     onRequest: (ctx) => {
 *       const method = (ctx.options.method ?? 'GET').toUpperCase();
 *       if (method === 'GET' || method === 'HEAD') return;
 *       const key = (ctx.options as { idempotencyKey?: string }).idempotencyKey ?? crypto.randomUUID();
 *       ctx.options.headers.set('idempotency-key', key);
 *     },
 *   },
 * });
 *
 * @example <caption>Response envelope unwrapping — { data, meta } → data</caption>
 * interface Envelope<T> { readonly data: T; readonly meta?: Record<string, unknown> }
 *
 * const unwrap = definePlugin({
 *   name: 'unwrap',
 *   hooks: {
 *     onResponse: (ctx) => {
 *       const body = ctx.response._data as Envelope<unknown> | undefined;
 *       if (body !== undefined && typeof body === 'object' && 'data' in body) {
 *         ctx.response._data = body.data;
 *       }
 *     },
 *   },
 * });
 *
 * @example <caption>Timing + structured logger using WeakMap-keyed state</caption>
 * function createLoggerPlugin(sink: (record: { url: string; status: number; ms: number }) => void) {
 *   const started = new WeakMap<object, number>();
 *
 *   return definePlugin({
 *     name: 'logger',
 *     hooks: {
 *       onRequest: (ctx) => {
 *         started.set(ctx, performance.now());
 *       },
 *       onResponse: (ctx) => {
 *         const t = started.get(ctx);
 *         if (t === undefined) return;
 *         sink({ url: String(ctx.request), status: ctx.response.status, ms: performance.now() - t });
 *       },
 *       onResponseError: (ctx) => {
 *         const t = started.get(ctx);
 *         if (t === undefined) return;
 *         sink({ url: String(ctx.request), status: ctx.response.status, ms: performance.now() - t });
 *       },
 *     },
 *   });
 * }
 *
 * @example <caption>Request ID / correlation header</caption>
 * const requestId = definePlugin<'requestId', { requestId?: string }>({
 *   name: 'requestId',
 *   hooks: {
 *     onRequest: (ctx) => {
 *       const id = (ctx.options as { requestId?: string }).requestId ?? crypto.randomUUID();
 *       ctx.options.headers.set('x-request-id', id);
 *     },
 *   },
 * });
 *
 * @example <caption>Composing multiple plugins — order matters</caption>
 * // Hooks execute in registration order, then any user per-request hook runs last.
 * // Here: requestId → auth → logger → user-provided onRequest.
 * const api = createFetch({
 *   plugins: [requestId, createAuthPlugin(fetchToken), createLoggerPlugin(console.log), unwrap],
 *   defaults: { baseURL: 'https://api.example.com' },
 * });
 *
 * // Per-domain instance inherits every parent plugin and may add its own.
 * const billing = api.extend({ baseURL: 'https://billing.example.com' }, {
 *   plugins: [idempotency],
 * });
 * await billing('/invoices', { method: 'POST', body: { amount: 100 } });
 *
 * @since 0.1.0
 */
export function definePlugin<
  const Name extends string,
  OptionsExt = unknown,
  ContextExt = unknown,
>(
  plugin: FetchPlugin<Name, OptionsExt, ContextExt>,
): FetchPlugin<Name, OptionsExt, ContextExt> {
  return plugin;
}

// ---------------------------------------------------------------------------
// composePlugins — runs once per createFetch
// ---------------------------------------------------------------------------

/**
 * @name ComposedPlugins
 * @category Fetch
 * @description Flattened hook lists and merged defaults produced by composePlugins.
 */
export interface ComposedPlugins {
  /** Merged defaults — plugin defaults first, then user defaults (user wins) */
  defaults: FetchOptions;
  /** Pre-flattened readonly hook arrays; undefined when no plugin contributed a phase */
  readonly hooks: {
    readonly onRequest: readonly FetchHook[] | undefined;
    readonly onRequestError: readonly FetchHook[] | undefined;
    readonly onResponse: readonly FetchHook[] | undefined;
    readonly onResponseError: readonly FetchHook[] | undefined;
  };
  /**
   * Pre-composed onion chain of plugin `execute` middlewares, or `undefined`
   * when no plugin contributed one (fast path: caller invokes the core
   * executor directly without constructing a `next` closure).
   */
  readonly execute: FetchExecuteMiddleware | undefined;
}

/** Empty hooks shape reused when no plugins are attached — preserves a single hidden class */
const EMPTY_HOOKS: ComposedPlugins['hooks'] = /* @__PURE__ */ Object.freeze({
  onRequest: undefined,
  onRequestError: undefined,
  onResponse: undefined,
  onResponseError: undefined,
});

type HeadersInput = Headers | Record<string, string | undefined> | Array<[string, string]>;

function appendHeaders(target: Headers, source: HeadersInput): void {
  if (source instanceof Headers) {
    source.forEach((value, key) => {
      target.set(key, value);
    });
    return;
  }
  const headers = new Headers(source as Record<string, string> | Array<[string, string]>);
  headers.forEach((value, key) => {
    target.set(key, value);
  });
}

function pushHook<C>(
  target: Array<FetchHook<C>>,
  source: FetchHook<C> | ReadonlyArray<FetchHook<C>> | undefined,
): void {
  if (source === undefined) return;
  if (typeof source === 'function') {
    target.push(source);
    return;
  }
  for (let i = 0; i < source.length; i++) {
    target.push(source[i]!);
  }
}

function applyDefaults(
  merged: FetchOptions,
  mergedHeaders: Headers | undefined,
  next: FetchOptions,
): { defaults: FetchOptions; headers: Headers | undefined } {
  const { headers, ...rest } = next;
  const out = { ...merged, ...rest };
  let nextHeaders = mergedHeaders;
  if (headers !== undefined) {
    nextHeaders ??= new Headers();
    appendHeaders(nextHeaders, headers as HeadersInput);
  }
  return { defaults: out, headers: nextHeaders };
}

/**
 * @name composePlugins
 * @category Fetch
 * @description Flattens plugin defaults and hook arrays into a single shape suitable
 * for long-lived storage on a fetch instance. Runs exactly once per createFetch call.
 *
 * Ordering: plugin defaults (in declaration order) → user defaults (user wins).
 * Headers are merged independently through a single Headers instance.
 *
 * @since 0.1.0
 */
export function composePlugins(
  plugins: readonly FetchPlugin[] | undefined,
  userDefaults: FetchOptions | undefined,
): ComposedPlugins {
  // Fast path — no plugins: avoid allocating hook arrays and header instances
  if (plugins === undefined || plugins.length === 0) {
    return {
      defaults: userDefaults ?? {},
      hooks: EMPTY_HOOKS,
      execute: undefined,
    };
  }

  let defaults: FetchOptions = {};
  let headers: Headers | undefined;

  const onRequest: FetchHook[] = [];
  const onRequestError: FetchHook[] = [];
  const onResponse: FetchHook[] = [];
  const onResponseError: FetchHook[] = [];
  const executes: FetchExecuteMiddleware[] = [];

  for (let i = 0; i < plugins.length; i++) {
    const plugin = plugins[i]!;

    if (plugin.defaults !== undefined) {
      const merged = applyDefaults(defaults, headers, plugin.defaults);
      defaults = merged.defaults;
      headers = merged.headers;
    }

    if (plugin.hooks !== undefined) {
      const hooks: FetchHooks = plugin.hooks;
      pushHook(onRequest, hooks.onRequest as FetchHook | readonly FetchHook[] | undefined);
      pushHook(onRequestError, hooks.onRequestError as FetchHook | readonly FetchHook[] | undefined);
      pushHook(onResponse, hooks.onResponse as FetchHook | readonly FetchHook[] | undefined);
      pushHook(onResponseError, hooks.onResponseError as FetchHook | readonly FetchHook[] | undefined);
    }

    if (plugin.execute !== undefined) {
      executes.push(plugin.execute);
    }
  }

  if (userDefaults !== undefined) {
    const merged = applyDefaults(defaults, headers, userDefaults);
    defaults = merged.defaults;
    headers = merged.headers;
  }

  if (headers !== undefined) {
    defaults = { ...defaults, headers };
  }

  // Invoke setup AFTER defaults are fully merged, so plugins observe the final shape
  for (let i = 0; i < plugins.length; i++) {
    plugins[i]!.setup?.({ defaults });
  }

  return {
    defaults,
    hooks: {
      onRequest: onRequest.length > 0 ? onRequest : undefined,
      onRequestError: onRequestError.length > 0 ? onRequestError : undefined,
      onResponse: onResponse.length > 0 ? onResponse : undefined,
      onResponseError: onResponseError.length > 0 ? onResponseError : undefined,
    },
    execute: executes.length === 0
      ? undefined
      : executes.length === 1
        ? executes[0]
        : composeExecute(executes),
  };
}

/**
 * Classic onion composition — dispatch(i) invokes middleware i or, past the end,
 * delegates to the supplied `next`. Middlewares MAY call next() multiple times
 * (retry-style) — the dispatcher is re-entrant.
 */
function composeExecute(middlewares: readonly FetchExecuteMiddleware[]): FetchExecuteMiddleware {
  return (context, next) => {
    const dispatch = (i: number): Promise<void> => {
      const mw = middlewares[i];
      if (mw === undefined) return next();
      return mw(context, () => dispatch(i + 1));
    };
    return dispatch(0);
  };
}

// ---------------------------------------------------------------------------
// runHookPhase — dispatches instance hooks then optional per-request hook(s)
// ---------------------------------------------------------------------------

/**
 * @name runHookPhase
 * @category Fetch
 * @description Runs all instance-level (plugin) hooks for a single phase, then the
 * optional user per-request hook(s). Avoids allocating an intermediate array per call.
 *
 * @since 0.1.0
 */
export async function runHookPhase<C>(
  instance: ReadonlyArray<FetchHook<C>> | undefined,
  user: FetchHook<C> | ReadonlyArray<FetchHook<C>> | undefined,
  context: C,
): Promise<void> {
  if (instance !== undefined) {
    for (let i = 0; i < instance.length; i++) {
      await instance[i]!(context);
    }
  }

  if (user === undefined) return;

  if (typeof user === 'function') {
    await user(context);
    return;
  }

  for (let i = 0; i < user.length; i++) {
    await user[i]!(context);
  }
}
