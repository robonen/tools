# Notification System Architecture

WebSocket-driven, type- and priority-aware notifications for the `@robonen` monorepo.

> Status: **design proposal** (not yet implemented). Synthesized from a multi-agent design
> pass and adversarially verified against the real repo APIs. The "Verified facts" call-outs
> below are confirmed against source; the corrections from review are already folded into the
> code in this document.

---

## 0. Context — what already exists

The **presentation layer already exists**: a full sonner-style headless toast primitive lives at
[vue/primitives/src/toast/](../../vue/primitives/src/toast/) — `ToastProvider`, `ToastRoot`,
`ToastViewport`, `ToastTitle/Description/Action/Close/Announce/Portal`, with per-toast auto-dismiss
(pause/resume RAF timer), swipe-to-dismiss, teleport-to-viewport, a11y live-region announce,
collection-based stacking, and controlled/uncontrolled `v-model:open`. **We drive it, we do not
fork it.**

The data-layer building blocks also exist and are reused verbatim:

| Need | Reuse | Path |
|---|---|---|
| Bounded priority heap | `PriorityQueue` (min-heap) | `core/stdlib/src/structs/PriorityQueue` |
| Bounded FIFO/reorder | `Deque` | `core/stdlib/src/structs/Deque` |
| Concurrency-limited drain | `AsyncPool` | `core/stdlib/src/async/pool` |
| Connection state machine | `createAsyncMachine` | `core/stdlib/src/patterns/behavioral/StateMachine/async` |
| Plugin/middleware model | `composePlugins` / `definePlugin` | `core/fetch/src/plugin.ts` |
| In-process events | `createEventHook` | `vue/toolkit` |
| Reactive cross-tab storage | `useStorage` (write-lock + storage events) | `vue/toolkit` |
| Online/offline | `useNetwork` | `vue/toolkit` |
| Tab leader (Web Locks) | `useTabLeader` | `vue/toolkit` |
| Cross-tab ref (BroadcastChannel) | `broadcastedRef` | `vue/toolkit` |
| Typed provide/inject | `useContextFactory` | `vue/toolkit` |
| Disposable singleton | `createSharedComposable` | `vue/toolkit` |
| App-lifetime singleton | `useAppSharedState` | `vue/toolkit` |
| Causal-ordering reference | `Replica` (Lamport/version-vector) | `core/crdt/src/doc/replica.ts` |

**There is no WebSocket / SSE / streaming code anywhere** — the transport is greenfield.

---

## 1. TL;DR & key decisions

A **four-layer, transport-agnostic** system:

1. **L1 `core/realtime`** (greenfield, framework-free) owns the socket: a `createAsyncMachine`
   lifecycle, a `core/fetch`-cloned plugin/middleware pipeline, full-jitter reconnect *gated* on
   `useNetwork`, a heartbeat watchdog cleared by *any* inbound frame, a scalar resume cursor that
   advances **only on contiguous delivery**, a `Deque`+`AsyncPool` outbound queue with a shared
   `AbortSignal`, and a swappable `Transport` interface shipped with **both** WebSocket and SSE.
2. **L2 `ingest()`** — a single pure funnel that validates *every* notification (WS-pushed and
   locally-issued `notify()`/`toast.*` alike) through the **type registry**, producing a normalized
   `Notification` entity.
3. **L3 domain store** — inbox via `useAppSharedState`, socket-owning client via
   `createSharedComposable`; a `shallowRef<Map>` + version-counter with a synchronous pure-reducer
   lifecycle, two-key (id + contentHash) dedup, a small **surfacing-budget `PriorityQueue`** distinct
   from a large **durable-capacity `Deque`**, derived selectors, optimistic actions with
   token-correlated ack/rollback, and `useStorage` cross-tab sync where `commit()` structurally
   separates *ingest-commit* (may toast) from *hydration-commit* (never toasts).
4. **L4 presentation** — a `<Toaster>` that drives the existing toast primitive (`v-for` over the
   bounded toast slice) plus a headless `<NotificationCenter>`, both reusing **one** per-type renderer
   via a `surface: 'toast' | 'inbox'` prop.

| Decision | Choice | Why |
|---|---|---|
| Transport home | greenfield `core/realtime` (no Vue import) | Framework-free → trivially SSR-excluded, headless-testable, mirrors the `core/fetch` boundary. Thin `useRealtime` wrapper in `vue/toolkit`. |
| Connection lifecycle | one `createAsyncMachine` instance | Genuine async side-effects per transition. `NET_OFFLINE`/`NET_ONLINE` are first-class events that **pause** retry scheduling. |
| Entity lifecycle | synchronous **pure reducer** + legal-edge table | `createAsyncMachine.send` is async + per-instance stateful; hundreds of entities each with async hot-path transitions is wrong. |
| Plugin system | cloned **1:1** from `core/fetch` (`execute` field, `composeRealtimePlugins(plugins, userDefaults)`, `setup({defaults})`) | Team knows the model; preserves `EMPTY_HOOKS` fast path. **Do not rename `execute`→`transform`.** |
| Resume cursor | scalar `seq`, advances **only on contiguous delivery** | Single-writer stream collapses the version-vector to one scalar. Advancing on a gapped/buffered frame silently skips messages on next resume. |
| Reorder | bounded `Deque` + **gap-timeout** flush | Strict in-order release head-of-line-stalls the stream on permanent loss; the timeout trades completeness for liveness + triggers server reconciliation. |
| Dedup | **two keys**: server `id` + `contentHash` (FNV-1a) | id makes at-least-once idempotent; contentHash folds retransmits + identical-content distinct-id events into `meta.count` for `+N more`. |
| Capacity | **two** independent bounds | Tiny surfacing budget `PriorityQueue` (~3) vs large durable `Deque` (~300). Conflating them spams toasts or drops history. |
| `PriorityQueue` orientation | **min-heap victim comparator** + separate display sort | `enqueue` **throws `RangeError`** when full; `peek()`/`dequeue()` return the comparator **minimum**. The PQ comparator makes the *eviction victim* the minimum; the viewport order is a **separate** explicit sort. |
| Store singleton | inbox+registry via `useAppSharedState`; socket via `createSharedComposable` | `createSharedComposable` **drops constructor args after first call** → never wrap an options-taking store in it. Socket must dispose on last unmount + be raw-on-SSR. |
| Cross-tab no-re-toast | `commit()` separates ingest-commit vs hydration-commit; per-tab **non-persisted** `toastedIds` Set | Correct without leader election. `useEventBus` is **same-document only** and cannot dedup across tabs. |
| Leader (optional) | existing **`useTabLeader`** (Web Locks) + **`broadcastedRef`** fan-out | `navigator.locks` auto-releases on tab crash (no stale-lease/split-brain). **Do not hand-roll** a `useStorage` lease coordinator (layering inversion + race). |
| Imperative API | single `ingest()` funnel; `toast.success` = sugar over a built-in `__toast` type | Identical validate/priority/group/lifecycle regardless of source; one code path to test. |
| Presentation | drive the **existing** Toast primitive; one renderer for both surfaces | Consumer-owned list + `@update:open` removal exactly per `toast/demo.vue`. `surface` prop kills duplication. |

---

## 2. Architecture diagram

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │  WS SERVER  (single totally-ordered stream per user)          │
                    └───────▲───────────────────────────────────────────┬──────────┘
        outbound (acks,     │  ResumeFrame{cursor} on (re)connect         │ inbound frames
        ActionFrame,        │                                             │ (notification | hello | ack | pong)
        ResumeFrame, ping)  │                                             ▼
