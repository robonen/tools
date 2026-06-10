import { computed, nextTick, ref, shallowRef, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref, ShallowRef, UnwrapRef } from 'vue';
import { SyncMutex, isFunction } from '@robonen/stdlib';
import {
  decodeCookieValue,
  encodeCookieName,
  encodeCookieValue,
  getCookieValue,
  serializeCookie,
} from '@robonen/platform/browsers';
import type { CookieAttributes } from '@robonen/platform/browsers';
import type { ConfigurableDocument, ConfigurableFlush, ConfigurableWindow } from '@/types';
import { defaultDocument, defaultWindow } from '@/types';
import type { ConfigurableEventFilter, EventFilter } from '@/utils/filters';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';
import { guessSerializer, shallowMerge } from '../useStorage';
import type { StorageSerializer } from '../useStorage';

// CookieAttributes is part of this module's public contract (options extend
// it, CookieStorageLike methods receive it) — re-export it so adapter authors
// don't need a direct dependency on @robonen/platform.
export type { CookieAttributes } from '@robonen/platform/browsers';

/**
 * A cookie backend the composable depends on — never on a concrete API.
 * Names are raw (unencoded); values are already encoded cookie values.
 * Methods may be sync or async, so an implementation can sit on the Cookie
 * Store API, `document.cookie`, or a server request context (e.g. a Nuxt
 * adapter reading request cookies and appending `Set-Cookie` headers).
 */
export interface CookieStorageLike {
  /**
   * Read the raw (encoded) cookie value, `null` when absent.
   */
  getItem: (name: string) => string | null | Promise<string | null>;
  /**
   * Write the raw value. Attributes carry the cookie's scope and lifetime.
   */
  setItem: (name: string, value: string, attributes: CookieAttributes) => void | Promise<void>;
  /**
   * Delete the cookie. Attributes carry the identity (`path`/`domain`) the
   * deletion must repeat to match.
   */
  removeItem: (name: string, attributes: CookieAttributes) => void | Promise<void>;
  /**
   * Optional: observe changes of the given cookie (other tabs, server
   * `Set-Cookie` responses, other instances). The callback receives the new
   * raw value (`null` = deleted). Returns an unsubscribe function.
   */
  onChange?: (name: string, callback: (newValue: string | null) => void) => () => void;
  /**
   * Whether `onChange` also reports this context's own writes (e.g. the
   * Cookie Store API `change` event does, a BroadcastChannel does not). The
   * composable uses this to know when an own write will come back as a
   * notification that must be swallowed instead of re-applied.
   * @default true
   */
  readonly echoesOwnWrites?: boolean;
}

export const customCookieEventName = 'vuetools-cookie';

/**
 * Detail of the {@link customCookieEventName} CustomEvent the
 * `document.cookie` adapter dispatches on `window` after every write, for
 * same-tab sync in environments without the Cookie Store API and without
 * BroadcastChannel. The same string also names the adapter's BroadcastChannel.
 */
export interface CookieChangeLike {
  /**
   * The raw (unencoded) cookie name.
   */
  name: string;
  /**
   * The encoded cookie value, `null` for a deletion.
   */
  newValue: string | null;
}

function cookieStoreExpires(attributes: CookieAttributes): number | null {
  if (attributes.maxAge !== undefined)
    return Date.now() + attributes.maxAge * 1000;
  if (attributes.expires !== undefined)
    return attributes.expires instanceof Date ? attributes.expires.getTime() : attributes.expires;

  return null;
}

/**
 * @name createCookieStoreAdapter
 * @category Storage
 * @description {@link CookieStorageLike} adapter over the
 * [Cookie Store API](https://developer.mozilla.org/en-US/docs/Web/API/Cookie_Store_API):
 * async reads/writes plus a `change`-event subscription that observes other
 * tabs, server `Set-Cookie` responses, and expiry. The API can only write
 * `Secure` cookies, so `secure: false` is rejected — use
 * {@link createDocumentCookieAdapter} for that.
 *
 * @param {CookieStore} cookieStore The `window.cookieStore` instance to wrap
 * @returns {CookieStorageLike} The adapter
 *
 * @example
 * const store = createCookieStoreAdapter(window.cookieStore);
 *
 * @since 0.0.14
 */
