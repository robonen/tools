import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';
import type { LevelsHandleKind, LevelsValue } from './utils';

/** Orientation of the levels track. */
export type LevelsOrientation = 'horizontal' | 'vertical';
/** Writing direction (flips horizontal pointer/keyboard mapping). */
export type LevelsDirection = 'ltr' | 'rtl';

/**
 * Context shared between `LevelsRoot`, `LevelsTrack`, `LevelsThumb`, and
 * `LevelsHandleValue`.
 *
 * Scalar props are plain `Ref<T>` (built with `toRef(() => prop)` in the root —
 * a reactive getter ref without a `computed` cache). Actions are functions that
 * apply the neighbour-clamping and commit to the model.
 */
export interface LevelsContext {
  /** The live adjustment (input black/white, gamma factor, output range). */
  value: Ref<LevelsValue>;
  /** Keyboard/arrow step for the `0..255` handles. */
  step: Ref<number>;
  /** Keyboard step for the gamma handle (`gammaStep`). */
  gammaStep: Ref<number>;
  /** Large-step multiplier (Page keys / Shift+Arrow). */
  largeStep: Ref<number>;
  /** Minimum gap (in steps) the black handle keeps below white. */
  minStepsBetweenHandles: Ref<number>;
  orientation: Ref<LevelsOrientation>;
  direction: Ref<LevelsDirection>;
  /** Invert the direction of interaction (independent of `dir`/orientation). */
  inverted: Ref<boolean>;
  disabled: Ref<boolean>;
  /** Geometry reference for pointer math (set by `LevelsTrack`). */
  trackRef: Ref<HTMLElement | null>;
  /** Set a handle to `next`, applying step rounding + neighbour clamping + commit. */
  setHandle: (kind: LevelsHandleKind, next: number) => void;
  /** Nudge a handle by `delta` (already in the handle's units), clamped + committed. */
  nudgeHandle: (kind: LevelsHandleKind, delta: number) => void;
  /** Jump a handle to its lowest (`'min'`) or highest (`'max'`) legal value. */
  jumpHandle: (kind: LevelsHandleKind, edge: 'min' | 'max') => void;
  /** Map a pointer event to a `0..255` value along the track (min when unmeasured). */
  getValueFromPointer: (event: PointerEvent) => number;
  /** Start a drag for `kind` from `LevelsTrack`/`LevelsThumb` pointer-down. */
  startDrag: (kind: LevelsHandleKind, event: PointerEvent) => void;
  /** Build the 256-entry output LUT for the current adjustment. */
  getOutputCurve: (size?: number) => number[];
  /** Apply auto black/white from an optional luminance histogram. */
  autoLevels: (histogram?: number[]) => void;
}

export const {
  inject: useLevelsContext,
  provide: provideLevelsContext,
} = useContextFactory<LevelsContext>('levels');
