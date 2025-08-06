import { inject as vueInject, provide as vueProvide, type InjectionKey, type App } from 'vue';
import { VueToolsError } from '../..';

/**
 * @name useContextFactory
 * @category State
 * @description A composable that provides a factory for creating context with unique key
 * 
 * @param {string} name The name of the context
 * @returns {Object} An object with `inject`, `provide`, `appProvide` and `key` properties
 * @throws {VueToolsError} when the context is not provided
 * 
 * @example
 * const { inject, provide } = useContextFactory('MyContext');
 *
 * provide('Hello World');
 * const value = inject();
 *
 * @example
 * const { inject: injectContext, appProvide } = useContextFactory('MyContext');
 *
 * // In a plugin
 * {
 *   install(app) {
 *      appProvide(app)('Hello World');
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

    const inject = <Fallback extends ContextValue = ContextValue>(fallback?: Fallback) => {
        const context = vueInject(injectionKey, fallback);

        if (context !== undefined)
            return context;

        throw new VueToolsError(`useContextFactory: '${name}' context is not provided`);
    };

    const provide = (context: ContextValue) => {
        vueProvide(injectionKey, context);
        return context;
    };

    const appProvide = (app: App) => (context: ContextValue) => {
        app.provide(injectionKey, context);
        return context;
    };

    return {
        inject,
        provide,
        appProvide,
        key: injectionKey,
    }
}