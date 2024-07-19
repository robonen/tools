/**
 * @name _global
 * @category Multi
 * @description Global object that works in any environment
 */
export const _global =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
        ? global
        : typeof self !== 'undefined'
          ? self
          : {};