export function createCookieStoreAdapter(cookieStore: CookieStore): CookieStorageLike {
  return {
    // The change event fires for this document's own writes too
    echoesOwnWrites: true,
    getItem(name) {
      return cookieStore.get(encodeCookieName(name)).then(item => item?.value ?? null);
    },
    async setItem(name, value, attributes) {
      if (attributes.secure === false)
        throw new TypeError('[useCookie] the Cookie Store API can only write Secure cookies — use the document.cookie adapter for secure: false');

      await cookieStore.set({
        name: encodeCookieName(name),
        value,
        expires: cookieStoreExpires(attributes),
        domain: attributes.domain ?? null,
        path: attributes.path ?? '/',
        sameSite: attributes.sameSite ?? 'lax',
        partitioned: attributes.partitioned ?? false,
      });
    },
    async removeItem(name, attributes) {
      await cookieStore.delete({
        name: encodeCookieName(name),
        domain: attributes.domain ?? null,
        path: attributes.path ?? '/',
        partitioned: attributes.partitioned ?? false,
      });
    },
    onChange(name, callback) {
      const encodedName = encodeCookieName(name);

      const handler = (event: Event) => {
        const { changed, deleted } = event as CookieChangeEvent;

        for (const item of deleted) {
          if (item.name === encodedName)
            return callback(null);
        }

        for (const item of changed) {
          if (item.name === encodedName)
            return callback(item.value ?? '');
        }
      };

      cookieStore.addEventListener('change', handler);

      return () => cookieStore.removeEventListener('change', handler);
    },
  };
}

export interface DocumentCookieAdapterOptions extends ConfigurableWindow {}

/**
 * @name createDocumentCookieAdapter
 * @category Storage
 * @description {@link CookieStorageLike} adapter over `document.cookie`:
 * synchronous reads/writes that work in every browser and can express
 * non-`Secure` cookies. Changes are observed through the Cookie Store API
 * `change` event when the browser has one (covering other tabs, server
 * responses, and expiry even though writes stay on `document.cookie`);
 * otherwise every write pings a BroadcastChannel by cookie name and receivers
 * re-read their own `document.cookie` (same-tab and cross-tab, ordering-proof
 * since no value travels), with a same-tab CustomEvent as the last resort.
 * Without the Cookie Store API, changes made outside the adapter (server
 * `Set-Cookie`, other libraries) are not observed.
 *
 * @param {Document} document The document whose cookies to read/write
 * @param {DocumentCookieAdapterOptions} [options={}] Options (`window`)
 * @returns {CookieStorageLike} The adapter
 *
 * @example
 * const store = createDocumentCookieAdapter(document);
 *
 * @since 0.0.14
 */
