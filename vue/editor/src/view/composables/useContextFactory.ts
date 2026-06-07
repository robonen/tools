import type { App, InjectionKey } from 'vue';
import { inject as vueInject, provide as vueProvide } from 'vue';

/**
 * Factory for a strongly-typed provide/inject pair keyed by a unique Symbol.
 * Local copy of the `@robonen/vue` helper so the editor stays self-contained.
 */
export function useContextFactory<ContextValue>(name: string) {
  const injectionKey: InjectionKey<ContextValue> = Symbol(name);

  const inject = <Fallback extends ContextValue = ContextValue>(fallback?: Fallback) => {
    const context = vueInject(injectionKey, fallback);

    if (context !== undefined)
      return context;

    throw new Error(`useContextFactory: '${name}' context is not provided`);
  };

  const provide = (context: ContextValue) => {
    vueProvide(injectionKey, context);
    return context;
  };

  const appProvide = (app: App) => (context: ContextValue) => {
    app.provide(injectionKey, context);
    return context;
  };

  return { inject, provide, appProvide, key: injectionKey };
}
