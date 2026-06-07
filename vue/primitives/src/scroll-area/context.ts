import type { Ref } from 'vue';
import type { ScrollAreaType, ScrollDirection } from './types';
import { useContextFactory } from '@robonen/vue';

export interface ScrollAreaRootContext {
  type: Ref<ScrollAreaType>;
  dir: Ref<ScrollDirection>;
  scrollHideDelay: Ref<number>;
  scrollArea: Ref<HTMLElement | null>;
  viewport: Ref<HTMLElement | null>;
  content: Ref<HTMLElement | null>;
  scrollbarX: Ref<HTMLElement | null>;
  scrollbarY: Ref<HTMLElement | null>;
  scrollbarXEnabled: Ref<boolean>;
  scrollbarYEnabled: Ref<boolean>;
  cornerWidth: Ref<number>;
  cornerHeight: Ref<number>;
  /** Unique id assigned to the Viewport so scrollbars can `aria-controls` it. */
  viewportId: Ref<string>;
  onScrollbarXEnabledChange: (enabled: boolean) => void;
  onScrollbarYEnabledChange: (enabled: boolean) => void;
  onCornerWidthChange: (n: number) => void;
  onCornerHeightChange: (n: number) => void;
}

const RootCtx = useContextFactory<ScrollAreaRootContext>('ScrollAreaRootContext');
export const provideScrollAreaRootContext = RootCtx.provide;
export const useScrollAreaRootContext = RootCtx.inject;

export interface ScrollAreaScrollbarContext {
  orientation: 'horizontal' | 'vertical';
  hasThumb: Ref<boolean>;
  scrollbar: Ref<HTMLElement | null>;
  onThumbChange: (el: HTMLElement | null) => void;
  onThumbPointerUp: () => void;
  onThumbPointerDown: (point: { x: number; y: number }) => void;
  onThumbPositionChange: () => void;
}

const ScrollbarCtx = useContextFactory<ScrollAreaScrollbarContext>('ScrollAreaScrollbarContext');
export const provideScrollAreaScrollbarContext = ScrollbarCtx.provide;
export const useScrollAreaScrollbarContext = ScrollbarCtx.inject;
