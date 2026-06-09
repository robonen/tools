import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';
import type { DrawerDirection } from './types';

export interface DrawerRootContext {
  /** Source-of-truth open state (also bound to the underlying Dialog). */
  open: Ref<boolean>;
  /** Alias of {@link open}; kept for parity with consumers reading `isOpen`. */
  isOpen: Ref<boolean>;
  /** Whether the drawer blocks the rest of the page (focus trap, scroll lock). */
  modal: Ref<boolean>;
  /** Becomes `true` the first time the drawer opens; gates Safari position fixes. */
  hasBeenOpened: Ref<boolean>;
  /** DOM node of the drawer content (DialogContent), tracked for drag math. */
  drawerRef: Ref<HTMLElement | undefined>;
  /** DOM node of the overlay, faded in sync with the drag. */
  overlayRef: Ref<HTMLElement | undefined>;
  /** DOM node of the drag handle. */
  handleRef: Ref<HTMLElement | undefined>;
  /** Whether a pointer drag is currently in progress. */
  isDragging: Ref<boolean>;
  /** Timestamp the active drag started, for velocity calculations. */
  dragStartTime: Ref<Date | null>;
  /** Latched once a drag is permitted, so it can't be cancelled mid-gesture. */
  isAllowedToDrag: Ref<boolean>;
  /** Configured snap points (fractions of the screen or px strings). */
  snapPoints: Ref<Array<number | string> | undefined>;
  /** Whether any snap points are configured. */
  hasSnapPoints: Ref<boolean>;
  /** Whether the on-screen keyboard is currently considered open. */
  keyboardIsOpen: Ref<boolean>;
  /** The currently active snap point value (px string, fraction, or null). */
  activeSnapPoint: Ref<number | string | null | undefined>;
  /** Pointer coordinate (clientX/clientY) captured at drag start. */
  pointerStart: Ref<number>;
  /** Whether dragging/clicking outside/escape closes the drawer. */
  dismissible: Ref<boolean>;
  /** Measured height of the drawer content in px. */
  drawerHeightRef: Ref<number>;
  /** Pixel offset of each snap point along the drag axis. */
  snapPointsOffset: Ref<number[]>;
  /** The edge the drawer is anchored to. */
  direction: Ref<DrawerDirection>;
  /** Begin a drag gesture. */
  onPress: (event: PointerEvent) => void;
  /** Update the drawer position during a drag. */
  onDrag: (event: PointerEvent) => void;
  /** Settle the drawer (snap, close, or reset) when the pointer is released. */
  onRelease: (event: PointerEvent) => void;
  /** Programmatically close the drawer. */
  closeDrawer: () => void;
  /** Whether the overlay should fade with the drag at the current snap point. */
  shouldFade: Ref<boolean>;
  /** Snap point index from which the overlay starts fading. */
  fadeFromIndex: Ref<number | undefined>;
  /** Whether the page background scales back while the drawer is open. */
  shouldScaleBackground: Ref<boolean | undefined>;
  /** Whether to set the body background to black during the scale effect. */
  setBackgroundColorOnScale: Ref<boolean | undefined>;
  /** Drive the parent drawer's transform as a nested child drawer is dragged. */
  onNestedDrag: (percentageDragged: number) => void;
  /** Settle the parent drawer when a nested child drawer is released. */
  onNestedRelease: (o: boolean) => void;
  /** React to a nested child drawer opening/closing. */
  onNestedOpenChange: (o: boolean) => void;
  /** Emit the root's `close` event. */
  emitClose: () => void;
  /** Emit the root's `drag` event with the drag percentage. */
  emitDrag: (percentageDragged: number) => void;
  /** Emit the root's `release` event. */
  emitRelease: (open: boolean) => void;
  /** Whether this drawer is nested inside another drawer. */
  nested: Ref<boolean>;
  /** Whether dragging is only permitted from the handle. */
  handleOnly: Ref<boolean>;
  /** Whether to skip Vaul-style body styling entirely. */
  noBodyStyles: Ref<boolean>;
}

const ctx = useContextFactory<DrawerRootContext>('DrawerRootContext');

export const provideDrawerRootContext = ctx.provide;
export const injectDrawerRootContext = ctx.inject;
