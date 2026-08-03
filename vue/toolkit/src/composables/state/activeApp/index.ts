import { getCurrentInstance, hasInjectionContext, inject } from 'vue';
import type { App, InjectionKey, Plugin } from 'vue';
import { VueToolsError } from '@/utils';

type InjectDefaults<Value> = [defaultValue?: Value | (() => Value), treatDefaultAsFactory?: boolean];

let activeApp: App | undefined;

/**
 * @name setActiveApp
 * @category State
 * @description Registers the Vue app instance used by `getActiveApp`, `runWithApp` and `injectWithApp`
 * outside of component context. Pass `undefined` to clear the registration.
 *
 * The registration is module-global (one slot per JS realm). On the client this is exactly
 * what you want; on the server create one app per request and prefer passing the app
 * explicitly to `runWithApp` instead of relying on the global slot, otherwise concurrent
 * requests may observe each other's app.
 *
 * @param {App | undefined} app The app to register, or `undefined` to clear
 * @returns {App | undefined} The same app, for chaining
 *
 * @example
 * // main.ts
 * const app = createApp(App);
 * setActiveApp(app);
 *
 * @since 0.1.0
 */
export function setActiveApp(app: App | undefined) {
  activeApp = app;
  return app;
}

/**
 * @name getActiveApp
 * @category State
 * @description Returns the closest Vue app instance: the current component's app when called
 * during setup (or anywhere `getCurrentInstance` works), otherwise the app registered via
 * `setActiveApp` / `activeAppPlugin`.
 *
 * @returns {App | undefined} The resolved app, or `undefined` when none is available
 *
 * @example
 * const app = getActiveApp();
 * app?.config.globalProperties;
 *
 * @since 0.1.0
 */
export function getActiveApp(): App | undefined {
  return getCurrentInstance()?.appContext.app ?? activeApp;
}

/**
 * @name runWithApp
 * @category State
 * @description Runs a function inside `app.runWithContext`, so `inject` (and everything built
 * on it) resolves app-level provides even outside of component setup — in router guards,
 * store actions, event handlers or timers.
 *
 * The app defaults to `getActiveApp()`; pass one explicitly to target a specific app
 * (recommended for SSR, where apps are created per request).
 *
 * @param {Function} fn The function to run with the app as injection context
 * @param {App} [app] The app to use instead of the active one
 * @returns The return value of `fn`
 * @throws {VueToolsError} when no app is registered and none is passed
 *
 * @example
 * router.beforeEach(() => {
 *   const auth = runWithApp(() => inject(AuthKey));
 * });
 *
 * @since 0.1.0
 */
export function runWithApp<Result>(fn: () => Result, app: App | undefined = getActiveApp()): Result {
  if (!app)
    throw new VueToolsError('runWithApp: no active Vue app, install activeAppPlugin or call setActiveApp first');

  return app.runWithContext(fn);
}

/**
 * @name injectWithApp
 * @category State
 * @description Drop-in replacement for `inject` that also works outside of component setup.
 * Inside an injection context it behaves exactly like `inject` (component-level provides
 * win); outside it resolves app-level provides through the active app. When no app is
 * available it falls back to the provided default value, or throws if there is none.
 *
 * @param {InjectionKey | string} key The injection key
 * @param {any} [defaultValue] The value (or factory) to fall back to when the key is not provided
 * @param {boolean} [treatDefaultAsFactory] Call `defaultValue` as a factory, like `inject`
 * @returns The injected value
 * @throws {VueToolsError} when called with no injection context, no active app and no default value
 *
 * @example
 * const theme = injectWithApp(ThemeKey, 'light');
 *
 * @since 0.1.0
 */
export function injectWithApp<Value>(key: InjectionKey<Value> | string): Value | undefined;
export function injectWithApp<Value>(key: InjectionKey<Value> | string, defaultValue: Value, treatDefaultAsFactory?: false): Value;
export function injectWithApp<Value>(key: InjectionKey<Value> | string, defaultValue: Value | (() => Value), treatDefaultAsFactory: true): Value;
export function injectWithApp<Value>(key: InjectionKey<Value> | string, ...defaults: InjectDefaults<Value>): Value | undefined {
  // spread `defaults` as-is: `inject` distinguishes a missing default from an
  // explicit `undefined` one via `arguments.length`
  const doInject = () => (inject as (...args: [typeof key, ...InjectDefaults<Value>]) => Value | undefined)(key, ...defaults);

  if (hasInjectionContext())
    return doInject();

  const app = getActiveApp();

  if (app)
    return app.runWithContext(doInject);

  if (defaults.length > 0) {
    const [defaultValue, treatDefaultAsFactory] = defaults;

    return treatDefaultAsFactory && typeof defaultValue === 'function'
      ? (defaultValue as () => Value)()
      : defaultValue as Value;
  }

  throw new VueToolsError('injectWithApp: no injection context and no active Vue app, install activeAppPlugin or call setActiveApp first');
}

/**
 * @name activeAppPlugin
 * @category State
 * @description Vue plugin that registers the app as the active one and clears the
 * registration when the app unmounts (unless another app took over in the meantime).
 *
 * @example
 * // main.ts
 * createApp(App).use(activeAppPlugin).mount('#app');
 *
 * @since 0.1.0
 */
export const activeAppPlugin: Plugin = {
  install(app) {
    setActiveApp(app);

    app.onUnmount(() => {
      if (activeApp === app)
        setActiveApp(undefined);
    });
  },
};