┌───────────────────────────┴─────────────────────────────────────────────────────────────────┐
│ L1  core/realtime  (framework-free)                                                            │
│   Transport iface ── createWebSocketTransport | createSseTransport  (swap seam, both shipped)  │
│        │ onMessage/onOpen/onClose/onError                                                       │
│        ▼                                                                                        │
│   RealtimeClient ── createAsyncMachine: idle→connecting→connected→reconnecting→error→closed     │
│        ├─ plugins (composeRealtimePlugins): auth · codec(JSON) · heartbeat · resume · log · gzip │
│        ├─ heartbeat watchdog (cleared by ANY inbound frame)  ── useNetwork-gated backoff*       │
│        ├─ reorder Deque (causal-hold) + gap-timeout  ── cursor advances ONLY on contiguous      │
│        ├─ dedup-by-id bounded LRU                                                                │
│        └─ outbound: Deque(bounded) ─drain→ AsyncPool(shared AbortSignal) ──┐ send()             │
│   onNotification(env) ─────────────────────────────────────┐              │                    │
│   onControl(ack) ─────────────────────────────┐            │              │ ack→commit/rollback │
└────────────────────────────────────────────────┼───────────┼──────────────┼────────────────────┘
   (* useNetwork.isOnline is watched in the Vue useRealtime wrapper, which dispatches
      NET_OFFLINE/NET_ONLINE into machine.send — core/realtime never imports Vue.)
                                                  │           │              │
   local notify()/toast.* ────────────┐          │           ▼              │
                                       ▼          │   ┌──────────────────┐   │
                              ┌──────────────────────▼┐ │ L2 ingest()    │   │
                              │ ONE ingest() funnel    │ │ (pure)         │   │
                              │ registry.resolve →     │◄┘ validate→build │   │
                              │ validate → normalize → │   IngestResult   │   │
                              │ contentHash → dedup    │                  │   │
                              └───────────┬────────────┘                  │   │
                                          │ commit(result, source)        │   │
                                          ▼                               │   │
┌──────────────────────────────────────────────────────────────────────┐ │   │
│ L3  domain store  (vue/toolkit)                                        │ │   │
│   shallowRef<Map<id,Notification>> + version-counter                   │ │   │
│   pure-reducer lifecycle (legal-edge table)                            │ │   │
│   surfacing PriorityQueue(~3, victim=min) ◄─ interrupt ─► durable Deque(~300) │
│   selectors: unreadCount · byPriority · byType · groups · toasting     │─┘   │
│   optimistic: clientToken ─send→ ───────────────────────────────────────────┘
│   useStorage(map) cross-tab  ── commit(): ingest=may-toast / hydrate=never   
│   optional useTabLeader + broadcastedRef (leader holds socket)         │
└───────────┬───────────────────────────────────────────────┬──────────┘
            │ store.toasting (bounded, sorted selector)       │ store.groups / unreadCount
            ▼                                                 ▼
┌────────────────────────────────┐            ┌──────────────────────────────────────┐
│ <Toaster>  (vue/primitives)    │            │ <NotificationCenter> (headless)        │
│ ToastProvider                  │            │ Root ctx via useContextFactory         │
│  └ ToastRoot v-for (EXISTING   │            │ CollectionItem-ordered groups          │
│     toast primitive, unforked) │   shared   │ data-state hooks                       │
│     v-model:open               │── per-type ┤  <component :is=renderer surface=inbox> │
│     @update:open → dismissToast│   renderer │                                        │
│     <component :is=renderer ───┤            │                                        │
│        surface="toast">        │            │                                        │
│  └ ToastViewport               │            │                                        │
└────────────────────────────────┘            └──────────────────────────────────────┘
```

---

## 3. File & package layout

```
core/realtime/                                   # NEW greenfield @robonen/realtime (framework-free)
  package.json  tsdown.config.ts  README.md
  src/
    index.ts                                     # barrel
    types.ts                                     # Envelope union, RealtimeState/Event, Transport, options
    client.ts                                    # createRealtimeClient — machine + pool + plugins + reorder
    machine.ts                                   # buildLifecycleMachine() -> createAsyncMachine(...)
    envelope.ts                                  # encode/decode (JSON default) + type guards
    reorder.ts                                   # seq reorder Deque + bounded-LRU dedup + contiguous-cursor + gap-timeout
    backoff.ts                                   # bespoke backoffDelay(attempt, opts) — full jitter (NOT stdlib retry)
    outbound.ts                                  # bounded Deque + AsyncPool drainer + ack correlation (clientToken)
    lru.ts                                       # bounded LruSet for dedup
    plugin.ts                                    # defineRealtimePlugin / composeRealtimePlugins (mirror core/fetch)
    transports/{websocket.ts, sse.ts}
    plugins/{auth,codec,heartbeat,resume,logger,compression}.ts
    __mocks__/mockTransport.ts
    *.test.ts

vue/toolkit/src/composables/realtime/useRealtime/{index.ts, index.test.ts}   # NEW: thin Vue wrapper + useNetwork wiring

