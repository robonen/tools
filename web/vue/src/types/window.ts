import { isClient } from '@robonen/platform/multi';

export const defaultWindow = /* #__PURE__ */ isClient ? window : undefined

export interface ConfigurableWindow {
  /**
   * Specify a custom `window` instance, e.g. working with iframes or testing environments
   *
   * @default defaultWindow
   */
  window?: Window;
}