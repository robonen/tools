export { default as ScrollAreaCorner, type ScrollAreaCornerProps } from './ScrollAreaCorner.vue';
export { default as ScrollAreaRoot, type ScrollAreaRootProps } from './ScrollAreaRoot.vue';
export { default as ScrollAreaScrollbar, type ScrollAreaScrollbarProps } from './ScrollAreaScrollbar.vue';
export { default as ScrollAreaThumb, type ScrollAreaThumbProps } from './ScrollAreaThumb.vue';
export { default as ScrollAreaViewport, type ScrollAreaViewportProps } from './ScrollAreaViewport.vue';
export {
  provideScrollAreaRootContext,
  provideScrollAreaScrollbarContext,
  type ScrollAreaRootContext,
  type ScrollAreaScrollbarContext,
  useScrollAreaRootContext,
  useScrollAreaScrollbarContext,
} from './context';
export type { ScrollAreaSizes, ScrollAreaType, ScrollDirection } from './types';