export function createDocumentCookieAdapter(document: Document, options: DocumentCookieAdapterOptions = {}): CookieStorageLike {
  const { window = defaultWindow } = options;
  const cookieStore = window?.cookieStore;
  const supportsBroadcast = typeof BroadcastChannel !== 'undefined';

  function read(name: string): string | null {
    return getCookieValue(document.cookie, name, value => value);
  }

  // One lazy channel per adapter, shared by posts and subscriptions — the
  // posting channel object never receives its own messages, which is exactly
  // the echo-free behavior the composable expects (echoesOwnWrites: false).
  let channel: BroadcastChannel | undefined;
  let subscribers = 0;

  function broadcastChannel(): BroadcastChannel {
    if (!channel) {
      channel = new BroadcastChannel(customCookieEventName);
      // Node's BroadcastChannel holds the event loop open — release it (no-op in browsers)
      (channel as { unref?: () => void }).unref?.();
    }

    return channel;
  }

  function notify(name: string, newValue: string | null) {
    // The Cookie Store API observes document.cookie writes by itself.
    if (cookieStore)
      return;

    if (supportsBroadcast) {
      // Ping by name only — receivers re-read their own document.cookie, so a
      // late or reordered message can never apply a stale value.
      broadcastChannel().postMessage(name);
      return;
    }

    window?.dispatchEvent(new CustomEvent<CookieChangeLike>(customCookieEventName, {
      detail: { name, newValue },
    }));
  }

  return {
    // Own document.cookie writes echo back only through paths that observe
    // the cookie jar itself (Cookie Store API) or the same window (CustomEvent);
    // BroadcastChannel posts never return to the posting adapter.
    echoesOwnWrites: !!cookieStore || (!supportsBroadcast && !!window),
    getItem: read,
    setItem(name, value, attributes) {
      document.cookie = serializeCookie(encodeCookieName(name), value, attributes);
      notify(name, value);
    },
    removeItem(name, attributes) {
      // Deletion must repeat the identity attributes (path/domain) or it
      // silently misses the cookie it is meant to remove.
      document.cookie = serializeCookie(encodeCookieName(name), '', { ...attributes, maxAge: 0, expires: 0 });
      notify(name, null);
    },
    onChange(name, callback) {
      let teardown: () => void;

      // The Cookie Store API observes document.cookie writes too — prefer its
      // change event, which also covers other tabs and server responses.
      if (cookieStore) {
        const encodedName = encodeCookieName(name);

        const handler = (event: Event) => {
          const { changed, deleted } = event as CookieChangeEvent;

          for (const item of deleted) {
            if (item.name === encodedName)
              return callback(null);
          }

          for (const item of changed) {
            if (item.name === encodedName)
              return callback(item.value ?? '');
          }
        };

        cookieStore.addEventListener('change', handler);
        teardown = () => cookieStore.removeEventListener('change', handler);
      }
      else if (supportsBroadcast) {
        const handler = (event: MessageEvent) => {
          if (event.data === name)
            callback(read(name));
        };

        const bc = broadcastChannel();
        subscribers++;
        bc.addEventListener('message', handler);

        teardown = () => {
          bc.removeEventListener('message', handler);

          // Close the channel with the last subscriber; posts reopen it lazily
          if (--subscribers === 0 && channel) {
            channel.close();
            channel = undefined;
          }
        };
      }
      else {
        const handler = (event: Event) => {
          const detail = (event as CustomEvent<CookieChangeLike>).detail;

          if (detail.name === name)
            callback(detail.newValue);
        };

        window?.addEventListener(customCookieEventName, handler);
        teardown = () => window?.removeEventListener(customCookieEventName, handler);
      }

      return () => teardown();
    },
  };
}

export interface UseCookieOptions<T, Shallow extends boolean = true>
  extends CookieAttributes, ConfigurableWindow, ConfigurableDocument, ConfigurableFlush, ConfigurableEventFilter {
  /**
   * The cookie backend. Defaults to {@link createCookieStoreAdapter} when the
   * browser has the Cookie Store API (unless `secure: false`),
   * {@link createDocumentCookieAdapter} otherwise. Pass a custom
   * implementation to integrate a framework's cookie context (e.g. Nuxt) so
   * the composable also works during SSR.
   */
  store?: CookieStorageLike;
  /**
   * Use shallowRef instead of ref for the internal state
   * @default true
   */
  shallow?: Shallow;
  /**
   * Watch for deep changes
   * @default true
   */
  deep?: boolean;
  /**
   * Listen to cookie changes through the store's `onChange` subscription
   * @default true
   */
  listenToStorageChanges?: boolean;
  /**
   * Write the default value to the cookie when it does not exist
   * @default true
   */
  writeDefaults?: boolean;
  /**
   * Merge the default value with the stored value
   * @default false
   */
  mergeDefaults?: boolean | ((stored: T, defaults: T) => T);
  /**
   * Custom serializer for reading/writing the cookie value
   */
  serializer?: StorageSerializer<T>;
  /**
   * Encodes the serialized string into an RFC 6265-safe cookie value
   * @default encodeCookieValue
   */
  encode?: (value: string) => string;
  /**
   * Decodes a raw cookie value before deserialization
   * @default decodeCookieValue
   */
  decode?: (value: string) => string;
  /**
   * Called once when the initial value has been loaded from the cookie
   */
  onReady?: (value: T) => void;
  /**
   * Error handler for read/write failures
   */
  onError?: (error: unknown) => void;
  /**
   * Wait for the component to be mounted before reading the cookie
   *
   * Useful for SSR hydration to prevent mismatch
   * @default false
   */
  initOnMounted?: boolean;
}

export interface UseCookieReturnBase<T, Shallow extends boolean> {
  state: Shallow extends true ? ShallowRef<T> : Ref<UnwrapRef<T>>;
  isReady: Ref<boolean>;
}