vue/toolkit/src/composables/notifications/       # NEW category — domain + facade
  index.ts  types.ts  registry.ts  ingest.ts  store.ts  surfacing.ts
  selectors.ts  persistence.ts  actions.ts
  useNotifications/index.ts  useNotificationCenter/index.ts  useUnreadCount/index.ts
  __tests__/*.test.ts

vue/primitives/src/toaster/{Toaster.vue, index.ts, demo.vue}                  # NEW: drives existing toast/
vue/primitives/src/notification-center/                                       # NEW headless inbox primitive
  context.ts  NotificationCenterRoot.vue  NotificationCenterList.vue
  NotificationCenterItem.vue  NotificationCenterGroup.vue
  NotificationCenterBadge.vue  NotificationCenterEmpty.vue
  index.ts  demo.vue  __test__/NotificationCenter.test.ts

# REUSED UNCHANGED: vue/primitives/src/toast/*, core/stdlib structs/async, core/fetch plugin model,
#   vue/toolkit (createEventHook/useStorage/useNetwork/useTabLeader/broadcastedRef/
#   createSharedComposable/useAppSharedState/useContextFactory), @robonen/platform/{multi,browsers}
```

---

## 4. Transport layer (`core/realtime`)

### 4.1 Wire envelope protocol

```ts
// core/realtime/src/types.ts
export interface BaseEnvelope { v: 1; id: string; ts: number }

// ── inbound DATA plane ──
export type NotificationFrame = BaseEnvelope & {
  kind: 'notification';
  type: string;                 // registry key
  seq: number;                  // strictly-monotonic per session (server-assigned)
  priority?: NotificationPriority;
  groupKey?: string;
  payload: unknown;             // validated downstream by the registry
};

// ── CONTROL plane ──
export type HelloFrame     = BaseEnvelope & { kind: 'hello'; sessionId: string; cursor?: string };
export type AckFrame       = BaseEnvelope & { kind: 'ack'; ref: string; ok: boolean; error?: string };  // ref = correlation token (see §5.5)
export type HeartbeatFrame = BaseEnvelope & { kind: 'ping' | 'pong' };

export type ResumeFrame    = BaseEnvelope & { kind: 'resume'; cursor?: string };
export type ActionFrame    = BaseEnvelope & { kind: 'action'; ref: string; type: string; action: string; clientToken: string; payload?: unknown };

export type InboundEnvelope  = NotificationFrame | HelloFrame | AckFrame | HeartbeatFrame;
export type OutboundEnvelope = ResumeFrame | AckFrame | HeartbeatFrame | ActionFrame;
export type ControlFrame     = HelloFrame | AckFrame | HeartbeatFrame;

export type RealtimeState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'closed';
export type RealtimeEvent =
  | 'CONNECT' | 'OPENED' | 'CONNECTED' | 'DROPPED' | 'RETRY'
  | 'GIVE_UP' | 'CLOSE' | 'NET_OFFLINE' | 'NET_ONLINE';

export interface Transport {
  connect(url: string, signal: AbortSignal): Promise<void>;
  send(raw: string | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
  readonly onOpen:    (cb: () => void) => () => void;
  readonly onMessage: (cb: (raw: unknown) => void) => () => void;
  readonly onClose:   (cb: (e: { code: number; reason: string; wasClean: boolean }) => void) => () => void;
  readonly onError:   (cb: (err: unknown) => void) => () => void;
}
```

> **Server contract this layer depends on** (new, server-side, not part of any existing repo API):
> (1) strictly-monotonic per-session server-assigned `seq`; (2) on `ResumeFrame{cursor}` the server
> replays every frame with `seq > cursor`; (3) a reconciliation endpoint/command to re-request a
> permanently-lost `[from, to]` range flushed by the gap-timeout; (4) action commands are idempotent,
> keyed by `clientToken`, and the server echoes that token in `AckFrame.ref`.

### 4.2 Plugin system — cloned 1:1 from `core/fetch`

**Verified:** `core/fetch` uses `composePlugins(plugins, userDefaults)`, an `execute` onion-middleware
field, `setup({defaults})` run after the merge, and a frozen `EMPTY_HOOKS` fast path. We mirror this
exactly — the field is **`execute`**, *not* `transform`.

```ts
// core/realtime/src/plugin.ts
export interface RealtimeContext {
  state: RealtimeState; attempt: number; cursor: string | undefined;
  sessionId: string | undefined; aborter: AbortController;
}
export type RealtimeHook<C = RealtimeContext> = (context: C) => void | Promise<void>;
export interface RealtimeHooks {
  onConnect?: RealtimeHook<{ ctx: RealtimeContext; url: string }> | RealtimeHook<{ ctx: RealtimeContext; url: string }>[];
  onMessage?: RealtimeHook<{ raw: unknown; env?: InboundEnvelope }> | RealtimeHook<{ raw: unknown; env?: InboundEnvelope }>[]; // DECODE here (set env)
  onSend?:    RealtimeHook<{ env: OutboundEnvelope; raw?: unknown }> | RealtimeHook<{ env: OutboundEnvelope; raw?: unknown }>[]; // ENCODE here (set raw)
  onClose?:   RealtimeHook<{ code: number; reason: string }> | RealtimeHook<{ code: number; reason: string }>[];
  onError?:   RealtimeHook<{ error: unknown }> | RealtimeHook<{ error: unknown }>[];
}
export type RealtimeSendMiddleware = (ctx: { env: OutboundEnvelope; raw?: unknown }, next: () => Promise<void>) => Promise<void>;

export interface RealtimePlugin<Name extends string = string> {
  readonly name: Name;
  readonly defaults?: Partial<RealtimeClientOptions>;
  readonly hooks?: RealtimeHooks;
  readonly execute?: RealtimeSendMiddleware;                       // onion around each socket write
  readonly setup?: (ctx: { readonly defaults: RealtimeClientOptions }) => void;
}
export function defineRealtimePlugin<const N extends string>(p: RealtimePlugin<N>): RealtimePlugin<N> { return p; }

// flattens per-phase hook arrays + onion-composes `execute`, identical structure to composePlugins
export function composeRealtimePlugins(
  plugins: readonly RealtimePlugin[] | undefined,
  userDefaults: Partial<RealtimeClientOptions> | undefined,
): ComposedRealtimePlugins { /* mirror of core/fetch composePlugins; EMPTY_HOOKS fast path */ }
```

Shipped tree-shakeable plugins (canonical order asserted in `setup`: **codec encodes before
compression**):

```ts
// core/realtime/src/plugins/codec.ts  — JSON default (core/encoding has NO generic codec, verified)
export const jsonCodec = defineRealtimePlugin({
  name: 'codec',
  hooks: {
    onMessage: ({ raw }) => { /* env = JSON.parse(raw as string); shape-check */ },
    onSend:    (c) => { c.raw = JSON.stringify(c.env); },
  },
});
// auth.ts (onConnect: append token subprotocol/query; refresh on error)
// heartbeat.ts (owns ping interval + watchdog)   resume.ts (persists & injects cursor)
// logger.ts (WeakMap timing like the fetch logger)   compression.ts (execute middleware)
```

### 4.3 Connection lifecycle — `createAsyncMachine`

**Verified** ordering inside `send()`: `guard → action → exit → set currentState → entry`, all awaited;
one action per transition, one entry/exit per state; the initial state's `entry` does **not** auto-run
on construction. `NET_OFFLINE`/`NET_ONLINE` are first-class events that pause/resume retry scheduling
instead of burning the attempt counter.

```ts
// core/realtime/src/machine.ts
export function buildLifecycleMachine(deps: MachineDeps) {
  return createAsyncMachine({
    initial: 'idle',
    context: { state: 'idle', attempt: 0, cursor: undefined, sessionId: undefined, aborter: new AbortController() } as RealtimeContext,
    states: {
      idle: { on: { CONNECT: 'connecting' } },

      connecting: {
        entry: async (ctx) => { ctx.aborter = new AbortController(); await deps.transport.connect(deps.url(), ctx.aborter.signal); },
        on: {
          OPENED:  { target: 'connected', action: async (ctx) => { await deps.send({ kind: 'resume', cursor: ctx.cursor, v: 1, id: deps.id(), ts: deps.now() }); } },
          DROPPED: { target: 'reconnecting', guard: () => deps.isOnline() && deps.canRetry() },
          CLOSE:   'closed',
        },
      },

      connected: {
        entry: () => { deps.startHeartbeat(); deps.flushOutbound(); },   // deterministic side-effects
        exit:  () => { deps.stopHeartbeat(); },
        on: {
          DROPPED:     { target: 'reconnecting', guard: () => deps.isOnline() && deps.canRetry() },
          NET_OFFLINE: { target: 'reconnecting', action: () => deps.pauseRetries() },  // sit, do NOT schedule RETRY
          CLOSE:       'closed',
        },
      },

      reconnecting: {
        entry: (ctx) => { if (deps.isOnline()) deps.scheduleRetry(ctx.attempt); },     // backoffDelay(attempt) then RETRY
        on: {
          RETRY:      { target: 'connecting', action: (ctx) => { ctx.attempt++; } },
          NET_ONLINE: { target: 'connecting', action: (ctx) => { ctx.attempt = 0; } }, // reset + immediate reconnect
          GIVE_UP:    { target: 'error', guard: () => !deps.canRetry() },
          CLOSE:      'closed',
        },
      },

      error:  { on: { CONNECT: 'connecting' } },
      closed: { entry: (ctx) => { ctx.aborter.abort(); deps.transport.close(1000); } },
    },
  });
}
```

`backoff.ts` is a **bespoke standalone** function (it does *not* call stdlib `retry()`, which loops
attempts internally and cannot drive an event-driven, network-gated, machine-scheduled reconnect). It
borrows only the *shape* of a `delay: (n) => number` function:

```ts
export function backoffDelay(attempt: number, o: { base?: number; cap?: number; jitter?: boolean } = {}): number {
  const base = o.base ?? 500, cap = o.cap ?? 30_000;
  const raw = Math.min(cap, base * 2 ** attempt);
  return o.jitter === false ? raw : raw * (0.5 + Math.random() * 0.5);   // full jitter
}
// scheduleRetry(attempt): a no-op while !isOnline(); else setTimeout(backoffDelay(attempt)) -> machine.send('RETRY').
```

### 4.4 Heartbeat / zombie detection

`heartbeatPlugin` arms a watchdog whenever `connected`. **Any inbound frame** (pong *or* data) clears
it; on fire → `machine.send('DROPPED')`. This is the only reliable TCP-half-open detector. Conservative
configurable defaults (`ping 20s` / `watchdog 10s`).

### 4.5 Ordering / dedup / resume

```ts
// core/realtime/src/lru.ts — bounded dedup set (prevents an unbounded memory leak over a long session)
export class LruSet {
  private map = new Map<string, true>();
  constructor(private max = 4096) {}
  has(k: string) { return this.map.has(k); }
  add(k: string) {
    if (this.map.has(k)) this.map.delete(k);        // bump to MRU
    this.map.set(k, true);
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);  // evict LRU
  }
}

