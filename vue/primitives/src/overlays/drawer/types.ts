/**
 * The edge the drawer is anchored to and slides in from.
 */
export type DrawerDirection = 'top' | 'bottom' | 'left' | 'right';

/**
 * Lifecycle phase of the drawer. `opening`/`closing` last for the duration of
 * the enter/exit animation; the settle signal (animation end or its fallback
 * timeout) advances them to `open`/`closed`.
 */
export type DrawerPhase = 'closed' | 'opening' | 'open' | 'closing';

/**
 * What flipped the drawer's open state. Absent details mean a programmatic
 * change (a controlled `v-model:open` write).
 */
export type DrawerOpenChangeReason
  = | 'swipe'
    | 'escape-key'
    | 'outside-press'
    | 'trigger-press'
    | 'close-press'
    | 'handle-press';

/** Extra context attached to `update:open`. */
export interface DrawerOpenChangeDetails {
  reason?: DrawerOpenChangeReason;
}
