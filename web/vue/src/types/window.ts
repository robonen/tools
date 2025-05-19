import { isClient } from '@robonen/platform/multi';

export const defaultWindow = /* #__PURE__ */ isClient ? window : undefined