// core/realtime/src/reorder.ts
export function createReorderBuffer(opts: { gapTimeoutMs?: number; onReconcile?: (from: number, to: number) => void }) {
  const buffer = new Deque<NotificationFrame>([], { maxSize: 1024 });   // out-of-order hold (causal-hold; ref: crdt replica.ts)
  const seen = new LruSet(8192);                                        // BOUNDED dedup-by-id
  let lastSeq = 0;
  let cursor: string | undefined;                                       // = String(lastSeq), persisted

  function accept(f: NotificationFrame): NotificationFrame[] {
    if (seen.has(f.id) || f.seq <= lastSeq) return [];                  // duplicate / replay -> drop (idempotent at-least-once)
    seen.add(f.id);
    if (f.seq === lastSeq + 1) {
      const out = [f]; lastSeq = f.seq; cursor = String(lastSeq);       // CONTIGUOUS — advance cursor ONLY here
      let next: NotificationFrame | undefined;
      while ((next = takeSeq(buffer, lastSeq + 1))) { out.push(next); lastSeq = next.seq; cursor = String(lastSeq); }
      return out;
    }
    putBySeq(buffer, f);                                                // gap: hold, DO NOT advance cursor
    armGapTimeout(() => opts.onReconcile?.(lastSeq + 1, f.seq - 1));    // permanent-loss -> deliver-with-gap + server reconcile
    return [];
  }
  return { accept, get cursor() { return cursor; }, hydrate(c?: string) { if (c) { lastSeq = Number(c); cursor = c; } } };
}
```

Resume: `ResumeFrame{cursor}` is sent on every `connected.entry`; the server replays `seq > cursor`.
`resumePlugin` persists the cursor via `useStorage` so it survives a full reload. A **scalar** suffices —
a single-writer per-user stream collapses the version-vector to one entry (O(1) resume, small wire).

### 4.6 Outbound queue / backpressure

```ts
// core/realtime/src/outbound.ts
export function createOutbound(deps: { transport: Transport; signal: AbortSignal; concurrency?: number; max?: number }) {
  const queue = new Deque<OutboundEnvelope>([], { maxSize: deps.max ?? 256 });
  const pool  = new AsyncPool({ concurrency: deps.concurrency ?? 4, signal: deps.signal }); // CLOSE aborts in-flight
  let connected = false;
  const acks = new Map<string, { resolve: () => void; reject: (e: unknown) => void }>();    // keyed by AckFrame.ref

  function enqueue(env: OutboundEnvelope) {
    if (queue.isFull && env.kind !== 'action') queue.popFront();        // drop-oldest non-critical (action frames never dropped)
    queue.pushBack(env);
    if (connected) flush();
  }
  function flush() {
    let env: OutboundEnvelope | undefined;
    while ((env = queue.popFront())) {
      const e = env;
      pool.add(async (signal) => {
        deps.transport.send(serialize(e));
        if (e.kind === 'action') await waitForAck(e.clientToken, acks, { timeout: 8000, signal });  // canonical key = clientToken
      });
    }
  }
  function resolveAck(ref: string, ok: boolean, error?: string) {       // called from the inbound ack path; ref === clientToken
    const w = acks.get(ref); if (!w) return; acks.delete(ref); ok ? w.resolve() : w.reject(new Error(error));
  }
  return { enqueue, flush, setConnected: (v: boolean) => { connected = v; if (v) flush(); }, resolveAck, dispose: () => pool.dispose() };
}
```

> `AsyncPool` has **no `pause()`** (verified). We gate by **not adding** while disconnected and abort
> in-flight via the shared signal on `CLOSE`. The ack correlation key is **`clientToken`** end-to-end:
> the `ActionFrame` carries it, `outbound` blocks `waitForAck(clientToken)`, and the server echoes it in
> `AckFrame.ref` — one canonical key, no `ref`/`clientToken` mismatch.

### 4.7 Client surface + single-shared-socket across tabs

```ts
// core/realtime/src/client.ts
export interface RealtimeClient {
  readonly state: () => RealtimeState;
  connect(): void; disconnect(code?: number): void;
  netOnline(): void; netOffline(): void;                            // dispatched by the Vue wrapper from useNetwork
  onNotification(cb: (f: NotificationFrame) => void): () => void;   // ordered + deduped
  onControl(cb: (f: ControlFrame) => void): () => void;
  onStateChange(cb: (s: RealtimeState) => void): () => void;
  send(env: OutboundEnvelope): Promise<void>;                       // queued offline, flushed on connect
  resumeCursor(): string | undefined;
  dispose(): void;
}
export function createRealtimeClient(options: RealtimeClientOptions): RealtimeClient { /* machine + reorder + outbound + plugins */ }
```

The **Vue/non-Vue boundary** is crossed only in the wrapper: `core/realtime` never imports `useNetwork`;
the wrapper watches `useNetwork().isOnline` and dispatches into the machine. **Cross-tab single socket**
is an *optional optimization* built from the existing primitives — never a hand-rolled lease:

```ts
// vue/toolkit/src/composables/realtime/useRealtime/index.ts
export function useRealtime(options: UseRealtimeOptions): UseRealtimeReturn {
  if (!isClient) return ssrNoopRealtime();                          // no socket on server

  const { isOnline } = useNetwork();
  const { isLeader } = useTabLeader('robonen:notif-socket');        // Web Locks — atomic, crash-safe failover
  const client = createRealtimeClient(options);
  const fanout = broadcastedRef<NotificationFrame | null>('robonen:notif-inbound', null);  // BroadcastChannel — truly cross-tab

  watch(isOnline, (online) => online ? client.netOnline() : client.netOffline());          // wire NET_ONLINE/NET_OFFLINE

  watchEffect(() => {
    if (isLeader.value) { client.connect(); client.onNotification((f) => { fanout.value = f; }); }
    else                { client.disconnect(); /* follower ingests from `fanout`, runs inbox-only */ }
  });
  tryOnScopeDispose(() => client.dispose());
  return { /* state, isConnected, connect, disconnect, onNotification, send */ };
}
export const useSharedRealtime = createSharedComposable(useRealtime);  // ref-counted, disposed on last unmount, raw-on-SSR
```

---

## 5. Domain / data layer

### 5.1 Entity model + lifecycle

```ts
// vue/toolkit/src/composables/notifications/types.ts
export type NotificationPriority = 0 | 1 | 2 | 3;   // numeric => trivial comparator + interrupt math
export const Priority = { low: 0, normal: 1, high: 2, critical: 3 } as const;

export type NotificationLifecycle =
  | 'received' | 'queued' | 'toasted' | 'read' | 'dismissed' | 'archived' | 'expired';

// legal edges — enforced by the synchronous reducer (illegal => throw in dev, no-op + onError in prod)
export const LIFECYCLE_EDGES: Record<NotificationLifecycle, NotificationLifecycle[]> = {
  received:  ['queued', 'toasted', 'read', 'archived'],
  queued:    ['toasted', 'read', 'dismissed', 'archived'],
  toasted:   ['read', 'dismissed'],
  read:      ['archived', 'dismissed'],
  dismissed: ['archived'],
  archived:  ['expired'],
  expired:   [],
};

export interface Notification<TType extends string = string, TPayload = unknown> {
  readonly id: string;                 // server id (dedup key #1) OR contentHash-derived for local
  readonly type: TType;
  readonly seq: number;                // transport seq (ordering); 0 for local
  readonly payload: TPayload;          // registry-validated
  priority: NotificationPriority;      // envelope override ?? registry.defaultPriority
  lifecycle: NotificationLifecycle;
  readonly groupKey: string | null;    // registry.grouping(payload)
  readonly contentHash: string;        // dedup key #2 (FNV-1a) — folds retransmits / identical content
  readonly createdAt: number;
  readonly source: 'ws' | 'local';
  readReceiptAt: number | null;
  dismissedAt: number | null;
  // runtime-only — NEVER persisted:
  surfaced: boolean;                   // currently occupies a toast slot
  pendingAction: { actionId: string; clientToken: string; prevLifecycle: NotificationLifecycle } | null;
  actionError: string | null;
  meta: { count: number; sourceSeqs: number[] };  // count>1 => "+N more"
}

