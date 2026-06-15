export { default as DrawerRoot } from './DrawerRoot.vue';
export { default as DrawerRootNested } from './DrawerRootNested.vue';
export { default as DrawerContent } from './DrawerContent.vue';
export { default as DrawerOverlay } from './DrawerOverlay.vue';
export { default as DrawerHandle } from './DrawerHandle.vue';

export type { DrawerRootEmits, DrawerRootProps, DrawerHandleProps } from './controls';
export type { DrawerContentEmits, DrawerContentProps } from './DrawerContent.vue';
export type { DrawerOverlayProps } from './DrawerOverlay.vue';
export type { DrawerDirection, SnapPoint } from './types';

export { injectDrawerRootContext, provideDrawerRootContext } from './context';
export type { DrawerRootContext } from './context';

// Parts with no drawer-specific behaviour reuse Dialog directly, re-exported
// under Drawer names so consumers stay within one namespace.
export {
  DialogClose as DrawerClose,
  DialogDescription as DrawerDescription,
  DialogPortal as DrawerPortal,
  DialogTitle as DrawerTitle,
  DialogTrigger as DrawerTrigger,
} from '../dialog';

export type {
  DialogCloseProps as DrawerCloseProps,
  DialogDescriptionProps as DrawerDescriptionProps,
  DialogPortalProps as DrawerPortalProps,
  DialogTitleProps as DrawerTitleProps,
  DialogTriggerProps as DrawerTriggerProps,
} from '../dialog';
