import type { App, MaybeRefOrGetter, Ref, ShallowRef, UnwrapRef } from 'vue';
import { ref, shallowRef, toValue } from 'vue';
import { useContextFactory } from '@robonen/vue';

export type Direction = 'ltr' | 'rtl';

export interface ConfigContext {
  dir: Ref<Direction>;
  teleportTarget: ShallowRef<string | HTMLElement>;
}

export interface ConfigOptions {
  dir?: MaybeRefOrGetter<Direction>;
  teleportTarget?: MaybeRefOrGetter<string | HTMLElement>;
}

const DEFAULT_CONFIG: UnwrapRef<ConfigContext> = {
  dir: 'ltr',
  teleportTarget: 'body',
};

const ConfigCtx = useContextFactory<ConfigContext>('ConfigContext');

function resolveContext(options?: ConfigOptions): ConfigContext {
  return {
    dir: ref(toValue(options?.dir) ?? DEFAULT_CONFIG.dir),
    teleportTarget: shallowRef(toValue(options?.teleportTarget) ?? DEFAULT_CONFIG.teleportTarget),
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