export interface NotificationGroup {
  readonly key: string; readonly type: string; readonly priority: NotificationPriority;   // max in group
  readonly notifications: Notification[];          // newest-first
  readonly count: number; readonly unread: number; readonly latest: Notification;
}
```

### 5.2 The store (singleton split + reactive core)

```ts
// vue/toolkit/src/composables/notifications/store.ts
export interface NotificationStoreOptions {
  registry: NotificationRegistry; persistKey?: string;
  maxToasts?: number; maxEntities?: number; client?: UseRealtimeReturn;
}

export function createNotificationStore(options: NotificationStoreOptions): NotificationStore {
  const byId = shallowRef(new Map<string, Notification>());      // house-style shallowRef default
  const version = ref(0);                                        // O(1) selector invalidation
  const bump = () => { triggerRef(byId); version.value++; };
  const toastedIds = new Set<string>();                          // per-tab, NEVER persisted

  // ── SURFACING budget: scarce toast real-estate. ──
  // VERIFIED: PriorityQueue is a MIN-heap; peek()/dequeue() return the comparator MINIMUM.
  // So the comparator must make the EVICTION VICTIM the minimum: lowest priority first, then OLDEST first.
  const cmpEvict = (a: Notification, b: Notification) =>
    (a.priority - b.priority) || (a.createdAt - b.createdAt);     // min = lowest priority, then oldest = the victim
  const surfacing = new PriorityQueue<string>([], {
    comparator: (x, y) => cmpEvict(byId.value.get(x)!, byId.value.get(y)!),
    maxSize: options.maxToasts ?? 3,
  });

  // ── DURABLE capacity: memory retention. ──
  const order = new Deque<string>([], { maxSize: options.maxEntities ?? 300 });

  // ── COMMIT: the single seam. `source` decides toast eligibility. ──
  function commit(r: IngestResult, source: 'ingest' | 'hydration'): void {
    if (!r.ok) return;                                            // invalid already routed to onReject
    const incoming = r.notification;
    const existing = byId.value.get(incoming.id) ?? findByContentHash(byId.value, incoming.contentHash);

    if (existing) {                                               // DEDUP / cross-tab MERGE
      mergeLattice(existing, incoming);                           // max over monotonic lifecycle lattice + per-field LWW
      existing.meta.count++; existing.meta.sourceSeqs.push(incoming.seq);
      bump(); return;
    }
    ensureCapacity();                                             // guarantee room BEFORE pushBack (Deque throws when full)
    byId.value.set(incoming.id, incoming); order.pushBack(incoming.id);

    // toast ONLY on ingest-commit (NEVER on hydration) and only if not already toasted in this tab
    if (source === 'ingest' && options.registry.shouldToast(incoming) && !toastedIds.has(incoming.id))
      surface(incoming);
    bump();
  }

  function surface(n: Notification): void {                       // guarded PriorityQueue use (enqueue THROWS when full)
    if (surfacing.isFull) {
      const victimId = surfacing.peek()!;                         // heap root = most-evictable under cmpEvict
      const victim = byId.value.get(victimId)!;
      if (cmpEvict(n, victim) <= 0) return;                       // newcomer is no better than the victim -> inbox-only
      surfacing.dequeue();                                        // interrupt: evict lowest visible toast...
      transition(victim.id, 'queued'); victim.surfaced = false;   // ...back to inbox, NEVER deleted
    }
    surfacing.enqueue(n.id);                                      // safe now
    transition(n.id, 'toasted'); n.surfaced = true; toastedIds.add(n.id);
  }

  // VERIFIED: Deque.pushBack throws RangeError at maxSize — never rely on "transient capacity".
  function ensureCapacity(): void {
    while (order.isFull) {
      const victimId = pickDurableVictim(order, byId.value);      // expired -> read/archived oldest -> lowest-priority oldest
      if (!victimId) break;                                       // all protected -> last-resort force-evict oldest non-active below
      remove(victimId);
    }
  }
  // pickDurableVictim skips surfaced || pendingAction!=null; only if EVERY candidate is active does it
  // force-evict the oldest non-active entity, guaranteeing pushBack never throws.

  // ... transition (pure reducer over LIFECYCLE_EDGES), markRead, dismissToast (toast->inbox), archive, remove, runAction
  return { /* see selectors + actions below */ };
}
```

**Singleton mapping** (the verified-correct split):

```ts
// store + registry are app-lifetime (survive route changes) and options are bound ONCE here.
const useStoreSingleton = useAppSharedState(createNotificationStore);   // NOT createSharedComposable (it drops later args)
// the socket-owning client uses createSharedComposable (ref-counted, disposable, raw-on-SSR) — see §4.7.
```

> **Verified:** `createSharedComposable` binds args on the first call and ignores them afterward, and
> returns the raw composable on SSR; `useAppSharedState` runs the factory once inside a module
> `effectScope(true)` that is **never** stopped (app-lifetime). So: options-bearing inbox/registry →
> `useAppSharedState`; disposable socket+timers → `createSharedComposable`.

### 5.3 Derived selectors — viewport order from an **explicit sort**, not heap order

```ts
// selectors.ts — VERIFIED: PriorityQueue.toArray()/iteration yields HEAP order, not sorted.
export function buildSelectors(byId: ShallowRef<Map<string, Notification>>, version: Ref<number>, surfacing: PriorityQueue<string>) {
  const live = computed(() => (version.value, [...byId.value.values()]));

  // display order is the INVERSE of the eviction order: highest priority first, then NEWEST first
  const cmpDisplay = (a: Notification, b: Notification) => (b.priority - a.priority) || (b.createdAt - a.createdAt);
  const toasting = computed(() => {
    version.value;
    return [...surfacing].map((id) => byId.value.get(id)!).filter(Boolean).sort(cmpDisplay);  // explicit sort, never heap order
  });

  const unreadCount = computed(() => live.value.filter((n) => n.readReceiptAt === null && n.lifecycle !== 'archived' && n.lifecycle !== 'expired').length);
  const byPriority  = computed(() => groupByKey(live.value, (n) => n.priority));
  const byType      = computed(() => groupByKey(live.value, (n) => n.type));
  const groups      = computed(() => collapseByGroupKey(live.value));  // "+N more"
  return { toasting, unreadCount, byPriority, byType, groups };
}
```

### 5.4 Persistence + cross-tab (don't re-toast)

```ts
// persistence.ts — VERIFIED: useStorage(key, initial, storage, options); storage is a REQUIRED 3rd arg.
const persisted = useStorage<Map<string, PersistedNotification>>(
  () => options.persistKey ?? 'robonen:notif',
  new Map(),
  localStorage,
  { serializer: StorageSerializers.map, listenToStorageChanges: true, shallow: true, initOnMounted: true },  // SSR-safe defer
);
// PersistedNotification EXCLUDES runtime fields (surfaced, pendingAction, actionError) — never resurrect in-flight state.
// useStorage write-lock prevents self-feedback; 'storage'/'vuetools-storage' events propagate to other tabs.

