/** Red/green/blue color with channels in the `0–255` range. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** {@link RGB} extended with an alpha channel in the `0–1` range. */
export interface RGBA extends RGB {
  a: number;
}

/** Hue/saturation/value color (`h` `0–360`, `s`/`v` `0–1`). */
export interface HSV {
  h: number;
  s: number;
  v: number;
}

/** {@link HSV} extended with an alpha channel in the `0–1` range. */
export interface HSVA extends HSV {
  a: number;
}

/** Hue/saturation/lightness color (`h` `0–360`, `s`/`l` `0–1`). */
export interface HSL {
  h: number;
  s: number;
  l: number;
}

/** {@link HSL} extended with an alpha channel in the `0–1` range. */
export interface HSLA extends HSL {
  a: number;
}
