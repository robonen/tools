// Re-export the package-canonical 2D point so every infra/component module
// shares a single `Point` declaration. This keeps the root barrel free of a
// TS2308 ambiguity (spline and pointer-drag would otherwise each declare their
// own `Point`). `utils/geometry` is internal-only (not in the root barrel), so
// re-exporting the same symbol here makes both star-exports identical.
/** A 2D point in curve/screen space. */
export type { Point } from '../utils/geometry';
