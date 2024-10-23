// TODO: tests

/**
 * @name _global
 * @category Multi
 * @description Global object that works in any environment
 *
 * @since 0.0.1
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
          : undefined;

/**
 * @name isClient
 * @category Multi
 * @description Check if the current environment is the client
 * 
 * @since 0.0.1
 */
export const isClient = typeof window !== 'undefined' && typeof document !== 'undefined';