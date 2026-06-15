import { clamp } from '@robonen/stdlib';
import type { ScrollAreaSizes, ScrollDirection } from './types';

// Re-exported so the existing public/test import surface (`./utils`) is preserved.
export { clamp };

export function toInt(value?: string | null): number {
  return value ? Number.parseInt(value, 10) || 0 : 0;
}

export function getThumbRatio(viewport: number, content: number): number {
  if (!content || viewport >= content)
    return 1;
  const r = viewport / content;
  return Number.isFinite(r) ? r : 0;
}

export function getThumbSize(sizes: ScrollAreaSizes): number {
  const ratio = getThumbRatio(sizes.viewport, sizes.content);
  const trackPadding = sizes.scrollbar.paddingStart + sizes.scrollbar.paddingEnd;
  const trackSize = sizes.scrollbar.size - trackPadding;
  const thumb = trackSize * ratio;
  return Math.max(thumb, 18);
}

function mapLinear(input: readonly [number, number], output: readonly [number, number]) {
  return (value: number) => {
    if (input[0] === input[1] || output[0] === output[1])
      return output[0];
    const ratio = (output[1] - output[0]) / (input[1] - input[0]);
    return output[0] + ratio * (value - input[0]);
  };
}

export function getThumbOffsetFromScroll(
  scrollPos: number,
  sizes: ScrollAreaSizes,
  dir: ScrollDirection = 'ltr',
): number {
  const thumbSize = getThumbSize(sizes);
  const trackPadding = sizes.scrollbar.paddingStart + sizes.scrollbar.paddingEnd;
  const trackSize = sizes.scrollbar.size - trackPadding;
  const maxScroll = sizes.content - sizes.viewport;
  const maxThumbPos = trackSize - thumbSize;
  const range: [number, number] = dir === 'ltr' ? [0, maxScroll] : [-maxScroll, 0];
  const clamped = clamp(scrollPos, range[0], range[1]);
  return mapLinear([0, maxScroll], [0, maxThumbPos])(dir === 'ltr' ? clamped : clamped + maxScroll);
}

export function getScrollPositionFromPointer(
  pointerPos: number,
  pointerOffset: number,
  sizes: ScrollAreaSizes,
  dir: ScrollDirection = 'ltr',
): number {
  const thumbSize = getThumbSize(sizes);
  const offset = pointerOffset || thumbSize / 2;
  const remainder = thumbSize - offset;
  const minPointer = sizes.scrollbar.paddingStart + offset;
  const maxPointer = sizes.scrollbar.size - sizes.scrollbar.paddingEnd - remainder;
  const maxScroll = sizes.content - sizes.viewport;
  const range: [number, number] = dir === 'ltr' ? [0, maxScroll] : [-maxScroll, 0];
  return mapLinear([minPointer, maxPointer], range)(pointerPos);
}

export function isScrollingWithinScrollbarBounds(scrollPos: number, maxScrollPos: number): boolean {
  return scrollPos > 0 && scrollPos < maxScrollPos;
}

export function addUnlinkedScrollListener(node: HTMLElement, handler: () => void): () => void {
  // Reuse two scratch number locals across ticks instead of allocating a fresh
  // `{ left, top }` object every frame: this rAF loop runs for the lifetime of
  // the component (and 2-4 instances per scroll area), so the per-frame object
  // was steady GC churn even while idle.
  let prevLeft = node.scrollLeft;
  let prevTop = node.scrollTop;
  let raf = 0;
  const loop = () => {
    const left = node.scrollLeft;
    const top = node.scrollTop;
    if (prevLeft !== left || prevTop !== top)
      handler();
    prevLeft = left;
    prevTop = top;
    raf = globalThis.requestAnimationFrame(loop);
  };
  raf = globalThis.requestAnimationFrame(loop);
  return () => globalThis.cancelAnimationFrame(raf);
}