watch(persisted, (next) => {                                          // remote tab wrote -> hydration-commit (NEVER toasts)
  for (const p of next.values()) commit(ingestPersisted(p), 'hydration');
}, { deep: false });
```

`mergeLattice` is the convergence rule for concurrent two-tab edits:

```ts
const LIFECYCLE_RANK: Record<NotificationLifecycle, number> = { received:0, queued:1, toasted:2, read:3, dismissed:4, archived:5, expired:6 };
function mergeLattice(local: Notification, remote: Notification): void {
  if (LIFECYCLE_RANK[remote.lifecycle] > LIFECYCLE_RANK[local.lifecycle]) local.lifecycle = remote.lifecycle;  // max over lattice
  local.readReceiptAt = maxNullable(local.readReceiptAt, remote.readReceiptAt);   // per-field LWW
  local.dismissedAt   = maxNullable(local.dismissedAt, remote.dismissedAt);
}
```

> **Known limitation:** the whole-Map serializer means a tab's write replaces the full key; with N tabs
> committing concurrently, whole-Map last-writer-wins can clobber a concurrent per-entity edit *before*
> `mergeLattice` (which only runs on the receiving side after a storage event) reconciles it. For strict
> multi-tab durability, enable the optional `useTabLeader` single-writer path.

### 5.5 Optimistic actions — token-correlated ack/commit/rollback

```ts
// actions.ts
async function runAction(id: string, actionId: string): Promise<void> {
  const n = byId.value.get(id); if (!n) return;
  const action = options.registry.resolve(n.type)?.actions?.find((a) => a.id === actionId);
  if (!action) return;
  const clientToken = crypto.randomUUID();                                // THE canonical correlation key
  const prevLifecycle = n.lifecycle;
  applyOptimistic(n, action.optimistic?.(n) ?? {});                       // immediate, reactive
  n.pendingAction = { actionId, clientToken, prevLifecycle }; bump();
  try {
    await options.client?.send({ kind: 'action', v: 1, id: crypto.randomUUID(), ts: Date.now(),
      ref: clientToken, type: n.type, action: actionId, clientToken });   // server echoes clientToken in AckFrame.ref
    await waitForAck(clientToken, { timeout: 8000 });                     // ack-after-timeout IGNORED via token compare
    n.pendingAction = null; if (action.onCommit) transition(id, action.onCommit); bump();
  } catch (e) {
    // DO NOT rollback on a mid-action socket drop — frame is queued, await ack post-reconnect.
    if (isTimeoutOrServerError(e)) { transition(id, prevLifecycle); n.pendingAction = null; n.actionError = String(e); bump(); }
  }
}
```

Eviction skips entities with `surfaced || pendingAction !== null`.

---

## 6. Type registry

```ts
// vue/toolkit/src/composables/notifications/registry.ts
export interface NotificationRendererProps<P = unknown> {
  notification: Notification<string, P>;
  surface: 'toast' | 'inbox';                       // ONE renderer, both surfaces
  runAction: (actionId: string) => void;
  dismiss: () => void;
}
export interface NotificationActionDef<P = unknown> {
  readonly id: string;                              // 'accept' | 'decline' | 'reply' | 'mark-read'
  readonly label: string | ((n: Notification<string, P>) => string);
  readonly altText: string;                         // -> ToastAction alt-text (required by the primitive)
  readonly variant?: 'primary' | 'secondary' | 'danger';
  readonly optimistic?: (n: Notification<string, P>) => Partial<Notification>;
  readonly onCommit?: NotificationLifecycle;        // terminal lifecycle on ack
}
export type ToastPolicy = 'always' | 'never' | 'by-priority';
export interface NotificationTypeDef<P = unknown> {
  readonly type: string;
  readonly validate: (raw: unknown) => P;           // throws on malformed -> caught per-message in ingest
  readonly renderer: Component;                     // NotificationRendererProps<P>
  readonly actions?: readonly NotificationActionDef<P>[];
  readonly defaultPriority?: NotificationPriority;
  readonly toastPolicy?: ToastPolicy;               // default 'by-priority'
  readonly grouping?: (p: P) => string | null;
  readonly contentHash?: (p: P) => string;          // override the FNV-1a default
  readonly sound?: string | false;
  readonly ttl?: number;                            // toast auto-dismiss ms; Infinity = sticky
  readonly persist?: boolean;                       // default true
}
export function defineNotificationType<P>(def: NotificationTypeDef<P>): NotificationTypeDef<P> { return def; }

export interface NotificationRegistry {
  register<P>(def: NotificationTypeDef<P>): void;
  resolve(type: string): NotificationTypeDef | undefined;
  has(type: string): boolean;
  shouldToast(n: Notification): boolean;
  priorityFor(type: string, override?: NotificationPriority): NotificationPriority;
  all(): readonly NotificationTypeDef[];
}
export function createNotificationRegistry(
  defs?: readonly NotificationTypeDef[],
  opts?: { onUnknownType?: (type: string) => void; toastFloor?: NotificationPriority },
): NotificationRegistry;

// provided/injected so renderers + store + ingestion share ONE instance (and tests inject a fake)
export const { inject: useNotificationRegistry, provide: provideNotificationRegistry, appProvide: appProvideNotificationRegistry } =
  useContextFactory<NotificationRegistry>('NotificationRegistry');
```

Registering the three required types:

```ts
const friendRequest = defineNotificationType<{ fromUserId: string; name: string; avatar: string }>({
  type: 'friend_request',
  validate: (raw) => { const p = raw as any; if (typeof p?.fromUserId !== 'string') throw new Error('bad friend_request'); return p; },
  renderer: FriendRequestCard,
  defaultPriority: Priority.high,
  toastPolicy: 'by-priority',
  grouping: () => null,
  sound: '/sounds/ping.mp3',
  ttl: Infinity,                                    // sticky until acted on
  actions: [
    { id: 'accept',  label: 'Accept',  altText: 'Accept friend request',  variant: 'primary',
      optimistic: () => ({ lifecycle: 'read', readReceiptAt: Date.now() }), onCommit: 'read' },
    { id: 'decline', label: 'Decline', altText: 'Decline friend request', variant: 'danger',
      optimistic: () => ({ lifecycle: 'dismissed', dismissedAt: Date.now() }), onCommit: 'dismissed' },
  ],
});

const systemAlert = defineNotificationType<{ title: string; body: string }>({
  type: 'system_alert',
  validate: (raw) => raw as any,
  renderer: SystemAlertCard,
  defaultPriority: Priority.critical,               // renders ToastRoot type='foreground' (assertive aria-live)
  toastPolicy: 'always',
  ttl: 60_000,
  actions: [],                                       // dismiss-only via <ToastClose>
});

const message = defineNotificationType<{ threadId: string; from: string; text: string }>({
  type: 'message',
  validate: (raw) => raw as any,
  renderer: MessageRow,
  defaultPriority: Priority.normal,
  toastPolicy: 'by-priority',                        // normal < high floor => inbox-only (badge), no toast
  grouping: (p) => `dm:${p.threadId}`,               // collapse same thread => "+N more"
  contentHash: (p) => `${p.threadId}:${p.text}`,
  actions: [
    { id: 'reply',     label: 'Reply',     altText: 'Reply to message' },
    { id: 'mark-read', label: 'Mark read', altText: 'Mark message read',
      optimistic: () => ({ lifecycle: 'read', readReceiptAt: Date.now() }), onCommit: 'read' },
  ],
});

registerNotificationTypes([friendRequest, systemAlert, message]);   // tree-shakeable: only imported types ship
```

---

## 7. Presentation bridge

### 7.1 `<Toaster>` — drives the EXISTING toast primitive (consumer-owned list per `toast/demo.vue`)

```vue
<!-- vue/primitives/src/toaster/Toaster.vue -->
<script setup lang="ts">
import { ToastProvider, ToastRoot, ToastAction, ToastClose, ToastViewport } from '@robonen/primitives';
import { useNotifications, useNotificationRegistry, Priority } from '@robonen/vue';

const props = withDefaults(defineProps<{ duration?: number; swipeDirection?: 'up'|'down'|'left'|'right' }>(),
  { duration: 6000, swipeDirection: 'right' });

