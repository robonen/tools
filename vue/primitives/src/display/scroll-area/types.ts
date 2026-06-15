export type ScrollDirection = 'ltr' | 'rtl';

export type ScrollAreaType = 'auto' | 'always' | 'scroll' | 'hover' | 'glimpse';

export interface ScrollAreaSizes {
  content: number;
  viewport: number;
  scrollbar: {
    size: number;
    paddingStart: number;
    paddingEnd: number;
  };
}
