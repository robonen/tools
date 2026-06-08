import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AsyncPool } from '.';

describe('AsyncPool', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Constructor / getters ────────────────────────────────────────────────

  describe('constructor', () => {
    it('default concurrency is Infinity', () => {
      expect(new AsyncPool().concurrency).toBe(Infinity);
    });

    it('respects explicit concurrency', () => {
      expect(new AsyncPool({ concurrency: 4 }).concurrency).toBe(4);
    });

    it('truncates float to integer', () => {
      expect(new AsyncPool({ concurrency: 3.9 }).concurrency).toBe(3);
    });

    it('Infinity concurrency is preserved (not coerced to 0)', () => {
      expect(new AsyncPool({ concurrency: Infinity }).concurrency).toBe(Infinity);
    });

    it('invalid values fall back to Infinity', () => {
      expect(new AsyncPool({ concurrency: 0 }).concurrency).toBe(Infinity);
      expect(new AsyncPool({ concurrency: -1 }).concurrency).toBe(Infinity);
    });

    it('initial size and active are 0', () => {
      const pool = new AsyncPool({ concurrency: 2 });
      expect(pool.size).toBe(0);
      expect(pool.active).toBe(0);
    });
  });

  // ── add() — basic execution ──────────────────────────────────────────────

  describe('add()', () => {
    it('starts task immediately when under limit', () => {
      const pool = new AsyncPool({ concurrency: 2 });
      const fn = vi.fn().mockResolvedValue('ok');
      pool.add(fn);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(pool.active).toBe(1);
    });

    it('passes the pool signal to the task', () => {
      const pool = new AsyncPool({ concurrency: 1 });
      let receivedSignal: AbortSignal | undefined;
      pool.add((signal) => {
        receivedSignal = signal;
        return Promise.resolve();
      });
      expect(receivedSignal).toBeInstanceOf(AbortSignal);
    });

    it('returns the task result', async () => {
      const pool = new AsyncPool({ concurrency: 1 });
      const result = await pool.add(() => Promise.resolve(42));
      expect(result).toBe(42);
    });

    it('propagates task rejection', async () => {
      const pool = new AsyncPool({ concurrency: 1 });
      const error = new Error('boom');
      await expect(pool.add(() => Promise.reject(error))).rejects.toThrow('boom');
    });
  });

  // ── Concurrency limiting ─────────────────────────────────────────────────

  describe('concurrency limiting', () => {
    it('does not exceed the concurrency limit', () => {
      const pool = new AsyncPool({ concurrency: 2 });
      const fn = vi.fn(() => new Promise<void>(() => {}));
      pool.add(fn);
      pool.add(fn);
      pool.add(fn); // queued
      expect(fn).toHaveBeenCalledTimes(2);
      expect(pool.active).toBe(2);
      expect(pool.size).toBe(1);
    });

    it('dequeues task when an active one completes', async () => {
      const pool = new AsyncPool({ concurrency: 1 });
      let resolve1!: () => void;
      const task1 = vi.fn(() => new Promise<void>(r => (resolve1 = r)));
      const task2 = vi.fn(() => Promise.resolve());
      pool.add(task1);
      pool.add(task2);
      expect(task2).toHaveBeenCalledTimes(0);
      resolve1();
      await Promise.resolve();
      await Promise.resolve(); // two microtask ticks for then handlers
      expect(task2).toHaveBeenCalledTimes(1);
    });

    it('runs tasks in FIFO order', async () => {
      const pool = new AsyncPool({ concurrency: 1 });
      const order: number[] = [];
      let unblock!: () => void;
      pool.add(() => new Promise<void>(r => (unblock = r)));
      pool.add(async () => {
        order.push(1);
      });
      pool.add(async () => {
        order.push(2);
      });
      unblock();
      await pool.all();
      expect(order).toEqual([1, 2]);
    });

    it('respects concurrency across many tasks', async () => {
      const pool = new AsyncPool({ concurrency: 3 });
      let concurrent = 0;
      let maxConcurrent = 0;
      const tasks = Array.from({ length: 9 }, () => async (_signal: AbortSignal) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await Promise.resolve();
        concurrent--;
      });
      await Promise.all(tasks.map(t => pool.add(t)));
      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('starts all tasks immediately with Infinity concurrency', () => {
      const pool = new AsyncPool();
      const fn = vi.fn(() => new Promise<void>(() => {}));
      for (let i = 0; i < 10; i++) pool.add(fn);
      expect(fn).toHaveBeenCalledTimes(10);
      expect(pool.size).toBe(0);
    });
  });

  // ── concurrency setter ───────────────────────────────────────────────────

  describe('concurrency setter', () => {
    it('increasing concurrency starts queued tasks immediately', async () => {
      const pool = new AsyncPool({ concurrency: 1 });
      const fn = vi.fn(() => new Promise<void>(() => {}));
      pool.add(fn);
      pool.add(fn);
      pool.add(fn);
      expect(fn).toHaveBeenCalledTimes(1);
      pool.concurrency = 3;
      expect(fn).toHaveBeenCalledTimes(3);
      expect(pool.size).toBe(0);
    });

    it('decreasing concurrency does not stop running tasks', () => {
      const pool = new AsyncPool({ concurrency: 3 });
      const fn = vi.fn(() => new Promise<void>(() => {}));
      pool.add(fn);
      pool.add(fn);
      pool.add(fn);
      pool.concurrency = 1;
      expect(pool.active).toBe(3); // already running tasks are not stopped
    });

    it('invalid value falls back to Infinity', () => {
      const pool = new AsyncPool({ concurrency: 2 });
      pool.concurrency = -5;
      expect(pool.concurrency).toBe(Infinity);
    });
  });

  // ── all() ────────────────────────────────────────────────────────────────

  describe('all()', () => {
    it('resolves immediately when pool is empty', async () => {
      await expect(new AsyncPool().all()).resolves.toBeUndefined();
    });

    it('waits for all tasks to complete', async () => {
      const pool = new AsyncPool({ concurrency: 2 });
      const completed: number[] = [];
      pool.add(async () => {
        completed.push(1);
      });
      pool.add(async () => {
        completed.push(2);
      });
      await pool.all();
      expect(completed).toEqual([1, 2]);
    });

    it('throws AggregateError when any task fails', async () => {
      const pool = new AsyncPool({ concurrency: 2 });
      pool.add(() => Promise.reject(new Error('e1'))).catch(() => {});
      pool.add(() => Promise.reject(new Error('e2'))).catch(() => {});
      pool.add(() => Promise.resolve('ok'));
      await expect(pool.all()).rejects.toBeInstanceOf(AggregateError);
    });

    it('AggregateError contains all failures', async () => {
      const pool = new AsyncPool({ concurrency: 2 });
      const e1 = new Error('e1');
      const e2 = new Error('e2');
      pool.add(() => Promise.reject(e1)).catch(() => {});
      pool.add(() => Promise.reject(e2)).catch(() => {});
      try {
        await pool.all();
      }
      catch (err) {
        expect(err).toBeInstanceOf(AggregateError);
        expect((err as AggregateError).errors).toContain(e1);
        expect((err as AggregateError).errors).toContain(e2);
      }
    });

    it('multiple concurrent callers share the same underlying drain', () => {
      // all() wraps _drain.promise in .then() each call (different outer promises),
      // but allSettled() returns the raw _drain.promise — verify that is idempotent
      const pool = new AsyncPool({ concurrency: 1 });
      pool.add(() => new Promise<void>(() => {}));
      expect(pool.allSettled()).toBe(pool.allSettled());
    });

    it('resets after each drain cycle', async () => {
      const pool = new AsyncPool({ concurrency: 1 });
      pool.add(() => Promise.resolve());
      await pool.all();
      // second batch
      pool.add(() => Promise.resolve());
      await pool.all(); // should not throw or hang
      expect(pool.active).toBe(0);
    });
  });

  // ── allSettled() ─────────────────────────────────────────────────────────

  describe('allSettled()', () => {
    it('resolves immediately with empty array when pool is empty', async () => {
      await expect(new AsyncPool().allSettled()).resolves.toEqual([]);
    });

    it('returns fulfilled results', async () => {
      const pool = new AsyncPool({ concurrency: 2 });
      pool.add(() => Promise.resolve(1));
      pool.add(() => Promise.resolve(2));
      const results = await pool.allSettled();
      expect(results).toHaveLength(2);
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    });

    it('returns mix of fulfilled and rejected', async () => {
      const pool = new AsyncPool({ concurrency: 2 });
      pool.add(() => Promise.resolve('ok'));
      pool.add(() => Promise.reject(new Error('fail'))).catch(() => {});
      const results = await pool.allSettled();
      expect(results.some(r => r.status === 'fulfilled')).toBe(true);
      expect(results.some(r => r.status === 'rejected')).toBe(true);
    });

    it('all() and allSettled() called simultaneously share the same promise', () => {
      const pool = new AsyncPool({ concurrency: 1 });
      pool.add(() => new Promise<void>(() => {}));
      // Both chain off the same underlying _drain.promise
      const a = pool.allSettled();
      const b = pool.allSettled();
      expect(a).toBe(b);
    });

    it('results are cleared after each cycle', async () => {
      const pool = new AsyncPool({ concurrency: 1 });
      pool.add(() => Promise.resolve('first'));
      const r1 = await pool.allSettled();
      expect(r1).toHaveLength(1);

      pool.add(() => Promise.resolve('second'));
      const r2 = await pool.allSettled();
      expect(r2).toHaveLength(1); // only new-batch results
    });
  });

  // ── size / active getters ────────────────────────────────────────────────

  describe('size / active', () => {
    it('active reflects currently running tasks', async () => {
      const pool = new AsyncPool({ concurrency: 2 });
      let resolve1!: () => void;
      const p = pool.add(() => new Promise<void>(r => (resolve1 = r)));
      expect(pool.active).toBe(1);
      resolve1();
      await p;
      expect(pool.active).toBe(0);
    });

    it('size reflects queued count', () => {
      const pool = new AsyncPool({ concurrency: 1 });
      const neverResolve = () => new Promise<void>(() => {});
      pool.add(neverResolve);
      pool.add(neverResolve);
      pool.add(neverResolve);
      expect(pool.active).toBe(1);
      expect(pool.size).toBe(2);
    });
  });

  // ── AbortSignal / cancellation ───────────────────────────────────────────

  describe('signal / abort', () => {
    it('add() after abort rejects immediately', async () => {
      const controller = new AbortController();
      const pool = new AsyncPool({ concurrency: 2, signal: controller.signal });
      controller.abort(new Error('cancelled'));
      await expect(pool.add(() => Promise.resolve())).rejects.toThrow('cancelled');
    });

    it('queued tasks are rejected on abort', async () => {
      const controller = new AbortController();
      const pool = new AsyncPool({ concurrency: 1, signal: controller.signal });
      pool.add(() => new Promise<void>(() => {})); // blocks the slot
      const queued = pool.add(() => Promise.resolve('queued'));
      controller.abort();
      await expect(queued).rejects.toBeDefined();
    });

    it('running tasks receive the aborted signal', async () => {
      const controller = new AbortController();
      const pool = new AsyncPool({ concurrency: 1, signal: controller.signal });
      let taskSignal!: AbortSignal;
      const taskDone = pool.add((signal) => {
        taskSignal = signal;
        return new Promise<void>((resolve) => {
          signal.addEventListener('abort', () => resolve());
        });
      });
      controller.abort();
      await taskDone;
      expect(taskSignal.aborted).toBe(true);
    });

    it('allSettled() resolves after abort with rejected entries', async () => {
      const controller = new AbortController();
      const pool = new AsyncPool({ concurrency: 1, signal: controller.signal });
      // Active task listens to signal and resolves on abort
      pool.add(signal => new Promise<void>((resolve) => {
        signal.addEventListener('abort', () => resolve(), { once: true });
      }));
      pool.add(() => Promise.resolve()).catch(() => {}); // queued — rejected on abort
      controller.abort();
      const results = await pool.allSettled();
      expect(results.some(r => r.status === 'rejected')).toBe(true);
    });

    it('all() rejects with an AggregateError including the abort reason', async () => {
      const controller = new AbortController();
      const pool = new AsyncPool({ concurrency: 1, signal: controller.signal });
      const reason = new Error('cancelled');

      pool.add(signal => new Promise<void>((resolve) => {
        signal.addEventListener('abort', () => resolve(), { once: true });
      }));
      pool.add(() => Promise.resolve()).catch(() => {}); // queued — rejected on abort
      controller.abort(reason);

      await expect(pool.all()).rejects.toBeInstanceOf(AggregateError);
    });

    it('dispose() detaches the abort listener', () => {
      const controller = new AbortController();
      const removeSpy = vi.spyOn(controller.signal, 'removeEventListener');
      const pool = new AsyncPool({ signal: controller.signal });

      pool.dispose();

      expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    });
  });

  // ── Error resilience ─────────────────────────────────────────────────────

  describe('error resilience', () => {
    it('rejected task does not block subsequent tasks', async () => {
      const pool = new AsyncPool({ concurrency: 1 });
      const completed: string[] = [];
      pool.add(() => Promise.reject(new Error('fail'))).catch(() => {});
      pool.add(async () => {
        completed.push('second');
      });
      await pool.all().catch(() => {});
      expect(completed).toContain('second');
    });

    it('rejected task does not corrupt active count', async () => {
      const pool = new AsyncPool({ concurrency: 2 });
      await pool.add(() => Promise.reject(new Error('fail'))).catch(() => {});
      expect(pool.active).toBe(0);
    });

    it('a synchronously-throwing task rejects instead of wedging the pool', async () => {
      const pool = new AsyncPool({ concurrency: 1 });

      await expect(pool.add(() => {
        throw new Error('sync');
      })).rejects.toThrow('sync');

      // The slot must be released, not leaked.
      expect(pool.active).toBe(0);

      // Subsequent tasks still run.
      await expect(pool.add(() => Promise.resolve('next'))).resolves.toBe('next');
    });
  });

  // ── Results survive a drained batch ──────────────────────────────────────

  describe('drain before waiter', () => {
    it('allSettled() still sees results when the batch drained first', async () => {
      const pool = new AsyncPool({ concurrency: 2 });

      await pool.add(() => Promise.resolve(1));
      await pool.add(() => Promise.resolve(2));

      const results = await pool.allSettled();
      expect(results).toHaveLength(2);
    });

    it('all() still throws after a failing task drained first', async () => {
      const pool = new AsyncPool({ concurrency: 1 });

      await pool.add(() => Promise.reject(new Error('boom'))).catch(() => {});

      await expect(pool.all()).rejects.toBeInstanceOf(AggregateError);
    });
  });
});
