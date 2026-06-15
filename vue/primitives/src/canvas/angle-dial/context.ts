import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export type AngleDialDirection = 'ltr' | 'rtl';

/**
 * How the value behaves at the bounds.
 * - `'wrap'` — the value lives on a continuous circle; crossing the `0` / `360`
 *   seam (e.g. dragging from `359°` forward) flows through to `0°`+ without
 *   jumping backwards. `min` / `max` are treated as the seam (a full turn).
 * - `'clamp'` — the value is bounded to the arc `[min, max]`; pushing past an
 *   end stops at that end instead of jumping to the far side.
 */
export type AngleDialWrap = 'wrap' | 'clamp';

/**
 * Snap increments for the angle, in degrees.
 * - A `number` snaps to every multiple of that increment (e.g. `15` → every 15°).
 * - A `number[]` snaps to the nearest of an explicit list of angles
 *   (e.g. `[0, 45, 90, 135, 180, 225, 270, 315]`).
 * - `undefined` disables snapping (only `step` rounding applies).
 */
export type AngleDialSnap = number | number[] | undefined;

/**
 * Formatter turning the raw angle (degrees) into a human-friendly string for
 * `aria-valuetext`. A bare number on a circular control is ambiguous, so the
 * thumb strongly defaults this to `` `${Math.round(deg)}°` ``. Return
 * `undefined` to omit `aria-valuetext`.
 */
export type AngleDialValueText = (deg: number) => string | undefined;

/**
 * Context shared between `AngleDialRoot` and `AngleDialThumb`.
 *
 * Scalar props are exposed as plain `Ref<T>` values, but `AngleDialRoot` builds
 * them with `toRef(() => prop)` — a `GetterRefImpl` that is reactive without
 * allocating a `ReactiveEffect` / cache (unlike `computed`), mirroring the
 * slider's identity-passthrough convention.
 */
export interface AngleDialContext {
  /** Current angle in degrees. */
  value: Ref<number>;
  min: Ref<number>;
  max: Ref<number>;
  step: Ref<number>;
  /** Large-step increment (Page keys / Shift+Arrow), in degrees. */
  largeStep: Ref<number>;
  wrap: Ref<AngleDialWrap>;
  snap: Ref<AngleDialSnap>;
  disabled: Ref<boolean>;
  direction: Ref<AngleDialDirection>;
  /**
   * Commit a new raw angle (degrees). The root applies snap, step rounding, and
   * wrap/clamp handling before writing the model.
   */
  setValue: (deg: number) => void;
  /**
   * Nudge the value by a signed delta (degrees) from the keyboard. Honors
   * wrap/clamp semantics (a wrap dial crosses the seam; a clamp dial stops).
   */
  nudge: (delta: number) => void;
  /** Jump to the canonical low end (Home). */
  toStart: () => void;
  /** Jump to the canonical high end (End). */
  toEnd: () => void;
}

const ctx = useContextFactory<AngleDialContext>('AngleDialContext');

export const provideAngleDialContext = ctx.provide;
export const useAngleDialContext = ctx.inject;
