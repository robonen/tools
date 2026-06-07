export {};

declare global {
  const __DEV__: boolean;
}

declare module 'vue' {
  interface HTMLAttributes {
    [key: `data-${string}`]: unknown;
  }
}
