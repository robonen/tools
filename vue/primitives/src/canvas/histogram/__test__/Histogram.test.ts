import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { HistogramBars, HistogramRoot } from '../index';
import { histogramMax, projectBarHeight, projectBars } from '../utils';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

function mountHistogram(props: Record<string, unknown>) {
  const Harness = defineComponent({
    setup: () => () => h(HistogramRoot, props, { default: () => h(HistogramBars) }),
  });
  return track(mount(Harness, { attachTo: document.body }));
}

describe('Histogram — bar projection (unit)', () => {
  it('histogramMax returns the peak; 0 for empty / all-zero', () => {
    expect(histogramMax([])).toBe(0);
    expect(histogramMax([0, 0, 0])).toBe(0);
    expect(histogramMax([1, 9, 3])).toBe(9);
  });

  it('linear projection normalises against the peak', () => {
    const heights = projectBars([0, 5, 10], 'linear');
    expect(heights[0]).toBe(0);
    expect(heights[1]).toBeCloseTo(0.5, 5);
    expect(heights[2]).toBe(1);
  });

  it('log projection is 0 at empty bins and 1 at the peak, monotonic', () => {
    const heights = projectBars([0, 5, 100], 'log');
    expect(heights[0]).toBe(0);
    expect(heights[2]).toBeCloseTo(1, 5);
    // Monotonic non-decreasing.
    expect(heights[1]!).toBeGreaterThan(heights[0]!);
    expect(heights[2]!).toBeGreaterThan(heights[1]!);
    // Log compresses: the midpoint sits well above its linear 0.05.
    expect(heights[1]!).toBeGreaterThan(0.05);
  });

  it('all-zero / empty input yields 0 height with no NaN', () => {
    for (const scale of ['linear', 'log'] as const) {
      const zeros = projectBars([0, 0, 0], scale);
      expect(zeros.every(h => h === 0)).toBe(true);
      expect(zeros.some(Number.isNaN)).toBe(false);
      const empty = projectBars([], scale);
      expect(empty).toHaveLength(0);
    }
  });

  it('projectBarHeight guards divide-by-zero (max <= 0 → 0)', () => {
    expect(projectBarHeight(5, 0, 'linear')).toBe(0);
    expect(projectBarHeight(5, 0, 'log')).toBe(0);
    expect(Number.isNaN(projectBarHeight(5, 0, 'linear'))).toBe(false);
  });
});

describe('Histogram — root ARIA + rendering', () => {
  it('exposes role="img" with a channel summary label', async () => {
    mountHistogram({ data: [1, 2, 3], channel: 'l' });
    await nextTick();
    const root = document.querySelector<HTMLElement>('[role="img"]')!;
    expect(root).toBeTruthy();
    expect(root.getAttribute('aria-label')).toBe('Histogram, L');
    expect(root.getAttribute('data-channel')).toBe('l');
  });

  it('reports "no data" for an all-zero / empty histogram', async () => {
    mountHistogram({ data: [0, 0, 0], channel: 'r' });
    await nextTick();
    const root = document.querySelector<HTMLElement>('[role="img"]')!;
    expect(root.getAttribute('aria-label')).toBe('Histogram, R, no data');
    expect(root.hasAttribute('data-empty')).toBe(true);
  });

  it('role="group" when group is set', async () => {
    mountHistogram({ data: [1, 2], group: true });
    await nextTick();
    expect(document.querySelector('[role="group"]')).toBeTruthy();
    expect(document.querySelector('[role="img"]')).toBeNull();
  });

  it('bars are aria-hidden and compute normalised heights', async () => {
    mountHistogram({ data: [0, 50, 100], channel: 'l' });
    await nextTick();
    const bars = document.querySelector<HTMLElement>('[aria-hidden="true"]')!;
    expect(bars).toBeTruthy();
    const drawn = bars.querySelectorAll<HTMLElement>('[data-bar]');
    expect(drawn).toHaveLength(3);
    // Peak (100) → 100% height.
    expect(drawn[2]!.style.height).toBe('100%');
    expect(drawn[0]!.style.height).toBe('0%');
  });

  it('rgb composite expands to three primary channels', async () => {
    const Harness = defineComponent({
      setup: () => () => h(
        HistogramRoot,
        { data: { r: [1, 2], g: [3, 4], b: [5, 6] }, channel: 'rgb' },
        { default: () => h(HistogramBars) },
      ),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    expect(document.querySelector('[data-channel="r"]')).toBeTruthy();
    expect(document.querySelector('[data-channel="g"]')).toBeTruthy();
    expect(document.querySelector('[data-channel="b"]')).toBeTruthy();
    expect(document.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('Histogram, RGB');
  });

  it('record data renders the requested single channel', async () => {
    const Harness = defineComponent({
      setup: () => () => h(
        HistogramRoot,
        { data: { r: [10, 20], g: [0, 0] }, channel: 'r' },
        { default: () => h(HistogramBars) },
      ),
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const group = document.querySelector<HTMLElement>('[data-channel="r"]')!;
    const drawn = group.querySelectorAll<HTMLElement>('[data-bar]');
    expect(drawn[1]!.style.height).toBe('100%');
  });
});
