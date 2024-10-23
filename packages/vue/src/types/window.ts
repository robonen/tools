import { isClient } from '@robonen/platform';

export const defaultWindow = /* #__PURE__ */ isClient ? window : undefined