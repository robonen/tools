import type { Ref } from 'vue';
import { useContextFactory } from '@robonen/vue';

export type GradientEditorDirection = 'ltr' | 'rtl';

/** Whether the gradient is rendered linearly (with an `angle`) or radially. */
export type GradientType = 'linear' | 'radial';

/**
 * A single color stop on the gradient bar.
 *
 * `position` is a fraction in `[0, 1]` (`0` = start of the bar, `1` = end) and
 * `color` is any CSS color string (`#rrggbb`, `rgb()/rgba()`, `hsl()/hsla()`).
 * `id` is a stable identity used as the `v-for` key, the roving-focus handle,
 * and the tie-break for two stops sharing a `position`.
 */
export interface GradientStop {
  /** Stable identity (v-for key, roving-focus handle, selection target). */
  id: string;
  /** Position along the bar as a fraction in `[0, 1]`. */
  position: number;
  /** Any CSS color string. */
  color: string;
}

/** Patch applied to a stop by {@link GradientEditorContext.updateStop}. */
export interface GradientStopPatch {
  /** New position (fraction `[0, 1]`). */
  position?: number;
  /** New CSS color string. */
  color?: string;
}

/**
 * Formatter turning a stop's `color` + `position` into a human-friendly string
 * for `aria-valuetext`. Defaults to `` `${color} at ${pct}%` ``. Color is NEVER
 * surfaced alone (WCAG 1.4.1) — keep the position in any override.
 */
export type GradientEditorValueText = (color: string, position: number) => string;

/** A stop paired with its index in the sorted list, keyed by id in {@link GradientEditorContext.stopIndex}. */
export interface GradientStopEntry {
  /** The stop. */
  stop: GradientStop;
  /** Its index within the sorted stops. */
  index: number;
}

/**
 * Context shared between `GradientEditorRoot` and its descendants.
 *
 * Scalar props are exposed as plain `Ref<T>` values, built by the root with
 * `toRef(() => prop)` (a `GetterRefImpl` that is reactive without an extra
 * `ReactiveEffect` / cache), mirroring the slider / curve-editor convention.
 */
export interface GradientEditorContext {
  /** The live stops, sorted ascending by position (stable tie-break by index). */
  stops: Ref<GradientStop[]>;
  /**
   * Memoized `id -> { stop, index }` over the sorted stops, rebuilt once per
   * stops change. Per-stop parts read this for O(1) lookups instead of scanning
   * the wholesale-replaced array each drag frame.
   */
  stopIndex: Ref<Map<string, GradientStopEntry>>;
  /** The id of the currently selected stop, or `null`. */
  selectedId: Ref<string | null>;
  /** Gradient type — `'linear'` (uses `angle`) or `'radial'`. */
  type: Ref<GradientType>;
  /** Linear gradient angle in degrees. */
  angle: Ref<number>;
  /** Minimum number of stops; removal is blocked at this floor. */
  minStops: Ref<number>;
  /** Keyboard step (fraction) for Arrow nudges. */
  step: Ref<number>;
  /** Large keyboard step (Shift+Arrow / Page keys). */
  largeStep: Ref<number>;
  /** Optional grid snap increment (fraction); `undefined` disables grid snap. */
  snapStep: Ref<number | undefined>;
  /** Whether dragging a stop past a neighbour re-sorts (`true`) or clamps (`false`). */
  reorder: Ref<boolean>;
  /** Optional per-stop `aria-valuetext` formatter. */
  valueText: Ref<GradientEditorValueText | undefined>;
  direction: Ref<GradientEditorDirection>;
  disabled: Ref<boolean>;
  /** The CSS gradient string for the current stops + type + angle (preview). */
  cssGradient: Ref<string>;
  /** Whether removal is allowed (`stops.length > minStops`). */
  canRemove: Ref<boolean>;
  /** The bar element used for pointer ↔ position math (set by the Track). */
  trackRef: Ref<HTMLElement | null>;
  /** Set the linear gradient angle (degrees), writing the `angle` model. */
  setAngle: (deg: number) => void;
  /** Select a stop (or clear with `null`). */
  select: (id: string | null) => void;
  /**
   * Add a stop at `position` (fraction `[0, 1]`). When `color` is omitted it is
   * interpolated from the neighbouring stops. Returns the new stop's id, or
   * `undefined` when disabled.
   */
  addStop: (position: number, color?: string) => string | undefined;
  /** Remove a stop by id (no-op at `minStops` or when disabled). */
  removeStop: (id: string) => void;
  /** Patch a stop's `position` / `color` by id (neighbour-clamped position). */
  updateStop: (id: string, patch: GradientStopPatch) => void;
  /**
   * Move a stop to `position` honoring the `reorder` policy: when `reorder` is
   * `false` the position is clamped between its neighbours (ids never cross);
   * when `true` it may cross and the array re-sorts (each id keeps its color).
   */
  moveStop: (id: string, position: number) => void;
  /** Register a stop's DOM element so roving focus can move between them. */
  registerStopEl: (id: string, el: HTMLElement | null) => void;
  /** The element for a stop id, or `null`. */
  getStopEl: (id: string) => HTMLElement | null;
  /** Index of a stop id within the sorted stops (`-1` when absent). */
  indexOf: (id: string) => number;
}

const ctx = useContextFactory<GradientEditorContext>('GradientEditorContext');

export const provideGradientEditorContext = ctx.provide;
export const useGradientEditorContext = ctx.inject;
