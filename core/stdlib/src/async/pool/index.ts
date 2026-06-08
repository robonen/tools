import { CircularBuffer } from '../../structs/CircularBuffer';
import { isNumber } from '../../types';

export interface AsyncPoolOptions {
  concurrency?: number;
  signal?: AbortSignal;
}

interface PoolEntry<T = any> {
  task: (signal: AbortSignal) => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

// Shared sentinel — never aborts, avoids allocating AbortController per instance when no signal
const NEVER_ABORT_SIGNAL: AbortSignal = /* @__PURE__ */ new AbortController().signal;

// Normalizes concurrency option to a positive integer or Infinity.
// Note: (Infinity | 0) === 0 in JS — the `|| Infinity` trick recovers the correct value.
function normalizeConcurrency(value: unknown): number {
  return (isNumber(value) && value > 0) ? (value | 0) || Infinity : Infinity;
}

/**
 * @name AsyncPool
 * @category Async
 * @description A concurrency-limited async task pool with AbortSignal support.
 * Tasks start immediately when under the concurrency limit and are queued otherwise.
 * Each task receives the pool's AbortSignal for cooperative cancellation.
 *
 * Use `all()` to wait for all tasks (throws AggregateError on any failure)
 * or `allSettled()` to inspect individual results — mirroring the Promise static API.
 *
 * @example
 * const pool = new AsyncPool({ concurrency: 3, signal: controller.signal });
 * for (const chunk of chunks) {
 *   pool.add((signal) => fetch(chunk.url, { signal }));
 * }
 * await pool.all();
 *
 * @since 0.0.9
 */
export class AsyncPool {
  private limit: number;
  private activeCount: number;
  private readonly queue: CircularBuffer<PoolEntry>;
  // withResolvers result — single field replaces separate drainPromise + drainResolve
  private pending: ReturnType<typeof Promise.withResolvers<Array<PromiseSettledResult<unknown>>>> | null;
  private readonly signal: AbortSignal;
  private settled: Array<PromiseSettledResult<unknown>>;
  // Kept so the listener can be detached via dispose(), avoiding retention through a long-lived signal
  private readonly abortListener: (() => void) | null;
  // No aborted field — use this.signal.aborted directly (always in sync with the platform)

  constructor(options: AsyncPoolOptions = {}) {
    this.limit = normalizeConcurrency(options.concurrency);
    this.activeCount = 0;
    this.queue = new CircularBuffer<PoolEntry>();
    this.pending = null;
    this.signal = options.signal ?? NEVER_ABORT_SIGNAL;
    this.settled = [];

    if (options.signal) {
      this.abortListener = () => this.onAbort();
      options.signal.addEventListener('abort', this.abortListener, { once: true });
    }
    else {
      this.abortListener = null;
    }
  }

  /**
   * Detaches the pool's abort listener from the provided signal. Call this when the pool is no
   * longer needed but the signal outlives it (e.g. one long-lived controller feeding many pools),
   * otherwise the pool stays reachable through the signal's listener list and cannot be GC'd.
   */
  dispose(): void {
    if (this.abortListener)
      this.signal.removeEventListener('abort', this.abortListener);
  }

  get size(): number {
    return this.queue.length;
  }

  get active(): number {
    return this.activeCount;
  }

  get concurrency(): number {
    return this.limit;
  }

  /**
   * Updates the concurrency limit at runtime. If increased, queued tasks are started immediately
   * to fill the newly available slots.
   */
  set concurrency(value: number) {
    this.limit = normalizeConcurrency(value);
    this.fill();
  }

