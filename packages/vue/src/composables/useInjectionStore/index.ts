import { inject, provide, type App, type InjectionKey } from 'vue';

export interface useInjectionStoreOptions<Return> {
  injectionKey: string | InjectionKey<Return>;
  defaultValue?: Return;
}

/**
 * @name useInjectionStore
 * @category State
 * @description Create a global state that can be injected into components
 * 
 * @param {Function} stateFactory A factory function that creates the state
 * @param {useInjectionStoreOptions} options An object with the following properties
 * @param {string | InjectionKey} options.injectionKey The key to use for the injection
 * @param {any} options.defaultValue The default value to use when the state is not provided
 * @returns {Object} An object with `useProvidingState`, `useAppProvidingState`, and `useInjectedState` functions
 * 
 * @example
 * const { useProvidingState, useInjectedState } = useInjectionStore(() => ref('Hello World'));
 * 
 * // In a parent component
 * const state = useProvidingState();
 * 
 * // In a child component
 * const state = useInjectedState();
 * 
 * @example
 * const { useProvidingState, useInjectedState } = useInjectionStore(() => ref('Hello World'), {
 *  injectionKey: 'MyState',
 *  defaultValue: 'Default Value'
 * });
 * 
 * // In a plugin
 * {
 *  install(app) {
 *   const state = useAppProvidingState(app)();
 *   state.value = 'Hello World';
 *  }
 * }
 * 
 * // In a component
 * const state = useInjectedState();
 * 
 * @since 0.0.5
 */
export function useInjectionStore<Args extends any[], Return>(
  stateFactory: (...args: Args) => Return,
  options?: useInjectionStoreOptions<Return>,
) {
  const key = options?.injectionKey ?? Symbol(stateFactory.name ?? 'InjectionStore');

  const useProvidingState = (...args: Args) => {
    const state = stateFactory(...args);
    provide(key, state);
    return state;
  };

  const useAppProvidingState = (app: App) => (...args: Args) => {
    const state = stateFactory(...args);
    app.provide(key, state);
    return state;
  };

  const useInjectedState = () => inject(key, options?.defaultValue);

  return {
    useProvidingState,
    useAppProvidingState,
    useInjectedState
  };
}