const store = useNotifications();
const registry = useNotificationRegistry();
const resolve = (type: string) => registry.resolve(type)!;
const durationFor = (n: { type: string; priority: number }) =>
  resolve(n.type).ttl ?? (n.priority >= Priority.high ? 10_000 : props.duration);
</script>

<template>
  <ToastProvider :duration="props.duration" :swipe-direction="props.swipeDirection">
    <ToastRoot
      v-for="n in store.toasting.value"
      :key="n.id"
      v-model:open="store.openModel(n.id).value"
      :duration="durationFor(n)"
      :type="n.priority >= Priority.critical ? 'foreground' : 'background'"
      to-viewport
      @update:open="(open) => { if (!open) store.dismissToast(n.id); }"
    >
      <component
        :is="resolve(n.type).renderer"
        :notification="n" surface="toast"
        :run-action="(a: string) => store.runAction(n.id, a)"
        :dismiss="() => store.dismissToast(n.id)"
      />
      <ToastAction
        v-for="a in resolve(n.type).actions ?? []"
        :key="a.id" :alt-text="a.altText"
        @click="store.runAction(n.id, a.id)"
      >{{ typeof a.label === 'function' ? a.label(n) : a.label }}</ToastAction>
      <ToastClose aria-label="Dismiss" />
    </ToastRoot>
    <ToastViewport class="fixed bottom-4 right-4 flex flex-col gap-2" />
  </ToastProvider>
</template>
```

> The store owns the list + `remove`/`dismissToast`; the primitive stays consumer-driven exactly as its
> `demo.vue` requires. We do **not** fork or extend `vue/primitives/src/toast`. Auto-dismiss (the
> primitive sets `open=false`) routes through `@update:open` → `dismissToast` (toast→inbox, never
> deleted).

### 7.2 `<NotificationCenter>` — headless inbox, same renderer (`surface='inbox'`)

```vue
<!-- vue/primitives/src/notification-center/NotificationCenterItem.vue -->
<script setup lang="ts">
import { useNotificationCenterContext } from './context';
import { useNotificationRegistry } from '@robonen/vue';
const props = defineProps<{ group: NotificationGroup }>();
const ctx = useNotificationCenterContext();
const registry = useNotificationRegistry();
const latest = props.group.latest;
</script>

<template>
  <li :data-state="latest.readReceiptAt ? 'read' : 'unread'" class="nc-item">
    <component
      :is="registry.resolve(latest.type)!.renderer"
      :notification="latest" surface="inbox"
      :run-action="(a: string) => ctx.runAction(latest.id, a)"
      :dismiss="() => ctx.archive(latest.id)"
    />
    <span v-if="group.count > 1" class="nc-more">+{{ group.count - 1 }} more</span>
  </li>
</template>
```

**Priority + policy decides toast-vs-inbox** entirely inside `registry.shouldToast(n)`: `'always'`→toast;
`'never'`→inbox-only; `'by-priority'`→`n.priority >= toastFloor` (default `high`). Every notification
lands in the inbox (durable `Deque`); only `shouldToast` ones also enter the surfacing `PriorityQueue`.
`critical` renders `type='foreground'` (assertive aria-live) and interrupts the lowest visible toast.

---

## 8. Public API & usage

```ts
// vue/toolkit/src/composables/notifications/useNotifications/index.ts
export interface UseNotificationsReturn {
  entities: Readonly<ShallowRef<Map<string, Notification>>>;
  toasting: ComputedRef<Notification[]>;
  groups: ComputedRef<NotificationGroup[]>;
  unreadCount: ComputedRef<number>;
  byPriority: ComputedRef<Record<NotificationPriority, Notification[]>>;
  byType: ComputedRef<Record<string, Notification[]>>;
  connectionState: Readonly<ShallowRef<RealtimeState>>;
  notify: <P>(input: { type: string; payload: P; priority?: NotificationPriority }) => string;  // local -> SAME funnel
  toast: ToastSugar;                  // toast.success/error/dismiss -> built-in '__toast' type
  markRead: (id: string) => void; markAllRead: () => void;
  dismissToast: (id: string) => void; archive: (id: string) => void;
  runAction: (id: string, actionId: string) => Promise<void>;
  openModel: (id: string) => Ref<boolean>;
}
export function useNotifications(): UseNotificationsReturn;          // full surface
export function useNotificationCenter(): UseNotificationCenterReturn; // inbox/groups/filter/markAllRead
export function useUnreadCount(): Readonly<ComputedRef<number>>;     // cheap badge — does NOT pull the whole store
```

End-to-end (a Nuxt plugin / app entry):

```ts
// plugins/notifications.client.ts
import { createNotificationRegistry, appProvideNotificationRegistry, registerNotificationTypes,
         useSharedRealtime } from '@robonen/vue';
import { createWebSocketTransport } from '@robonen/realtime';
import { authPlugin, jsonCodec, heartbeatPlugin, resumePlugin, loggerPlugin } from '@robonen/realtime/plugins';

export default defineNuxtPlugin((nuxtApp) => {
  const registry = createNotificationRegistry();
  registerNotificationTypes([friendRequest, systemAlert, message]);   // bootstrap, once

  // CORRECTED: use appProvide at the plugin layer (component-level `provide` only works inside setup)
  appProvideNotificationRegistry(nuxtApp.vueApp)(registry);

  useSharedRealtime({
    transport: createWebSocketTransport(),
    url: () => `wss://api.example.com/notifications?u=${useUserId().value}`,
    plugins: [authPlugin(getToken), jsonCodec, heartbeatPlugin(), resumePlugin(), loggerPlugin(console.log)],
    backoff: { base: 500, cap: 30_000, jitter: true },
  });
});
```

```vue
<!-- App.vue : mount presentation ONCE near the root -->
<template>
  <NuxtPage />
  <ClientOnly><Toaster /></ClientOnly>           <!-- client-only: no socket/badge during SSR -->
</template>

<!-- HeaderBell.vue : cheap badge, rendered only after mount to avoid hydration mismatch -->
<script setup lang="ts">
import { useUnreadCount } from '@robonen/vue';
const unread = useUnreadCount();
const mounted = ref(false); onMounted(() => mounted.value = true);
</script>
<template><button>🔔 <span v-if="mounted && unread.value">{{ unread.value }}</span></button></template>
```

```ts
// anywhere: local notification + imperative toast (SAME ingest funnel)
const { notify, toast, runAction } = useNotifications();
notify({ type: 'message', payload: { threadId: 't1', from: 'Ana', text: 'hi' } });
toast.success('Saved', { description: 'Your changes are live.' });
toast.error('Upload failed', { actions: [{ id: 'retry', label: 'Retry', altText: 'Retry upload' }] });
await runAction(friendReqId, 'accept');           // optimistic -> WS action -> ack commit / timeout rollback
```

---

## 9. SSR, testing, tree-shaking

**SSR.** `core/realtime` imports nothing from Vue and touches `WebSocket`/`BroadcastChannel`/timers only
after `connect()`. `useRealtime` returns `ssrNoopRealtime()` when `!isClient`. `useStorage` defers with
`initOnMounted`. `useSharedRealtime` (`createSharedComposable`) returns a fresh raw instance on the
server. The unread badge renders only after `onMounted`. `<Toaster>` lives under `<ClientOnly>`.

**Testing** (house style: `describe(fnName)`, `effectScope()` disposal, `MockTransport`, fake registry):

```ts
// store.test.ts
describe('createNotificationStore', () => {
  it('surfacing interrupt evicts lowest toast back to inbox, never deletes', () => {
    const scope = effectScope();
    scope.run(() => {
      const store = createNotificationStore({ registry: fakeRegistry, maxToasts: 1 });
      store.commit(ingest(frame('a', { priority: Priority.low })), 'ingest');
      store.commit(ingest(frame('b', { priority: Priority.high })), 'ingest');   // interrupts
      expect(store.toasting.value.map(n => n.id)).toEqual(['b']);
      expect(store.entities.value.get('a')?.lifecycle).toBe('queued');           // demoted, still present
    });
    scope.stop();
  });

  it('hydration-commit never toasts (cross-tab no-re-toast)', () => {
    const store = createNotificationStore({ registry: fakeRegistry });
    store.commit(ingest(frame('x', { priority: Priority.critical })), 'hydration');
    expect(store.toasting.value).toHaveLength(0);                                // inbox only
    expect(store.unreadCount.value).toBe(1);
  });

  it('two-key dedup folds identical content into meta.count', () => { /* same contentHash, distinct id -> count=2 */ });
  it('disposes timers/subscriptions on scope stop', () => { /* spy + effectScope().stop() */ });
});

