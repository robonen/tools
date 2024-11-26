import {inject, provide, type InjectionKey, type App} from 'vue';
import { VueToolsError } from '../..';

/**
 * @name useContextFactory
 * @category Utilities
 * @description A composable that provides a factory for creating context with unique key
 * 
 * @param {string} name The name of the context
 * @returns {Object} An object with `inject`, `provide` and `key` properties
 * @throws {VueToolsError} when the context is not provided
 * 
 * @example
 * const { inject, provide } = useContextFactory('MyContext');
 *
 * provide('Hello World');
 * const value = inject();
 *
 * @example
 * const { inject: injectContext, provide: provideContext } = useContextFactory('MyContext');
 *
 * // In a plugin
 * {
 *   install(app) {
 *      provideContext('Hello World', app);
 *   }
 * }
 *
 * // In a component
 * const value = injectContext();
 *
 * @since 0.0.1
 */
export function useContextFactory<ContextValue>(name: string) {  
    const injectionKey: InjectionKey<ContextValue> = Symbol(name);

    const injectContext = <Fallback extends ContextValue = ContextValue>(fallback?: Fallback) => {
        const context = inject(injectionKey, fallback);

        if (context !== undefined)
          return context;

        throw new VueToolsError(`useContextFactory: '${name}' context is not provided`);
    };

    const provideContext = (context: ContextValue, app?: App) => {
        (app?.provide ?? provide)(injectionKey, context);
        return context;
    };

    return {
        inject: injectContext,
        provide: provideContext,
        key: injectionKey,
    }
}