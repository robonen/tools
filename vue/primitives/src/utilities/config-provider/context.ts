import type { App, ComputedRef, MaybeRefOrGetter, Ref, ShallowRef } from 'vue';
import type { AnyDateAdapter } from './date-adapter';
import { getCurrentScope, isRef, ref, shallowRef, toValue, watch } from 'vue';
import { useId as toolkitUseId, useInjectionStore } from '@robonen/vue';
import { nativeDateAdapter } from './date-adapter';

export type Direction = 'ltr' | 'rtl';

/**
 * Fine-grained control over the body scroll-lock compensation applied while a
 * modal layer (dialog, popover, menu, select) holds the page locked. Mirrors
 * the structure consumed by the global body-scroll-lock composable:
 *
 * - `padding` — compensate the removed scrollbar with right padding.
 * - `margin` — compensate the removed scrollbar with right margin.
 *
 * `true` reuses the measured scrollbar width; a `number`/`string` overrides it.
 */
export interface ScrollBodyOption {
  padding?: boolean | number | string;
  margin?: boolean | number | string;
}

export type UseIdFn = (
  deterministic?: MaybeRefOrGetter<string | undefined>,
  prefix?: string,
) => ComputedRef<string>;

export interface ConfigContext {
  /** Global reading direction inherited by every primitive. */
  dir: Ref<Direction>;
  /** Global locale inherited by date/calendar primitives. */
  locale: Ref<string>;
  /** Global CSP `nonce` inherited by style-injecting primitives. */
  nonce: Ref<string | undefined>;
  /** Global body scroll-lock compensation behavior. */
  scrollBody: Ref<boolean | ScrollBodyOption>;
  /** Global teleport/portal destination. */
  teleportTarget: ShallowRef<string | HTMLElement>;
  /** Pluggable id factory, used to control hydration-safe id generation. */
  useId: UseIdFn;
  /**
   * Pluggable date backend inherited by every date/calendar primitive. The
   * adapter is type-erased here; resolve it with `useDateAdapter<TDate>()` to
   * recover the concrete date type at the call site.
   */
  dateAdapter: ShallowRef<AnyDateAdapter>;
}

export interface ConfigOptions {
  /**
   * Global reading direction of the application, inherited by all primitives.
   * A per-component `dir` prop always overrides this.
   * @default 'ltr'
   */
  dir?: MaybeRefOrGetter<Direction | undefined>;
  /**
   * Global locale of the application, inherited by date/calendar primitives.
   * A per-component `locale` prop always overrides this.
   * @default 'en'
   */
  locale?: MaybeRefOrGetter<string | undefined>;
  /**
   * Global CSP `nonce`, inherited by primitives that inject a `<style>` tag.
   * A per-component `nonce` prop always overrides this.
   */
  nonce?: MaybeRefOrGetter<string | undefined>;
  /**
   * Global body scroll-lock compensation behavior, inherited by modal
   * primitives. `true` keeps the default padding compensation, `false`
   * disables it, or pass `{ padding, margin }` for fine-grained control.
   * @default true
   */
  scrollBody?: MaybeRefOrGetter<boolean | ScrollBodyOption | undefined>;
  /**
   * Global teleport/portal destination consumed by `Teleport`.
   * @default 'body'
   */
  teleportTarget?: MaybeRefOrGetter<string | HTMLElement | undefined>;
  /**
   * Pluggable id factory, useful as a workaround for hydration mismatches.
   * Signature matches the toolkit `useId`: `(deterministic?, prefix?)`.
   */
  useId?: UseIdFn;
  /**
   * Pluggable date backend inherited by date/calendar primitives, letting them
   * run on a custom calendar system or date library instead of the native
   * `Date`. A per-component `dateAdapter` prop always overrides this.
   * @default nativeDateAdapter
   */
  dateAdapter?: MaybeRefOrGetter<AnyDateAdapter | undefined>;
}

const DEFAULT_CONFIG = {
  dir: 'ltr' as Direction,
  locale: 'en',
  nonce: undefined as string | undefined,
  scrollBody: true as boolean | ScrollBodyOption,
  teleportTarget: 'body' as string | HTMLElement,
  dateAdapter: nativeDateAdapter as AnyDateAdapter,
};

/**
 * Builds a writable `Ref` from a `MaybeRefOrGetter` source while preserving its
 * reactivity:
 *
 * - a `Ref` source is reused directly (live + writable, zero overhead),
 * - a getter/value source becomes a writable ref that mirrors later source
 *   updates via a scoped watcher (no leak when no scope is active, e.g.
 *   app-level provisioning, where the snapshot is the documented behavior).
 *
 * This fixes the prior snapshot-into-a-fresh-ref behavior that silently
 * disconnected a reactive `dir`/`teleportTarget`/`locale` source.
 */
function resolveConfigRef<T>(
  source: MaybeRefOrGetter<T | undefined> | undefined,
  fallback: T,
  shallow = false,
): Ref<T> {
  if (isRef(source))
    return source as Ref<T>;

  const initial = source === undefined ? fallback : (toValue(source) ?? fallback);
  const target = (shallow ? shallowRef(initial) : ref(initial)) as Ref<T>;

  // Only a getter (function) can carry live reactivity beyond the snapshot.
  if (typeof source === 'function' && getCurrentScope()) {
    watch(
      () => toValue(source) ?? fallback,
      (next) => { target.value = next; },
    );
  }

  return target;
}

function resolveContext(options?: ConfigOptions): ConfigContext {
  return {
    dir: resolveConfigRef(options?.dir, DEFAULT_CONFIG.dir),
    locale: resolveConfigRef(options?.locale, DEFAULT_CONFIG.locale),
    nonce: resolveConfigRef(options?.nonce, DEFAULT_CONFIG.nonce),
    scrollBody: resolveConfigRef(options?.scrollBody, DEFAULT_CONFIG.scrollBody),
    teleportTarget: resolveConfigRef(
      options?.teleportTarget,
      DEFAULT_CONFIG.teleportTarget,
      true,
    ) as ShallowRef<string | HTMLElement>,
    useId: options?.useId ?? toolkitUseId,
    dateAdapter: resolveConfigRef(
      options?.dateAdapter,
      DEFAULT_CONFIG.dateAdapter,
      true,
    ) as ShallowRef<AnyDateAdapter>,
  };
}

/**
 * Global config store, backed by the toolkit's `useInjectionStore`. Each
 * `provideConfig`/`provideAppConfig` call builds a fresh `ConfigContext` from
 * the given options and provides it; `useConfig` injects it, falling back to a
 * fully-resolved default context (all fields present, native date adapter) when
 * no provider exists above the consumer.
 */
const ConfigStore = useInjectionStore(resolveContext, {
  injectionName: 'ConfigContext',
  defaultValue: resolveContext(),
});

export function provideConfig(options?: ConfigOptions): ConfigContext {
  return ConfigStore.useProvidingState(options);
}

export function provideAppConfig(app: App, options?: ConfigOptions): ConfigContext {
  return ConfigStore.useAppProvidingState(app)(options);
}

export function useConfig(): ConfigContext {
  return ConfigStore.useInjectedState();
}
