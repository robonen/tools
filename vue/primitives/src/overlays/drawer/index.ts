export { default as DrawerRoot } from './DrawerRoot.vue';
export { default as DrawerRootNested } from './DrawerRootNested.vue';
export { default as DrawerContent } from './DrawerContent.vue';
export { default as DrawerOverlay } from './DrawerOverlay.vue';
export { default as DrawerHandle } from './DrawerHandle.vue';
export { default as DrawerTrigger } from './DrawerTrigger.vue';
export { default as DrawerClose } from './DrawerClose.vue';

export type { DrawerRootEmits, DrawerRootProps, DrawerHandleProps } from './controls';
export type { DrawerContentEmits, DrawerContentProps } from './DrawerContent.vue';
export type { DrawerOverlayProps } from './DrawerOverlay.vue';
export type { DrawerTriggerProps } from './DrawerTrigger.vue';
export type { DrawerCloseProps } from './DrawerClose.vue';
export type { DrawerDirection, DrawerOpenChangeDetails, DrawerOpenChangeReason } from './types';

export { injectDrawerRootContext, provideDrawerRootContext } from './context';
export type { DrawerRootContext } from './context';

// Parts with no drawer-specific behaviour reuse Dialog directly, re-exported
// under Drawer names so consumers stay within one namespace.
export {
  DialogDescription as DrawerDescription,
  DialogPortal as DrawerPortal,
  DialogTitle as DrawerTitle,
} from '../dialog';

export type {
  DialogDescriptionProps as DrawerDescriptionProps,
  DialogPortalProps as DrawerPortalProps,
  DialogTitleProps as DrawerTitleProps,
} from '../dialog';
