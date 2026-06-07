import { isRef, nextTick, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, WatchOptions, WatchSource } from 'vue';

type ElementOf<T> = T extends Array<infer E> ? E : never;

type Falsy = false | void | null | undefined | 0 | 0n | '';

export interface UntilToMatchOptions {
  /**
   * Milliseconds timeout for promise to resolve/reject if the when condition does not meet.
   * 0 for never timed out
   *
   * @default 0
   */
  timeout?: number;

  /**
   * Reject the promise when timeout
   *
   * @default false
   */
  throwOnTimeout?: boolean;

  /**
   * `flush` option for internal watch
   *
   * @default 'sync'
   */
  flush?: WatchOptions['flush'];

  /**
   * `deep` option for internal watch
   *
   * @default 'false'
   */
  deep?: WatchOptions['deep'];
}

export interface UntilBaseInstance<T, Not extends boolean = false> {
  toMatch: (<U extends T = T>(
    condition: (v: T) => v is U,
    options?: UntilToMatchOptions,
  ) => Not extends true ? Promise<Exclude<T, U>> : Promise<U>) & ((
    condition: (v: T) => boolean,
    options?: UntilToMatchOptions,
  ) => Promise<T>);
  changed: (options?: UntilToMatchOptions) => Promise<T>;
  changedTimes: (n?: number, options?: UntilToMatchOptions) => Promise<T>;
}

export interface UntilValueInstance<T, Not extends boolean = false> extends UntilBaseInstance<T, Not> {
  readonly not: UntilValueInstance<T, Not extends true ? false : true>;
  toBe: <P = T>(value: MaybeRefOrGetter<P>, options?: UntilToMatchOptions) => Not extends true ? Promise<T> : Promise<P>;
  toBeTruthy: (options?: UntilToMatchOptions) => Not extends true ? Promise<T & Falsy> : Promise<Exclude<T, Falsy>>;
  toBeNull: (options?: UntilToMatchOptions) => Not extends true ? Promise<Exclude<T, null>> : Promise<null>;
  toBeUndefined: (options?: UntilToMatchOptions) => Not extends true ? Promise<Exclude<T, undefined>> : Promise<undefined>;
  toBeNaN: (options?: UntilToMatchOptions) => Promise<T>;
}

export interface UntilArrayInstance<T> extends UntilBaseInstance<T> {
  readonly not: UntilArrayInstance<T>;
  toContains: (value: MaybeRefOrGetter<ElementOf<T>>, options?: UntilToMatchOptions) => Promise<T>;
}

function promiseTimeout(ms: number, throwOnTimeout = false, reason = 'Timeout'): Promise<void> {
  return new Promise((resolve, reject) => {
    if (throwOnTimeout)
      setTimeout(() => reject(reason), ms);
    else
      setTimeout(resolve, ms);
  });
}