export type UseCookieReturn<T, Shallow extends boolean>
  = & UseCookieReturnBase<T, Shallow>
    & PromiseLike<UseCookieReturnBase<T, Shallow>>;

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return !!value && isFunction((value as { then?: unknown }).then);
}

/**
 * @name useCookie
 * @category Storage
 * @description Reactive cookie binding — creates a ref synced with a cookie
 * through a pluggable {@link CookieStorageLike} backend. By default that is
 * the [Cookie Store API](https://developer.mozilla.org/en-US/docs/Web/API/Cookie_Store_API)
 * when the browser supports it (async, with `change`-event sync across tabs
 * and server `Set-Cookie` responses) and `document.cookie` otherwise
 * (synchronous, BroadcastChannel same-tab/cross-tab sync); pass a custom
 * `store` to run on top of a framework's cookie context (e.g. Nuxt)
 * including during SSR. Setting the state to `null` deletes the cookie. Cookie
 * attributes (`path`, `domain`, `maxAge`/`expires`, `secure`, `sameSite`,
 * `partitioned`) apply to every write; `secure` defaults to the page's
 * secure-context status, and an explicit `secure: false` selects the
 * `document.cookie` adapter since the Cookie Store API can only write
 * `Secure` cookies.
 *
 * @param {MaybeRefOrGetter<string>} name The cookie name (can be reactive)
 * @param {MaybeRefOrGetter<T>} initialValue The initial/default value
 * @param {UseCookieOptions<T>} [options={}] Options
 * @returns {UseCookieReturn<T, Shallow>} An object with state ref and isReady flag, also awaitable
 *
 * @example
 * const { state: theme } = useCookie('theme', 'system');
 *
 * @example
 * const { state: session } = await useCookie('session', '', { maxAge: 3600, sameSite: 'strict' });
 *
 * @example
 * // Nuxt (h3) integration: bridge the SSR request so the same call works on
 * // the server (reads the request's Cookie header, writes Set-Cookie response
 * // headers) and falls back to the built-in browser adapters on the client.
 * // ~/composables/createNuxtCookieAdapter.ts
 * import { deleteCookie, getRequestHeader, setCookie } from 'h3';
 * import { getCookieValue } from '@robonen/platform/browsers';
 * import type { CookieStorageLike } from '@robonen/vue';
 *
 * export function createNuxtCookieAdapter(): CookieStorageLike | undefined {
 *   if (import.meta.client)
 *     return undefined; // browser: the default adapters take over
 *
 *   const event = useRequestEvent()!;
 *   // Set-Cookie does not update the incoming Cookie header, so reads must
 *   // overlay this request's own writes (same trick Nuxt's useCookie uses)
 *   const written = new Map<string, string | null>();
 *
 *   return {
 *     getItem(name) {
 *       if (written.has(name))
 *         return written.get(name)!;
 *
 *       // identity decode — the composable owns decoding of raw values
 *       return getCookieValue(getRequestHeader(event, 'cookie') ?? '', name, raw => raw);
 *     },
 *     setItem(name, value, attributes) {
 *       written.set(name, value);
 *       setCookie(event, name, value, {
 *         path: attributes.path,
 *         domain: attributes.domain,
 *         maxAge: attributes.maxAge,
 *         expires: typeof attributes.expires === 'number' ? new Date(attributes.expires) : attributes.expires,
 *         secure: attributes.secure,
 *         sameSite: attributes.sameSite,
 *         partitioned: attributes.partitioned,
 *         encode: raw => raw, // value arrives already encoded
 *       });
 *     },
 *     removeItem(name, attributes) {
 *       written.set(name, null);
 *       // deletion must repeat the identity attributes to match the cookie
 *       deleteCookie(event, name, { path: attributes.path, domain: attributes.domain });
 *     },
 *     // no onChange: a server request has no cookie change events
 *   };
 * }
 *
 * // anywhere in the app — works during SSR and in the browser
 * const { state: locale } = useCookie('locale', 'en', { store: createNuxtCookieAdapter() });
 *
 * @since 0.0.14
 */
