export {};

declare global {
  const __DEV__: boolean;
}

declare module 'vue' {
  type ComponentCustomProps = Record<`data${string}`, unknown>;
}

declare module 'vue' {
  type HTMLAttributes = Record<`data-${string}`, unknown>;
}
