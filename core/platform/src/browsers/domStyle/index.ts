/**
 * A patch of inline styles — a map of CSS property names to string values.
 * Keys may be camelCase DOM style properties (`borderRadius`) or `--custom`
 * properties (set verbatim via `setProperty`).
 */
export type StylePatch = Record<string, string>;

/**
 * The axis a translation is read along: `x` (horizontal) or `y` (vertical).
 */
export type TranslateAxis = 'x' | 'y';

// Remembers the styles that {@link setStyle} overwrote, keyed by element, so
// {@link resetStyle} can put them back. A WeakMap lets the entry be collected
// once the element is gone.
const originalStyles = new WeakMap<HTMLElement, StylePatch>();

/**
 * @name setStyle
 * @category Browsers
 * @description Applies a batch of inline styles to an element, remembering the
 * values it overwrote so {@link resetStyle} can restore them later. `--custom`
 * properties are written through `setProperty`. Pass `ignoreCache` to apply the
 * styles without recording the originals (e.g. for transient, per-frame writes
 * during a drag that you intend to clear wholesale).
 *
 * @param {Element | HTMLElement | null} [element] The element to style (ignored if not an `HTMLElement`)
 * @param {StylePatch} [styles] The property/value pairs to apply
 * @param {boolean} [ignoreCache] Skip remembering the overwritten values
 * @returns {void}
 *
 * @example
 * setStyle(el, { transition: 'none', transform: 'translateY(20px)' });
 * setStyle(el, { opacity: '0.5' }, true); // transient — won't be restored
 *
 * @since 0.0.5
 */
export function setStyle(element?: Element | HTMLElement | null, styles?: StylePatch, ignoreCache = false): void {
  if (!element || !(element instanceof HTMLElement) || !styles)
    return;

  const previous: StylePatch = {};

  for (const [key, value] of Object.entries(styles)) {
    if (key.startsWith('--')) {
      element.style.setProperty(key, value);
      continue;
    }

    previous[key] = (element.style as unknown as StylePatch)[key];
    (element.style as unknown as StylePatch)[key] = value;
  }

  if (ignoreCache)
    return;

  originalStyles.set(element, previous);
}

/**
 * @name resetStyle
 * @category Browsers
 * @description Restores the inline styles an element had before the most recent
 * cached {@link setStyle}. With `prop` it restores a single property; otherwise
 * it restores every property that was remembered. A no-op if nothing was cached.
 *
 * @param {Element | HTMLElement | null} element The element to restore
 * @param {string} [prop] Restore only this property instead of all of them
 * @returns {void}
 *
 * @example
 * resetStyle(el); // restore everything setStyle changed
 * resetStyle(el, 'transform'); // restore just the transform
 *
 * @since 0.0.5
 */
export function resetStyle(element: Element | HTMLElement | null, prop?: string): void {
  if (!element || !(element instanceof HTMLElement))
    return;

  const previous = originalStyles.get(element);

  if (!previous)
    return;

  if (prop) {
    (element.style as unknown as StylePatch)[prop] = previous[prop];
    return;
  }

  for (const [key, value] of Object.entries(previous))
    (element.style as unknown as StylePatch)[key] = value;
}

/**
 * @name getTranslate
 * @category Browsers
 * @description Reads the current translation of an element along one axis from
 * its computed `transform`, parsing both `matrix(...)` (2D) and `matrix3d(...)`
 * (3D) forms. Returns `null` when the element has no matrix transform.
 *
 * @param {HTMLElement} element The element to measure
 * @param {TranslateAxis} axis `'x'` for horizontal, `'y'` for vertical
 * @returns {number | null} The translation in pixels, or `null` if none
 *
 * @example
 * const offset = getTranslate(panel, 'y'); // px the panel is shifted down
 *
 * @since 0.0.5
 */
export function getTranslate(element: HTMLElement, axis: TranslateAxis): number | null {
  const style = globalThis.getComputedStyle(element);
  const transform
    // @ts-expect-error — vendor-prefixed transforms only exist in some browsers
    = style.transform || style.webkitTransform || style.mozTransform;

  let match = transform.match(/^matrix3d\((.+)\)$/);
  if (match) {
    // matrix3d: the translate components live at indices 12 (x) and 13 (y).
    // https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix3d
    return Number.parseFloat(match[1].split(', ')[axis === 'y' ? 13 : 12]);
  }

  // matrix: the translate components live at indices 4 (x) and 5 (y).
  // https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function/matrix
  match = transform.match(/^matrix\((.+)\)$/);
  return match ? Number.parseFloat(match[1].split(', ')[axis === 'y' ? 5 : 4]) : null;
}

/**
 * @name assignStyle
 * @category Browsers
 * @description Merges a style patch onto an element's inline `style` and returns
 * a cleanup function that restores the element's entire previous `cssText`.
 * Unlike {@link setStyle}, the snapshot is the full `cssText`, so the cleanup is
 * an all-or-nothing revert — handy for scoped effects.
 *
 * @param {HTMLElement | null | undefined} element The element to style
 * @param {Partial<CSSStyleDeclaration>} style The styles to assign
 * @returns {() => void} A cleanup function that restores the previous `cssText`
 *
 * @example
 * const restore = assignStyle(document.body, { overflow: 'hidden' });
 * // ...later
 * restore();
 *
 * @since 0.0.5
 */
export function assignStyle(element: HTMLElement | null | undefined, style: Partial<CSSStyleDeclaration>): () => void {
  if (!element)
    return () => {};

  const previousCssText = element.style.cssText;
  Object.assign(element.style, style);

  return () => {
    element.style.cssText = previousCssText;
  };
}

/**
 * @name isInView
 * @category Browsers
 * @description Reports whether an element is fully within the visual viewport,
 * accounting for on-screen keyboards via `window.visualViewport`. A 40px slack
 * is allowed at the bottom to tolerate Safari's viewport quirks. Returns `false`
 * when `visualViewport` is unavailable.
 *
 * @param {HTMLElement} element The element to test
 * @returns {boolean} `true` if the element's rect fits inside the visual viewport
 *
 * @example
 * if (!isInView(focusedField)) scrollIntoView(focusedField);
 *
 * @since 0.0.5
 */
export function isInView(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();

  if (!window.visualViewport)
    return false;

  return (
    rect.top >= 0
    && rect.left >= 0
    // +40 of slack for Safari's visual-viewport reporting.
    && rect.bottom <= window.visualViewport.height - 40
    && rect.right <= window.visualViewport.width
  );
}