  /**
   * Adds a task to the pool. Starts immediately if under the concurrency limit; queues otherwise.
   * The task receives the pool's AbortSignal for cooperative cancellation.
   *
   * @param {(signal: AbortSignal) => Promise<T>} task
   * @returns {Promise<T>}
   */
  add<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> {
    // withResolvers — resolve/reject needed outside the promise for PoolEntry;
    // no executor closure, no captured variables
    const { promise, resolve, reject } = Promise.withResolvers<T>();
    if (this.signal.aborted) {
      reject(this.signal.reason);
      return promise;
    }
    const entry = { task, resolve, reject } as PoolEntry<T>;
    if (this.activeCount < this.limit) {
      this.run(entry);
    }
    else {
      this.queue.pushBack(entry);
    }
    return promise;
  }

  /**
   * Like `Promise.all` — resolves when all tasks complete; throws `AggregateError` if any failed.
   * Multiple concurrent callers share the same underlying promise.
   *
   * @returns {Promise<void>}
   */
  async all(): Promise<void> {
    const results = await this.waitForDrain();
    const errors: unknown[] = [];
    for (const r of results) {
      if (r.status === 'rejected')
        errors.push((r as PromiseRejectedResult).reason);
    }
    if (errors.length > 0)
      throw new AggregateError(errors, 'AsyncPool: one or more tasks failed');
  }

  /**
   * Like `Promise.allSettled` — always resolves with the settled result of every task.
   * Multiple concurrent callers share the same underlying promise.
   *
   * @returns {Promise<Array<PromiseSettledResult<unknown>>>}
   */
  allSettled(): Promise<Array<PromiseSettledResult<unknown>>> {
    return this.waitForDrain();
  }

  private waitForDrain(): Promise<Array<PromiseSettledResult<unknown>>> {
    if (this.activeCount === 0 && this.queue.isEmpty) {
      // Fast path — swap settled out immediately; no copy
      const results = this.settled;
      this.settled = [];
      return Promise.resolve(results);
    }
    if (this.pending !== null)
      return this.pending.promise; // idempotent — N callers share one promise

    this.pending = Promise.withResolvers();
    return this.pending.promise;
  }

  private run(entry: PoolEntry): void {
    this.activeCount++;

    let task: Promise<unknown>;

    // A task that throws synchronously must become a rejection, otherwise the
    // exception escapes add(), the concurrency slot leaks and the pool wedges forever.
    try {
      task = Promise.resolve(entry.task(this.signal));
    }
    catch (reason) {
      this.settled.push({ status: 'rejected', reason });
      entry.reject(reason);
      this.next();
      return;
    }

    task.then(
      (value) => {
        this.settled.push({ status: 'fulfilled', value });
        entry.resolve(value);
        this.next();
      },
      (reason) => {
        this.settled.push({ status: 'rejected', reason });
        entry.reject(reason);
        this.next();
      },
    );
  }

  private next(): void {
    this.activeCount--;
    this.fill();
  }

  // Central pump — fills available concurrency slots from the queue.
  // Exit point: flushes drain when queue and active are both empty.
  // Note: no abort check here — onAbort() drains the queue synchronously before
  // any microtask could call fill(), so by the time fill() runs, queue is already empty.
  private fill(): void {
    const q = this.queue;
    while (!q.isEmpty && this.activeCount < this.limit) {
      this.run(q.popFront() as PoolEntry);
    }
    if (q.isEmpty && this.activeCount === 0)
      this.flush();
  }

  private onAbort(): void {
    const reason = this.signal.reason;
    const q = this.queue;
    while (!q.isEmpty) {
      const entry = q.popFront() as PoolEntry;
      this.settled.push({ status: 'rejected', reason });
      entry.reject(reason);
    }
    if (this.activeCount === 0)
      this.flush();
  }

  private flush(): void {
    const drain = this.pending;

    // No waiter yet — keep `settled` intact so a later all()/allSettled() can still
    // observe the results of every task via the waitForDrain() fast path.
    if (drain === null)
      return;

    this.pending = null;
    // Swap — hand off current array, allocate fresh one; no element copy
    const results = this.settled;
    this.settled = [];
    drain.resolve(results);
  }
}
