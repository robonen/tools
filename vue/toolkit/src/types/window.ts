import { isClient } from '@robonen/platform/multi';

export const defaultWindow = /* #__PURE__ */ isClient ? globalThis as Window & typeof globalThis : undefined;
export const defaultDocument = /* #__PURE__ */ isClient ? globalThis.document : undefined;
export const defaultNavigator = /* #__PURE__ */ isClient ? globalThis.navigator : undefined;

export interface ConfigurableWindow {
  /**
   * Specify a custom `window` instance, e.g. working with iframes or testing environments
   *
   * @default defaultWindow
   */
  window?: Window;
}

export interface ConfigurableDocument {
  /**
   * Specify a custom `document` instance, e.g. working with iframes or testing environments
   *
   * @default defaultDocument
   */
  document?: Document;
}

export interface ConfigurableNavigator {
  /**
   * Specify a custom `navigator` instance, e.g. working with testing environments
   *
   * @default defaultNavigator
   */
  navigator?: Navigator;
}
