// TODO: tests

/**
 * @name _global
 * @category Multi
 * @description Global object that works in any environment
 *
 * @since 0.0.2
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
