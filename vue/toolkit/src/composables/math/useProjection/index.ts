import { inverseLerp, lerp, remap } from '@robonen/stdlib';
import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

/**
 * A pure mapping from a value in the `from` domain to the `to` domain.
 *
 * @typeParam F The input domain element type.
 * @typeParam T The output domain element type.
 */
export type ProjectorFunction<F, T>
  = (input: F, from: readonly [F, F], to: readonly [T, T]) => T;

/**
 * A reusable projection: given a reactive input it yields a `ComputedRef`
 * of the projected value.
 *
 * @typeParam F The input domain element type.
 * @typeParam T The output domain element type.
 */
export type UseProjection<F, T>
  = (input: MaybeRefOrGetter<F>) => ComputedRef<T>;

export interface CreateProjectionOptions {
  /**
   * Clamp the input to the `from` domain before projecting so the result never
   * extrapolates past the `to` domain bounds. Reuses the stdlib `remap` (which
   * also tolerates a reversed/descending input range). Defaults to `false`,
   * matching VueUse's extrapolating behaviour.
   *
   * @default false
   */
  clamp?: boolean;
}

// Extrapolating linear projector (matches VueUse's defaultNumericProjector) but
// composed from stdlib lerp/inverseLerp and guarded against a zero-width input
// domain so a degenerate `[n, n]` source maps to `to[0]` instead of NaN.
function defaultNumericProjector(input: number, from: readonly [number, number], to: readonly [number, number]): number {
  return lerp(to[0], to[1], inverseLerp(from[0], from[1], input));
}

// Clamping projector — delegates entirely to stdlib `remap`.
function clampedNumericProjector(input: number, from: readonly [number, number], to: readonly [number, number]): number {
  return remap(input, from[0], from[1], to[0], to[1]);
}

/**
 * @name createGenericProjection
 * @category Math
 * @description Create a reusable projection between two arbitrary (non-numeric)
 * domains using a custom projector. The returned factory turns a reactive input
 * into a `ComputedRef` of the projected value, so the same projection can be
 * applied to many inputs without re-resolving the domains each time.
 *
 * @typeParam F The input domain element type.
 * @typeParam T The output domain element type.
 * @param {MaybeRefOrGetter<readonly [F, F]>} fromDomain The source domain `[start, end]`
 * @param {MaybeRefOrGetter<readonly [T, T]>} toDomain The target domain `[start, end]`
 * @param {ProjectorFunction<F, T>} projector The pure mapping function
 * @returns {UseProjection<F, T>} A factory that projects a reactive input into a `ComputedRef`
 *
 * @example
 * const project = createGenericProjection(
 *   [0, 10],
 *   ['a', 'z'],
 *   (n, from, to) => to[0] + Math.round((n - from[0]) / (from[1] - from[0]) * (to[1].charCodeAt(0) - to[0].charCodeAt(0))),
 * );
 *
 * @since 0.0.15
 */
/* @__NO_SIDE_EFFECTS__ */
export function createGenericProjection<F = number, T = number>(
  fromDomain: MaybeRefOrGetter<readonly [F, F]>,
  toDomain: MaybeRefOrGetter<readonly [T, T]>,
  projector: ProjectorFunction<F, T>,
): UseProjection<F, T> {
  return (input: MaybeRefOrGetter<F>): ComputedRef<T> =>
    computed<T>(() => projector(toValue(input), toValue(fromDomain), toValue(toDomain)));
}

/**
 * @name createProjection
 * @category Math
 * @description Create a reusable numeric projection from one numeric domain to
 * another. Without a custom projector it performs a linear (lerp-based)
 * remap that extrapolates past the bounds; pass `{ clamp: true }` to clamp the
 * input to the `from` domain via the stdlib `remap`. The returned factory can
 * be reused for many inputs.
 *
 * @param {MaybeRefOrGetter<readonly [number, number]>} fromDomain The source domain `[start, end]`
 * @param {MaybeRefOrGetter<readonly [number, number]>} toDomain The target domain `[start, end]`
 * @param {ProjectorFunction<number, number> | CreateProjectionOptions} [projector] A custom projector, or options for the default projector
 * @returns {UseProjection<number, number>} A factory that projects a reactive number into a `ComputedRef<number>`
 *
 * @example
 * const project = createProjection([0, 100], [0, 1]);
 * const half = project(50); // 0.5
 *
 * @example
 * const project = createProjection([0, 10], [0, 100], { clamp: true });
 * const out = project(20); // 100 (clamped)
 *
 * @since 0.0.15
 */
/* @__NO_SIDE_EFFECTS__ */
export function createProjection(
  fromDomain: MaybeRefOrGetter<readonly [number, number]>,
  toDomain: MaybeRefOrGetter<readonly [number, number]>,
  projector?: ProjectorFunction<number, number> | CreateProjectionOptions,
): UseProjection<number, number> {
  const resolved: ProjectorFunction<number, number>
    = typeof projector === 'function'
      ? projector
      : projector?.clamp
        ? clampedNumericProjector
        : defaultNumericProjector;

  return createGenericProjection<number, number>(fromDomain, toDomain, resolved);
}

/**
 * @name useProjection
 * @category Math
 * @description Reactive numeric projection from one numeric domain to another.
 * A thin one-shot wrapper over {@link createProjection}: it projects a single
 * reactive `input` and returns a `ComputedRef` of the result. The default
 * (lerp-based) projector extrapolates past the domain bounds; pass
 * `{ clamp: true }` to clamp the input to the `from` domain. SSR-safe — it
 * performs only pure arithmetic and touches no browser globals.
 *
 * @param {MaybeRefOrGetter<number>} input The reactive value to project
 * @param {MaybeRefOrGetter<readonly [number, number]>} fromDomain The source domain `[start, end]`
 * @param {MaybeRefOrGetter<readonly [number, number]>} toDomain The target domain `[start, end]`
 * @param {ProjectorFunction<number, number> | CreateProjectionOptions} [projector] A custom projector, or options for the default projector
 * @returns {ComputedRef<number>} A computed ref of the projected value
 *
 * @example
 * const input = ref(50);
 * const projected = useProjection(input, [0, 100], [0, 1]); // 0.5
 *
 * @example
 * const input = ref(150);
 * const projected = useProjection(input, [0, 100], [0, 10], { clamp: true }); // 10
 *
 * @since 0.0.15
 */
/* @__NO_SIDE_EFFECTS__ */
export function useProjection(
  input: MaybeRefOrGetter<number>,
  fromDomain: MaybeRefOrGetter<readonly [number, number]>,
  toDomain: MaybeRefOrGetter<readonly [number, number]>,
  projector?: ProjectorFunction<number, number> | CreateProjectionOptions,
): ComputedRef<number> {
  return createProjection(fromDomain, toDomain, projector)(input);
}