// machine.test.ts — drive via await machine.send(event)
describe('buildLifecycleMachine', () => {
  it('NET_OFFLINE pauses retries without scheduling RETRY', async () => {
    const m = buildLifecycleMachine(depsOffline);
    await m.send('CONNECT'); await m.send('OPENED'); await m.send('NET_OFFLINE');
    expect(depsOffline.scheduleRetry).not.toHaveBeenCalled();
  });
  it('cursor advances ONLY on contiguous delivery', () => {
    const rb = createReorderBuffer({});
    expect(rb.accept(frame('a', { seq: 1 })).map(f => f.seq)).toEqual([1]); expect(rb.cursor).toBe('1');
    expect(rb.accept(frame('c', { seq: 3 }))).toEqual([]);                  expect(rb.cursor).toBe('1'); // gap held
    expect(rb.accept(frame('b', { seq: 2 })).map(f => f.seq)).toEqual([2, 3]); expect(rb.cursor).toBe('3'); // drains
  });
  it('drops duplicates by id and seq<=lastSeq', () => { /* idempotent at-least-once */ });
});
```

Plus explicit tests for **seq-gap-then-reconnect** (assert no loss/dup), **storage-event toast
suppression**, **bounded-LRU dedup eviction**, and **leader handoff on abrupt tab close**.

**Tree-shaking.** Per-category barrels (`composables/notifications/index.ts` → `composables/index.ts` →
`src/index.ts`). Registry descriptors are **side-effect-free**; only the `defineNotificationType`s a
consumer imports + `register()`s ship. Realtime plugins are separate modules under
`@robonen/realtime/plugins`. `useUnreadCount` imports only the badge selector.

---

## 10. Build order / milestones

| # | Milestone | Deliverables | Gate |
|---|---|---|---|
| **M1** | Transport core skeleton | `core/realtime`: `Transport` iface, `createWebSocketTransport`, `envelope.ts`, `MockTransport`. | Connect/send/recv against a mock; JSON round-trip. |
| **M2** | Lifecycle + reliability | `machine.ts`, `backoff.ts` (jitter, gated), `heartbeat`/`resume` plugins, `reorder.ts` (contiguous cursor + gap-timeout + LruSet), `outbound.ts` (`AsyncPool`+`Deque`+ack by clientToken). | machine/reorder/backoff tests green; seq-gap-reconnect asserts no loss. |
| **M3** | Plugin pipeline + 2nd transport | `plugin.ts` 1:1 with `core/fetch`; `auth`/`codec`/`logger`/`compression`; ship `createSseTransport`. | SSE swaps in with zero upper-layer change. |
| **M4** | Registry + ingest funnel | `registry.ts`, `defineNotificationType`, `ingest.ts` (pure, catches `validate` throws → `onReject`), `contentHash`. | One funnel for WS + local; malformed payload never crashes the pump. |
| **M5** | Domain store | `store.ts`, `surfacing.ts` (victim-min PQ + guarded enqueue + `ensureCapacity`), `selectors.ts` (explicit sort), pure-reducer lifecycle, two-key dedup. | Interrupt/eviction/dedup/disposal tests green. |
| **M6** | Persistence + cross-tab | `persistence.ts` (`useStorage` map, merge lattice, `toastedIds`), hydration-commit separation, optional `useTabLeader`+`broadcastedRef`. | Storage-event suppression + leader-handoff tests green. |
| **M7** | Presentation | `<Toaster>` (drives existing toast), `<NotificationCenter>` primitive, shared `surface`-prop renderers; `useNotifications`/`useNotificationCenter`/`useUnreadCount`; `notify()`/`toast.*`. | Optimistic ack/rollback + a11y verified; the 3 demo types work end-to-end. |

**Hardest risks & mitigations**

1. **Resume gap / cursor correctness.** Cursor advances *only* on contiguous delivery; gap-timeout
   deliver-with-gap + a server reconciliation request for permanently-lost ranges. Test: inject gaps +
   reconnect, assert no loss/dup.
2. **Zombie connections (TCP half-open).** Watchdog cleared by *any* inbound frame, armed whenever
   `connected`; conservative configurable `ping 20s`/`watchdog 10s`.
3. **`PriorityQueue` is a min-heap.** The surfacing PQ comparator makes the *eviction victim* the
   minimum (lowest priority, then oldest); viewport order is a **separate** display sort. `surface()`
   `peek`/`isFull`-guards then `dequeue`-then-`enqueue`; never `toArray()` for display.
4. **Cross-tab double-toast.** `commit()` separates ingest (may toast) from hydration (never); per-tab
   non-persisted `toastedIds`; `useTabLeader` (Web Locks) for the optional single socket; **never**
   `useEventBus` for cross-tab; **never** a hand-rolled lease.
5. **Singleton arg-dropping.** Inbox/registry via `useAppSharedState` (options bound once); socket via
   `createSharedComposable` (disposable, raw-on-SSR).
6. **Optimistic double-apply.** Idempotent server commands keyed by `clientToken` (the one canonical
   correlation key); ack-after-timeout ignored via token compare; do **not** rollback on mid-action
   socket drop; eviction skips `pendingAction`/`surfaced`.
7. **Persistence schema.** Persist only committed lifecycle + read/dismiss receipts + cursor (exclude
   runtime fields); Map serializer; validate-on-hydrate, drop+log unknown-type entities. Whole-Map LWW
   is the multi-tab durability limit — opt into leader single-writer for strictness.
8. **Durable-Deque overflow.** `pushBack` throws at `maxSize`, so `ensureCapacity()` runs *before* every
   insert and force-evicts the oldest non-active entity if all candidates are protected.
9. **SSR hydration mismatch.** Badge/connection UI render only after mount; `<Toaster>` under
   `<ClientOnly>`; `isClient` guards throughout.

---

## Appendix — review corrections folded into this document

This design was adversarially verified against the real repo source. Corrections already applied above:

1. **PriorityQueue orientation** — it's a min-heap; the surfacing comparator now makes the eviction
   victim the minimum, and the viewport uses a separate display sort (§5.2, §5.3).
2. **Registry provisioning** — the Nuxt plugin uses `appProvide(nuxtApp.vueApp)` instead of
   component-level `provide` (§6, §8).
3. **Bounded LRU dedup** — `seen` is a real bounded `LruSet`, not an unbounded `Set` (§4.5).
4. **Backoff** — `backoffDelay` is bespoke and does not reuse stdlib `retry()` (§4.3).
5. **Ack correlation** — one canonical key (`clientToken`) end-to-end; `AckFrame.ref` echoes it
   (§4.1, §4.6, §5.5).
6. **Network boundary** — the Vue `useRealtime` wrapper watches `useNetwork().isOnline` and dispatches
   `NET_OFFLINE`/`NET_ONLINE`; `core/realtime` never imports Vue (§4.7).
7. **Durable overflow** — explicit `ensureCapacity()` before insert (the `Deque` throws when full)
   (§5.2).
8. **Server contract** — the monotonic-seq / replay / reconcile / token-echo requirements are stated
   explicitly (§4.1).