function createUntil<T>(r: WatchSource<T> | MaybeRefOrGetter<T>, isNot = false): UntilValueInstance<T, boolean> | UntilArrayInstance<T> {
  function toMatch(
    condition: (v: T) => boolean,
    { flush = 'sync', deep = false, timeout, throwOnTimeout }: UntilToMatchOptions = {},
  ): Promise<T> {
    let stop: (() => void) | null = null;
    const watcher = new Promise<T>((resolve) => {
      stop = watch(
        r as WatchSource<T>,
        (v) => {
          if (condition(v) !== isNot) {
            if (stop)
              stop();
            else
              nextTick(() => stop?.());

            resolve(v);
          }
        },
        {
          flush,
          deep,
          immediate: true,
        },
      );
    });

    const promises = [watcher];
    if (timeout !== null && timeout !== undefined) {
      promises.push(
        promiseTimeout(timeout, throwOnTimeout)
          .then(() => toValue(r as MaybeRefOrGetter<T>))
          .finally(() => stop?.()),
      );
    }

    return Promise.race(promises);
  }

  function toBe<P>(value: MaybeRefOrGetter<P | T>, options?: UntilToMatchOptions): Promise<T> {
    if (!isRef(value))
      return toMatch(v => v === value, options);

    const { flush = 'sync', deep = false, timeout, throwOnTimeout } = options ?? {};
    let stop: (() => void) | null = null;
    const watcher = new Promise<T>((resolve) => {
      stop = watch(
        [r as WatchSource<T>, value],
        ([v1, v2]) => {
          if (isNot !== (v1 === v2)) {
            if (stop)
              stop();
            else
              nextTick(() => stop?.());

            resolve(v1 as T);
          }
        },
        {
          flush,
          deep,
          immediate: true,
        },
      );
    });

    const promises = [watcher];
    if (timeout !== null && timeout !== undefined) {
      promises.push(
        promiseTimeout(timeout, throwOnTimeout)
          .then(() => toValue(r as MaybeRefOrGetter<T>))
          .finally(() => stop?.()),
      );
    }

    return Promise.race(promises);
  }

  function toBeTruthy(options?: UntilToMatchOptions): Promise<T> {
    return toMatch(v => Boolean(v), options);
  }

  function toBeNull(options?: UntilToMatchOptions): Promise<T> {
    return toBe<null>(null, options);
  }

  function toBeUndefined(options?: UntilToMatchOptions): Promise<T> {
    return toBe<undefined>(undefined, options);
  }

  function toBeNaN(options?: UntilToMatchOptions): Promise<T> {
    return toMatch(Number.isNaN, options);
  }

  function toContains(value: MaybeRefOrGetter<ElementOf<T>>, options?: UntilToMatchOptions): Promise<T> {
    return toMatch((v) => {
      const array = Array.from(v as Iterable<unknown>);
      return array.includes(value) || array.includes(toValue(value));
    }, options);
  }

  function changed(options?: UntilToMatchOptions): Promise<T> {
    return changedTimes(1, options);
  }

  function changedTimes(n = 1, options?: UntilToMatchOptions): Promise<T> {
    let count = -1;
    return toMatch(() => {
      count += 1;
      return count >= n;
    }, options);
  }

  if (Array.isArray(toValue(r as MaybeRefOrGetter<T>))) {
    const instance: UntilArrayInstance<T> = {
      toMatch: toMatch as UntilArrayInstance<T>['toMatch'],
      toContains,
      changed,
      changedTimes,
      get not() {
        return createUntil(r, !isNot) as UntilArrayInstance<T>;
      },
    };
    return instance;
  }

  const instance: UntilValueInstance<T, boolean> = {
    toMatch: toMatch as UntilValueInstance<T, boolean>['toMatch'],
    toBe: toBe as UntilValueInstance<T, boolean>['toBe'],
    toBeTruthy: toBeTruthy as UntilValueInstance<T, boolean>['toBeTruthy'],
    toBeNull: toBeNull as UntilValueInstance<T, boolean>['toBeNull'],
    toBeNaN,
    toBeUndefined: toBeUndefined as UntilValueInstance<T, boolean>['toBeUndefined'],
    changed,
    changedTimes,
    get not() {
      return createUntil(r, !isNot) as UntilValueInstance<T, boolean>;
    },
  };

  return instance;
}

/**
 * @name until
 * @category Reactivity
 * @description Promised one-time watch for ref / getter changes. Resolve once the source matches a condition, optionally with a timeout.
 *
 * @param {WatchSource<T> | MaybeRefOrGetter<T>} r The reactive source to watch
 * @returns {UntilValueInstance<T> | UntilArrayInstance<T>} A chainable instance exposing `toBe`, `toBeTruthy`, `toBeNull`, `toBeUndefined`, `toBeNaN`, `toMatch`, `toContains`, `changed`, `changedTimes`, and the `not` negation
 *
 * @example
 * const count = ref(0);
 * await until(count).toBe(7);
 *
 * @example
 * const ready = ref(false);
 * await until(ready).toBeTruthy();
 *
 * @example
 * // negation and timeout
 * await until(count).not.toBe(0, { timeout: 1000, throwOnTimeout: true });
 *
 * @example
 * // resolve once the source changes n times
 * await until(count).changedTimes(3);
 *
 * @since 0.0.15
 */
export function until<T extends unknown[]>(r: WatchSource<T> | MaybeRefOrGetter<T>): UntilArrayInstance<T>;
export function until<T>(r: WatchSource<T> | MaybeRefOrGetter<T>): UntilValueInstance<T>;
export function until<T>(r: WatchSource<T> | MaybeRefOrGetter<T>): UntilValueInstance<T> | UntilArrayInstance<T> {
  return createUntil(r);
}
