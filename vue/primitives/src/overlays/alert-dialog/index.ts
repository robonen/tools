export { DialogDescription as AlertDialogDescription, DialogOverlay as AlertDialogOverlay, DialogPortal as AlertDialogPortal, DialogTitle as AlertDialogTitle, DialogTrigger as AlertDialogTrigger } from '../dialog';
export { default as AlertDialogAction } from './AlertDialogAction.vue';
export { default as AlertDialogCancel } from './AlertDialogCancel.vue';
export { default as AlertDialogContent } from './AlertDialogContent.vue';

export { default as AlertDialogRoot } from './AlertDialogRoot.vue';

export { useAlertDialogContentContext } from './context';

export type {
  DialogDescriptionProps as AlertDialogDescriptionProps,
  DialogOverlayProps as AlertDialogOverlayProps,
  DialogPortalProps as AlertDialogPortalProps,
  DialogTitleProps as AlertDialogTitleProps,
  DialogTriggerProps as AlertDialogTriggerProps,
} from '../dialog';
export type { AlertDialogContentContext } from './context';
export type { AlertDialogActionProps } from './AlertDialogAction.vue';
export type { AlertDialogCancelProps } from './AlertDialogCancel.vue';
export type { AlertDialogContentEmits, AlertDialogContentProps } from './AlertDialogContent.vue';
export type { AlertDialogRootEmits, AlertDialogRootProps } from './AlertDialogRoot.vue';
