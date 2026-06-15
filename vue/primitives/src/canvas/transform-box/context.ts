import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';
import type { UseSnappingReturn } from '../../internal/snapping';
import type {
  Point,
  TransformBoxHandlePosition,
  TransformBoxPivot,
  TransformBoxValue,
} from './utils';

export type TransformBoxDirection = 'ltr' | 'rtl';

/** Modifier flags read off the live pointer event for a gesture frame. */
export interface TransformBoxModifiers {
  /** Aspect-lock (corner) request. */
  shift: boolean;
  /** Symmetric-about-pivot request. */
  alt: boolean;
}

/**
 * Context shared between `TransformBoxRoot` and its handle parts.
 *
 * Scalar props are exposed as plain `Ref<T>` and built by the root with
 * `toRef(() => prop)` — a `GetterRefImpl` that is reactive without allocating a
 * `ReactiveEffect`/cache (the slider/angle-dial identity-passthrough convention).
 *
 * The handle parts own their `usePointerDrag` instance (bound to their own
 * button element, so capture/state never tangles between handles) and call the
 * root's gesture callbacks per frame: `beginScale`/`updateScale`/`endScale`
 * (and the rotate equivalents). The root owns ALL transform math; the parts
 * stay dumb. The body's MOVE gesture is owned wholly by the root.
 */
export interface TransformBoxContext {
  /** Current transform (normalized box + rotation). */
  value: Ref<TransformBoxValue>;
  /** Commit a raw transform; the root normalizes (min-size, flip) and emits. */
  setValue: (next: TransformBoxValue) => void;

  // ── scale gesture (driven by TransformBoxHandle) ───────────────────────────
  /** Snapshot the start box and mark the gesture active. */
  beginScale: (handle: TransformBoxHandlePosition) => void;
  /**
   * Apply a cumulative SCREEN-space pointer delta for the active scale gesture.
   * The root rotates it into the box's local axes and resizes the edge(s).
   */
  updateScale: (handle: TransformBoxHandlePosition, screenDelta: Point, mods: TransformBoxModifiers) => void;
  /** End the scale gesture; `commit` true on pointerup (false on cancel). */
  endScale: (commit: boolean) => void;

  // ── rotate gesture (driven by TransformBoxRotateHandle) ────────────────────
  /** Snapshot the start rotation and pivot (in client space) from `pointer`. */
  beginRotate: (pointer: Point, handleEl: HTMLElement) => void;
  /** Apply the current pointer position; root computes the angle about the pivot. */
  updateRotate: (pointer: Point, mods: TransformBoxModifiers) => void;
  /** End the rotate gesture; `commit` true on pointerup. */
  endRotate: (commit: boolean) => void;

  // ── keyboard nudges ────────────────────────────────────────────────────────
  /** Resize the handle's edge(s) by a LOCAL-axis step (Arrow on a handle). */
  nudgeScale: (handle: TransformBoxHandlePosition, dx: number, dy: number, mods: TransformBoxModifiers) => void;
  /** Move the whole box by a world-space delta (Arrow on the body). */
  nudgeMove: (dx: number, dy: number) => void;
  /** Rotate by a signed degree delta (Arrow on the rotate handle). */
  nudgeRotate: (delta: number) => void;

  /** The root's snap engine. */
  snapping: UseSnappingReturn;
  /** Whether the box is currently selected/active. */
  selected: Ref<boolean>;
  /** Mark the box selected (click-to-activate). */
  setSelected: (value: boolean) => void;
  /** Whether all interaction is disabled. */
  disabled: Ref<boolean>;
  /** Whether a move/scale/rotate gesture is in flight. */
  transforming: Ref<boolean>;
  /** Resolved reading direction (affects horizontal keyboard nudge). */
  direction: Ref<TransformBoxDirection>;
  /** The pivot rotation/symmetric-resize anchor to. */
  pivot: Ref<TransformBoxPivot>;
  /** Keyboard step (Arrow). */
  keyboardStep: Ref<number>;
  /** Keyboard large step (Shift+Arrow for move). */
  keyboardLargeStep: Ref<number>;
  /** Rotation keyboard step (degrees). */
  rotationStep: Ref<number>;
  /** Rotation snap increment while Shift is held (degrees, 0 disables). */
  rotationSnap: Ref<number>;
  /** Live flip flag for `data-flipped-x` on the root. */
  flippedX: Ref<boolean>;
  /** Live flip flag for `data-flipped-y` on the root. */
  flippedY: Ref<boolean>;
}

/** Re-export so handle parts can name these without reaching into `utils`. */
export type { Point, TransformBoxHandlePosition, TransformBoxPivot, TransformBoxValue };

const ctx = useContextFactory<TransformBoxContext>('TransformBoxContext');

export const provideTransformBoxContext = ctx.provide;
export const useTransformBoxContext = ctx.inject;
