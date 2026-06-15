import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import type { WaveformRegionData } from '../utils';
import {
  WaveformBars,
  WaveformCursor,
  WaveformEmpty,
  WaveformRegion,
  WaveformRegionHandle,
  WaveformRoot,
} from '../index';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

function makePeaks(n: number): number[] {
  return Array.from({ length: n }, (_, i) => Math.sin((i / n) * Math.PI * 8));
}

const ROOT_STYLE = 'position: relative; width: 300px; height: 60px; display: block;';

function keydown(el: Element, key: string, opts: { shiftKey?: boolean } = {}): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, shiftKey: opts.shiftKey ?? false }));
}

// Wait for the ResizeObserver-backed width to settle.
async function settle(): Promise<void> {
  await nextTick();
  await new Promise(r => requestAnimationFrame(() => r(null)));
  await nextTick();
}

interface RootOpts {
  peaks?: number[];
  duration?: number;
  currentTime?: number;
  regions?: WaveformRegionData[];
  createRegionOnDrag?: boolean;
  disabled?: boolean;
  step?: number;
}

function mountRoot(opts: RootOpts = {}, children?: (props: any) => any) {
  const currentTime = ref(opts.currentTime ?? 0);
  const regions = ref<WaveformRegionData[]>(opts.regions ?? []);
  const events = {
    seekCommit: [] as number[],
    regionCreate: [] as WaveformRegionData[],
    regionUpdate: [] as WaveformRegionData[],
    regionRemove: [] as string[],
  };
  const Harness = defineComponent({
    setup() {
      return () => h(WaveformRoot, {
        peaks: opts.peaks ?? makePeaks(200),
        peaksRange: '-1..1',
        duration: opts.duration ?? 100,
        currentTime: currentTime.value,
        'onUpdate:currentTime': (v: number) => { currentTime.value = v; },
        regions: regions.value,
        'onUpdate:regions': (v: WaveformRegionData[]) => { regions.value = v; },
        createRegionOnDrag: opts.createRegionOnDrag,
        disabled: opts.disabled,
        step: opts.step,
        style: ROOT_STYLE,
        onSeekCommit: (t: number) => events.seekCommit.push(t),
        onRegionCreate: (r: WaveformRegionData) => events.regionCreate.push(r),
        onRegionUpdate: (r: WaveformRegionData) => events.regionUpdate.push(r),
        onRegionRemove: (id: string) => events.regionRemove.push(id),
      }, {
        default: (slotProps: any) => children
          ? children(slotProps)
          : [
              h(WaveformBars),
              h(WaveformCursor, { 'aria-label': 'Playback position' }),
            ],
      });
    },
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, currentTime, regions, events };
}

describe('Waveform — cursor', () => {
  it('renders the cursor as role="slider" with aria-value* attrs', async () => {
    mountRoot({ duration: 100, currentTime: 25 });
    await settle();
    const cursor = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(cursor).toBeTruthy();
    expect(cursor.getAttribute('aria-valuemin')).toBe('0');
    expect(cursor.getAttribute('aria-valuemax')).toBe('100');
    expect(cursor.getAttribute('aria-valuenow')).toBe('25');
    expect(cursor.getAttribute('aria-orientation')).toBe('horizontal');
    expect(cursor.getAttribute('aria-label')).toBe('Playback position');
    expect(cursor.tabIndex).toBe(0);
  });

  it('Arrow Right/Left scrub by step seconds', async () => {
    const { currentTime } = mountRoot({ duration: 100, currentTime: 50, step: 5 });
    await settle();
    const cursor = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(cursor, 'ArrowRight');
    await nextTick();
    expect(currentTime.value).toBe(55);
    keydown(cursor, 'ArrowLeft');
    keydown(cursor, 'ArrowLeft');
    await nextTick();
    expect(currentTime.value).toBe(45);
  });

  it('Home/End seek to 0 / duration', async () => {
    const { currentTime } = mountRoot({ duration: 100, currentTime: 30, step: 1 });
    await settle();
    const cursor = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(cursor, 'End');
    await nextTick();
    expect(currentTime.value).toBe(100);
    keydown(cursor, 'Home');
    await nextTick();
    expect(currentTime.value).toBe(0);
  });

  it('clamps seeks to [0, duration] (no NaN, no overflow)', async () => {
    const { currentTime } = mountRoot({ duration: 10, currentTime: 9, step: 5 });
    await settle();
    const cursor = document.querySelector<HTMLElement>('[role="slider"]')!;
    keydown(cursor, 'ArrowRight');
    keydown(cursor, 'ArrowRight');
    await nextTick();
    expect(currentTime.value).toBe(10);
    expect(Number.isNaN(currentTime.value)).toBe(false);
  });

  it('is positioned via the projection (left grows with time)', async () => {
    const { currentTime, wrapper } = mountRoot({ duration: 100, currentTime: 0, step: 10 });
    await settle();
    const cursor = document.querySelector<HTMLElement>('[role="slider"]')!;
    const at0 = cursor.style.left;
    currentTime.value = 50;
    await wrapper.setProps({});
    await nextTick();
    const at50 = cursor.style.left;
    expect(at0).toBe('0px');
    expect(Number.parseFloat(at50)).toBeGreaterThan(0);
  });
});

describe('Waveform — bars', () => {
  it('resamples to the expected bar count for the width / barWidth / barGap', async () => {
    // width 300, barWidth 2, barGap 1 → 100 bars regardless of peaks length.
    mountRoot({ peaks: makePeaks(777), duration: 100 });
    await settle();
    const bars = document.querySelectorAll('[data-waveform-bar]');
    expect(bars.length).toBe(100);
  });

  it('renders nothing meaningful when peaks are empty', async () => {
    mountRoot({ peaks: [], duration: 100 });
    await settle();
    const bars = document.querySelectorAll('[data-waveform-bar]');
    expect(bars.length).toBe(0);
  });
});

describe('Waveform — empty state', () => {
  it('sets data-empty on the root when duration is 0', async () => {
    mountRoot({ duration: 0 }, () => [h(WaveformEmpty, null, { default: () => 'No audio' })]);
    await settle();
    const root = document.querySelector<HTMLElement>('[data-waveform-root]')!;
    expect(root.hasAttribute('data-empty')).toBe(true);
    expect(document.querySelector('[data-waveform-empty]')).toBeTruthy();
  });

  it('no data-empty when there is audio', async () => {
    mountRoot({ duration: 100, peaks: makePeaks(100) });
    await settle();
    const root = document.querySelector<HTMLElement>('[data-waveform-root]')!;
    expect(root.hasAttribute('data-empty')).toBe(false);
  });

  it('pins the cursor at 0 with no NaN when duration is 0', async () => {
    mountRoot({ duration: 0 });
    await settle();
    const cursor = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(cursor.getAttribute('aria-valuenow')).toBe('0');
    expect(cursor.style.left).toBe('0px');
  });
});

describe('Waveform — regions', () => {
  function mountWithRegion(region: WaveformRegionData, opts: RootOpts = {}) {
    return mountRoot({ ...opts, regions: [region] }, () => [
      h(WaveformBars),
      h(WaveformRegion, { regionId: region.id }, {
        default: () => [
          h(WaveformRegionHandle, { edge: 'start' }),
          h(WaveformRegionHandle, { edge: 'end' }),
        ],
      }),
    ]);
  }

  it('renders the region as role="group" with formatted aria-label', async () => {
    mountWithRegion({ id: 'r1', start: 20, end: 40, label: 'Intro' });
    await settle();
    const group = document.querySelector<HTMLElement>('[role="group"]')!;
    expect(group).toBeTruthy();
    expect(group.getAttribute('aria-label')).toContain('Intro');
  });

  it('renders two handles as role="slider" (Region start / Region end)', async () => {
    mountWithRegion({ id: 'r1', start: 20, end: 40 });
    await settle();
    const handles = document.querySelectorAll<HTMLElement>('[role="group"] [role="slider"]');
    expect(handles).toHaveLength(2);
    expect(handles[0]!.getAttribute('aria-label')).toBe('Region start');
    expect(handles[1]!.getAttribute('aria-label')).toBe('Region end');
    expect(handles[0]!.getAttribute('aria-valuenow')).toBe('20');
    expect(handles[1]!.getAttribute('aria-valuenow')).toBe('40');
  });

  it('keyboard trims the start handle by step', async () => {
    const { regions } = mountWithRegion({ id: 'r1', start: 20, end: 40 }, { step: 5 });
    await settle();
    const startHandle = document.querySelector<HTMLElement>('[role="slider"][data-edge="start"]')!;
    keydown(startHandle, 'ArrowRight');
    await nextTick();
    expect(regions.value[0]!.start).toBe(25);
  });

  it('Home moves the start handle to 0; End moves end to duration', async () => {
    const { regions } = mountWithRegion({ id: 'r1', start: 20, end: 40 }, { duration: 100, step: 1 });
    await settle();
    const startHandle = document.querySelector<HTMLElement>('[data-edge="start"]')!;
    const endHandle = document.querySelector<HTMLElement>('[data-edge="end"]')!;
    keydown(startHandle, 'Home');
    await nextTick();
    expect(regions.value[0]!.start).toBe(0);
    keydown(endHandle, 'End');
    await nextTick();
    expect(regions.value[0]!.end).toBe(100);
  });

  it('Delete on the region removes it and emits regionRemove', async () => {
    const { regions, events } = mountWithRegion({ id: 'r1', start: 20, end: 40 });
    await settle();
    const group = document.querySelector<HTMLElement>('[role="group"]')!;
    keydown(group, 'Delete');
    await nextTick();
    expect(regions.value).toHaveLength(0);
    expect(events.regionRemove).toContain('r1');
  });
});

describe('Waveform — disabled', () => {
  it('blocks keyboard seeks and sets aria/data-disabled', async () => {
    const { currentTime } = mountRoot({ duration: 100, currentTime: 50, step: 5, disabled: true });
    await settle();
    const cursor = document.querySelector<HTMLElement>('[role="slider"]')!;
    expect(cursor.tabIndex).toBe(-1);
    expect(cursor.getAttribute('aria-disabled')).toBe('true');
    keydown(cursor, 'ArrowRight');
    await nextTick();
    expect(currentTime.value).toBe(50);
    const root = document.querySelector<HTMLElement>('[data-waveform-root]')!;
    expect(root.hasAttribute('data-disabled')).toBe(true);
  });
});

describe('Waveform — createRegionOnDrag', () => {
  it('emits a new region when a marquee drag commits', async () => {
    const { regions, events } = mountRoot({ duration: 100, createRegionOnDrag: true }, () => [h(WaveformBars)]);
    await settle();
    const root = document.querySelector<HTMLElement>('[data-waveform-root]')!;
    const rect = root.getBoundingClientRect();
    const id = 1;
    const opts = (x: number) => ({ pointerId: id, clientX: rect.left + x, clientY: rect.top + 10, button: 0, bubbles: true, cancelable: true });
    root.dispatchEvent(new PointerEvent('pointerdown', opts(30)));
    root.dispatchEvent(new PointerEvent('pointermove', opts(150)));
    await new Promise(r => requestAnimationFrame(() => r(null)));
    root.dispatchEvent(new PointerEvent('pointerup', opts(150)));
    await nextTick();
    expect(events.regionCreate.length).toBeGreaterThan(0);
    expect(regions.value.length).toBe(1);
    expect(regions.value[0]!.end).toBeGreaterThan(regions.value[0]!.start);
  });
});
