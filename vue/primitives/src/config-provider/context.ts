import type { App, ComputedRef, MaybeRefOrGetter, Ref, ShallowRef } from 'vue';
import { ref, shallowRef, toValue } from 'vue';
import { useId as toolkitUseId, useContextFactory } from '@robonen/vue';

export type Direction = 'ltr' | 'rtl';

export type UseIdFn = (
  deterministic?: MaybeRefOrGetter<string | undefined>,
  prefix?: string,
) => ComputedRef<string>;

export interface ConfigContext {
  dir: Ref<Direction>;
  teleportTarget: ShallowRef<string | HTMLElement>;
  useId: UseIdFn;
}

export interface ConfigOptions {
  dir?: MaybeRefOrGetter<Direction>;
  teleportTarget?: MaybeRefOrGetter<string | HTMLElement>;
  useId?: UseIdFn;
}

const DEFAULT_CONFIG = {
  dir: 'ltr' as Direction,
  teleportTarget: 'body' as string | HTMLElement,
};

const ConfigCtx = useContextFactory<ConfigContext>('ConfigContext');

function resolveContext(options?: ConfigOptions): ConfigContext {
  return {
    dir: ref(toValue(options?.dir) ?? DEFAULT_CONFIG.dir),
    teleportTarget: shallowRef(toValue(options?.teleportTarget) ?? DEFAULT_CONFIG.teleportTarget),
    useId: options?.useId ?? toolkitUseId,
  };
}

export function provideConfig(options?: ConfigOptions): ConfigContext {
  return ConfigCtx.provide(resolveContext(options));
}

export function provideAppConfig(app: App, options?: ConfigOptions): ConfigContext {
  return ConfigCtx.appProvide(app)(resolveContext(options));
}

export function useConfig(): ConfigContext {
  return ConfigCtx.inject(resolveContext());
}
