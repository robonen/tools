import { inject, provide, type InjectionKey } from 'vue';
import { VueToolsError } from '../..';

/**
 * @name useContextFactory
 * @category Utilities
 * @description A composable that provides a factory for creating context with unique key
 * 
 * @param {string} name The name of the context
 * @returns {readonly [injectContext, provideContext]} The context factory
 * @throws {VueToolsError} when the context is not provided
 * 
 * @example
 * const [injectContext, provideContext] = useContextFactory('MyContext');
 */
export function useContextFactory<ContextValue>(name: string) {  
    const injectionKey: InjectionKey<ContextValue> = Symbol(name);

    const injectContext = <Fallback extends ContextValue = ContextValue>(fallback?: Fallback) => {
        const context = inject(injectionKey, fallback);

        if (context !== undefined)
          return context;

        throw new VueToolsError(`useContextFactory: '${name}' context is not provided`);
    };

    const provideContext = (context: ContextValue) => {
        provide(injectionKey, context);
        return context;
    };

    return [injectContext, provideContext] as const;
  }