export function useCookie<T extends string, Shallow extends boolean = true>(name: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, options?: UseCookieOptions<T, Shallow>): UseCookieReturn<T, Shallow>;
export function useCookie<T extends number, Shallow extends boolean = true>(name: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, options?: UseCookieOptions<T, Shallow>): UseCookieReturn<T, Shallow>;
export function useCookie<T extends boolean, Shallow extends boolean = true>(name: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, options?: UseCookieOptions<T, Shallow>): UseCookieReturn<T, Shallow>;
export function useCookie<T, Shallow extends boolean = true>(name: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<T>, options?: UseCookieOptions<T, Shallow>): UseCookieReturn<T, Shallow>;
export function useCookie<T = unknown, Shallow extends boolean = true>(name: MaybeRefOrGetter<string>, initialValue: MaybeRefOrGetter<null>, options?: UseCookieOptions<T, Shallow>): UseCookieReturn<T, Shallow>;
export function useCookie<T, Shallow extends boolean = true>(
  name: MaybeRefOrGetter<string>,
  initialValue: MaybeRefOrGetter<T>,
  options: UseCookieOptions<T, Shallow> = {},
): UseCookieReturn<T, Shallow> {
  const {
    path = '/',
    domain,
    maxAge,
    expires,
    sameSite = 'lax',
    partitioned = false,
    shallow = true,
    deep = true,
    flush = 'pre',
    listenToStorageChanges = true,
    writeDefaults = true,
    mergeDefaults = false,
    encode = encodeCookieValue,
    decode = decodeCookieValue,
    eventFilter,
    initOnMounted = false,
    onReady,
    onError = console.error, // eslint-disable-line no-console
    window = defaultWindow,
    document = defaultDocument,
  } = options;

  // The Cookie Store API can only write `Secure` cookies, so when it backs the
  // default store the default must be true; an explicit `secure: false`
  // selects the document.cookie adapter instead.
  const secure = options.secure ?? (window?.cookieStore ? true : window?.isSecureContext ?? false);

  const store = options.store ?? (
    window?.cookieStore && secure
      ? createCookieStoreAdapter(window.cookieStore)
      : document
        ? createDocumentCookieAdapter(document, { window })
        : undefined
  );

  const attributes: CookieAttributes = { path, domain, maxAge, expires, secure, sameSite, partitioned };

  const defaults = toValue(initialValue);
  const serializer = options.serializer ?? guessSerializer(defaults);

  const state = (shallow ? shallowRef : ref)(defaults) as Shallow extends true ? ShallowRef<T> : Ref<UnwrapRef<T>>;
  const isReady = ref(false);
  const rawName = computed(() => toValue(name));

  const shell: UseCookieReturnBase<T, Shallow> = {
    state,
    isReady,
  };

  // No backend at all (SSR without a custom store): a plain in-memory ref,
  // immediately ready.
  if (!store) {
    isReady.value = true;

    return {
      ...shell,
      // eslint-disable-next-line unicorn/no-thenable
      then(onFulfilled, onRejected) {
        return Promise.resolve(shell).then(onFulfilled, onRejected);
      },
    };
  }

  function toRaw(value: T): string | null {
    return value === undefined || value === null ? null : encode(serializer.write(value));
  }

  function fromRaw(raw: string | null, merge: boolean): T {
    if (raw === null)
      return defaults;

    const value = serializer.read(decode(raw));

    if (merge && mergeDefaults) {
      return isFunction(mergeDefaults)
        ? mergeDefaults(value, defaults)
        : shallowMerge(value, defaults);
    }

    return value;
  }

  // The raw value the cookie is known to hold (last read, observed, or
  // written) — lets writes skip no-ops without a read-before-write roundtrip.
  let knownRaw: string | null | undefined;

  // Raw values of own in-flight writes — only for stores whose onChange
  // reports our own writes back (echoesOwnWrites): during rapid queued writes
  // a stale own echo must not bounce back into the state and clobber a newer
  // value. Echo-free stores (BroadcastChannel) never need this.
  const selfEchoes: Array<string | null> = [];
  const observesChanges = listenToStorageChanges && !!store.onChange;
  const tracksEchoes = observesChanges && store.echoesOwnWrites !== false;

  // Bumped on every reactive name switch: in-flight writes finish against
  // their snapshotted name without touching the new name's bookkeeping.
  let nameEpoch = 0;

  // The name writes target. Updated ONLY by the name watcher — by watcher
  // flush time the rawName computed already reflects a same-tick name change,
  // so a write enqueued in that flush would otherwise land on the new cookie.
  let currentName = rawName.value;

  // Writes still queued or in flight. Foreign change notifications arriving
  // while > 0 are ordering-ambiguous and are deferred to a reconciling
  // re-read once the queue drains.
  let pendingWrites = 0;
  let needsReconcile = false;

  // FIFO write queue: keeps rapid writes ordered even when the backend
  // resolves them out of order, and serializes delete-after-set.
  let writeQueue: Promise<void> = Promise.resolve();

  function queueWrite(value: T, onlyIfAbsent = false) {
    // Snapshot the target: a write enqueued before a name switch must land on
    // the cookie it was meant for, never on the new name.
    const epoch = nameEpoch;
    const target = currentName;

    pendingWrites++;

    writeQueue = writeQueue.then(async () => {
      // A defaults write re-checks at execution time: another instance (or
      // tab) may have persisted a value since this was enqueued, and writing
      // the defaults over it would stomp that newer value.
      if (onlyIfAbsent) {
        const existing = await store!.getItem(target);

        if (existing !== undefined && existing !== null) {
          needsReconcile = true;
          return;
        }
      }

      const raw = toRaw(value);

      // The no-op skip and all bookkeeping belong to the current name only
      const current = () => epoch === nameEpoch;

      if (current() && raw === knownRaw)
        return;

      // Push before the write: a synchronous backend notifies during it.
      const trackEcho = tracksEchoes && current();

      if (trackEcho)
        selfEchoes.push(raw);

      try {
        if (raw === null)
          await store!.removeItem(target, attributes);
        else
          await store!.setItem(target, raw, attributes);

        if (current())
          knownRaw = raw;
      }
      catch (error) {
        if (trackEcho) {
          const index = selfEchoes.indexOf(raw);

          if (index !== -1)
            selfEchoes.splice(index, 1);
        }

        throw error;
      }
    }).catch(onError).then(() => {
      pendingWrites--;
      maybeReconcile();
    });
  }

  // Resolve a change deferred by in-flight writes: re-read the source of
  // truth once instead of trusting possibly-reordered notifications.
  function maybeReconcile() {
    if (pendingWrites > 0 || !needsReconcile)
      return;

    needsReconcile = false;

    const epoch = nameEpoch;
    const stamp = changeStamp;

    Promise.resolve(store!.getItem(rawName.value)).then((raw) => {
      // A name switch or a newer external change supersedes this snapshot
      if (epoch !== nameEpoch || stamp !== changeStamp)
        return;

      // Any echoes still inbound are indistinguishable from the re-read truth
      selfEchoes.length = 0;
      applyExternal(raw);
    }).catch(onError);
  }

  // Apply event filter if provided
  const writeWithFilter: (value: T) => void = eventFilter
    ? (value: T) => (eventFilter as EventFilter)(() => queueWrite(value))
    : queueWrite;

  // Write-lock prevents the state watcher from writing back when state is
  // updated programmatically (initial/external reads, name changes). Released
  // via nextTick so it persists through the pre-flush watcher cycle.
  const writeLock = new SyncMutex();

  function lockWritesUntilFlush() {
    writeLock.lock();
    nextTick(() => writeLock.unlock());
  }

  // The defaults never change, so their raw form is computed once and lazily —
  // external deletes compare against it without re-serializing.
  let defaultsRawCache: string | null | undefined;

  function defaultsRaw(): string | null {
    if (defaultsRawCache === undefined)
      defaultsRawCache = toRaw(defaults);

    return defaultsRawCache;
  }

  // Bumped when an external change lands in the state — an async snapshot
  // read (init, name switch, reconcile) that started earlier compares stamps
  // so it never clobbers the newer value.
  let changeStamp = 0;

  function applyExternal(raw: string | null) {
    // The known value re-seen (an echo of an observed write, a redundant
    // notification) — and while an own write is in flight, knownRaw lags the
    // state on purpose, so this also drops events that would clobber it.
    if (raw === knownRaw)
      return;

    knownRaw = raw;

    try {
      // Compare serialized forms so an external delete while the state already
      // equals the defaults is a no-op; deserialize only on a real change.
      const incomingRaw = raw === null ? defaultsRaw() : raw;

      if (incomingRaw === toRaw(state.value as T))
        return;

      changeStamp++;
      lockWritesUntilFlush();
      (state as Ref).value = fromRaw(raw, false);
    }
    catch (error) {
      onError(error);
    }
  }

  let firstMounted = false;
  const skipUntilMounted = () => initOnMounted && !firstMounted;

  function handleChange(newValue: string | null) {
    if (skipUntilMounted())
      return;

    const echoIndex = selfEchoes.indexOf(newValue);

    if (echoIndex !== -1) {
      selfEchoes.splice(echoIndex, 1);
      // A foreign change deferred behind this echo may be ready to resolve now
      maybeReconcile();
      return;
    }

    // A foreign change interleaved with own in-flight writes (queued, or
    // committed with echoes still inbound) is ordering-ambiguous: applying it
    // could revert a newer own value. Defer to one reconciling re-read.
    if (pendingWrites > 0 || selfEchoes.length > 0) {
      needsReconcile = true;
      return;
    }

    applyExternal(newValue);
  }

  // The change subscription is name-bound, so a reactive name change
  // resubscribes (see the name watcher in finishInit)
  let unsubscribe: (() => void) | undefined;

  function subscribe() {
    unsubscribe?.();
    unsubscribe = observesChanges ? store!.onChange!(rawName.value, handleChange) : undefined;
  }

  subscribe();

  let stopWatch: (() => void) | undefined;
  let stopNameWatch: (() => void) | undefined;
  let disposed = false;

  tryOnScopeDispose(() => {
    disposed = true;
    unsubscribe?.();
    stopWatch?.();
    stopNameWatch?.();
  });

  function applyRead(raw: string | null, stamp: number) {
    // An external change applied while this snapshot read was in flight is
    // fresher than the snapshot — keep it.
    if (stamp !== changeStamp)
      return;

    knownRaw = raw;

    if (raw === null && writeDefaults && defaults !== undefined && defaults !== null)
      queueWrite(defaults as T, true);

    lockWritesUntilFlush();
    (state as Ref).value = fromRaw(raw, true);
  }

  function finishInit() {
    // The scope died before the async init resolved — leave no watchers behind
    if (disposed)
      return;

    isReady.value = true;
    onReady?.(state.value as T);

    // Set up watchers AFTER initial state is set — avoids write-back on init
    stopWatch = watch(state, (newValue) => {
      if (writeLock.isLocked)
        return;

      writeWithFilter(newValue as T);
    }, { flush, deep });

    // Watch for reactive name changes
    stopNameWatch = watch(rawName, () => {
      nameEpoch++;
      currentName = rawName.value;
      selfEchoes.length = 0;
      needsReconcile = false;
      subscribe();

      const stamp = changeStamp;

      Promise.resolve(store!.getItem(rawName.value))
        .then(raw => applyRead(raw, stamp))
        .catch(onError);
    }, { flush });
  }

  function performInit(): Promise<UseCookieReturnBase<T, Shallow>> | UseCookieReturnBase<T, Shallow> {
    const stamp = changeStamp;
    const raw = store!.getItem(rawName.value);

    // A synchronous backend (document.cookie, a server request context)
    // initializes synchronously — state is correct right after the call.
    if (isThenable(raw)) {
      return Promise.resolve(raw)
        .then(resolved => applyRead(resolved, stamp))
        .catch(onError)
        .then(() => {
          finishInit();
          return shell;
        });
    }

    try {
      applyRead(raw, stamp);
    }
    catch (error) {
      onError(error);
    }

    finishInit();

    return shell;
  }

  let readyPromise: Promise<UseCookieReturnBase<T, Shallow>>;

  if (initOnMounted) {
    readyPromise = new Promise<UseCookieReturnBase<T, Shallow>>((resolve) => {
      tryOnMounted(() => {
        firstMounted = true;
        resolve(performInit());
      });
    });
  }
  else {
    readyPromise = Promise.resolve(performInit());
  }

  return {
    ...shell,
    // eslint-disable-next-line unicorn/no-thenable
    then(onFulfilled, onRejected) {
      return readyPromise.then(onFulfilled, onRejected);
    },
  };
}
