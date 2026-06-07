import type { Ref, ShallowRef } from 'vue';

import { useContextFactory } from '@robonen/vue';

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

export interface ToastProviderContext {
  label: Ref<string>;
  duration: Ref<number>;
  swipeDirection: Ref<SwipeDirection>;
  swipeThreshold: Ref<number>;
  toastCount: Ref<number>;
  viewportRef: ShallowRef<HTMLElement | undefined>;
  onViewportChange: (el: HTMLElement | undefined) => void;
  onToastAdd: () => void;
  onToastRemove: () => void;
  isFocusedToastEscapeKeyDownRef: Ref<boolean>;
  isClosePausedRef: Ref<boolean>;
}

export interface ToastContext {
  onClose: () => void;
  duration: Ref<number | undefined>;
  open: Ref<boolean>;
  toastId: Ref<string>;
}

const {
  inject: useToastProviderContext,
  provide: provideToastProviderContext,
} = useContextFactory<ToastProviderContext>('ToastProviderContext');

const {
  inject: useToastContext,
  provide: provideToastContext,
} = useContextFactory<ToastContext>('ToastContext');

export {
  useToastProviderContext,
  provideToastProviderContext,
  useToastContext,
  provideToastContext,
};
