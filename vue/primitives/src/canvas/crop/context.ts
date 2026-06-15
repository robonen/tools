import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';
import type { CropBounds, CropHandlePosition, CropRect } from './utils';

export type CropUnits = 'normalized' | 'pixels';
export type CropDirection = 'ltr' | 'rtl';

/**
 * Context shared between `CropRoot` and its parts (`CropArea`, `CropHandle`,
 * `CropGrid`, `CropOverlay`). The Root owns the rect and the gesture engines;
 * every part reads the live rect and asks the Root to begin a gesture or nudge
 * the rect via the keyboard.
 *
 * Scalar props are exposed as plain `Ref<T>` built with `toRef(() => prop)` (a
 * reactive getter ref without a `ReactiveEffect`) for identity passthrough,
 * mirroring the slider convention.
 */
export interface CropContext {
  /** The live crop rect in the chosen `units`, or `null` when there is no selection. */
  rect: Ref<CropRect | null>;
  /** Whether `rect` is `null` (no selection yet). */
  isEmpty: Ref<boolean>;
  /** The active coordinate space. */
  units: Ref<CropUnits>;
  /** Reading direction (affects arrow-key x sign). */
  direction: Ref<CropDirection>;
  /** Media bounds in the rect's units (`{1,1}` normalized, media px otherwise). */
  mediaSize: Ref<CropBounds>;
  /** Media size in pixels — always real px regardless of `units` (for layout). */
  mediaPixels: Ref<CropBounds>;
  /** Whether the rect is kept within the media bounds. */
  constrain: Ref<boolean>;
  /** Whether the rule-of-thirds grid is enabled. */
  grid: Ref<boolean>;
  /** Master interactivity switch. */
  disabled: Ref<boolean>;
  /** Resolved `width / height` lock in the rect's units, or `null` when free. */
  aspectRatio: Ref<number | null>;
  /** Minimum width in the rect's units. */
  minWidth: Ref<number>;
  /** Minimum height in the rect's units. */
  minHeight: Ref<number>;
  /** Keyboard nudge step on the x axis, in the rect's units. */
  keyboardStepX: Ref<number>;
  /** Keyboard nudge step on the y axis, in the rect's units. */
  keyboardStepY: Ref<number>;
  /** Large keyboard nudge step (Shift+Arrow) on the x axis, in the rect's units. */
  keyboardLargeStepX: Ref<number>;
  /** Large keyboard nudge step (Shift+Arrow) on the y axis, in the rect's units. */
  keyboardLargeStepY: Ref<number>;
  /** Whether a pointer gesture is currently in progress. */
  isCropping: Ref<boolean>;
  /** Replace the rect wholesale (the value is normalised by the Root). */
  setRect: (rect: CropRect | null) => void;
  /** Move the whole rect by a delta in the rect's units, clamped + committed. */
  nudgeMove: (dx: number, dy: number) => void;
  /** Resize an edge/corner by a delta in the rect's units, clamped + committed. */
  nudgeResize: (handle: CropHandlePosition, dx: number, dy: number) => void;
  /** Begin a pointer move gesture on the crop surface. */
  beginMove: (event: PointerEvent, surface: HTMLElement | null) => void;
  /** Begin a pointer resize gesture for `handle`. */
  beginResize: (handle: CropHandlePosition, event: PointerEvent, el: HTMLElement | null) => void;
  /** Begin a draw-from-empty create gesture on the media surface. */
  beginCreate: (event: PointerEvent, surface: HTMLElement | null) => void;
}

const context = useContextFactory<CropContext>('CropContext');

/** Provide the {@link CropContext} to descendants of `CropRoot`. */
export const provideCropContext = context.provide;

/** Inject the {@link CropContext}. Throws when used outside a `CropRoot`. */
export const useCropContext = context.inject;
