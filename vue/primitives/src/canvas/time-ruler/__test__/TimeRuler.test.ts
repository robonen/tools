import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { provideConfig } from '../../../utilities/config-provider';
import { TimeRulerCursor, TimeRulerRoot } from '../index';

// Minimal declarative config wrapper (the package ships no ConfigProvider
// component; config is provided via `provideConfig` inside a setup).
const ConfigProvider = defineComponent({
  props: { dir: { type: String, default: undefined } },
  setup(props, { slots }) {
    provideConfig({ dir: () => props.dir as 'ltr' | 'rtl' | undefined });
    return () => slots.default?.();
  },
});

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

interface MountOpts {
  duration?: number;
  fps?: number;
  mode?: 'seconds' | 'timecode' | 'frames';
  zoom?: number;
  offset?: number;
  minZoom?: number;
  maxZoom?: number;
  focusable?: boolean;
  disabled?: boolean;
  width?: number;
  dir?: 'ltr' | 'rtl';
}

// Drive the root through a controlled harness so we can read back `offset` /
// `zoom`, and give the root a fixed CSS width so its measured geometry is real.
function mountRuler(opts: MountOpts = {}) {
  const { width = 600, dir, ...rootProps } = opts;
  const offset = ref(opts.offset ?? 0);
  const zoom = ref(opts.zoom ?? 100);

  let exposed: any;

  const Harness = defineComponent({
    setup() {
      const setExposed = (el: any) => {
        exposed = el;
      };
      return () => h(ConfigProvider, { dir }, {
        default: () => h(TimeRulerRoot, {
          ...rootProps,
          ref: setExposed,
          style: { display: 'block', width: `${width}px`, position: 'relative' },
          offset: offset.value,
          'onUpdate:offset': (v: number) => { offset.value = v; },
          zoom: zoom.value,
          'onUpdate:zoom': (v: number) => { zoom.value = v; },
        }),
      });
    },
  });

  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, offset, zoom, getExposed: () => exposed };
}

function keydown(el: Element, key: string, opts: { shiftKey?: boolean; ctrlKey?: boolean } = {}): void {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    shiftKey: opts.shiftKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
  });
  el.dispatchEvent(event);
}

/** Wait a frame for ResizeObserver-backed `useElementSize` to flush. */
async function settle(): Promise<void> {
  await nextTick();
  await new Promise(r => requestAnimationFrame(() => r(null)));
  await nextTick();
}

describe('timeRulerRoot — rendering & a11y', () => {
  it('renders role=group with horizontal orientation', () => {
    const { wrapper } = mountRuler({ duration: 60 });
    const root = wrapper.find('[role="group"]');
    expect(root.exists()).toBe(true);
    expect(root.attributes('aria-orientation')).toBe('horizontal');
    expect(root.attributes('data-orientation')).toBe('horizontal');
  });

  it('reflects aria-disabled / data-disabled when disabled', () => {
    const { wrapper } = mountRuler({ duration: 60, disabled: true });
    const root = wrapper.find('[role="group"]');
    expect(root.attributes('aria-disabled')).toBe('true');
    expect(root.attributes('data-disabled')).toBe('');
  });

  it('is focusable (tabindex 0) only when focusable and enabled', () => {
    const { wrapper: a } = mountRuler({ duration: 60, focusable: true });
    expect(a.find('[role="group"]').attributes('tabindex')).toBe('0');
    const { wrapper: b } = mountRuler({ duration: 60 });
    expect(b.find('[role="group"]').attributes('tabindex')).toBeUndefined();
    const { wrapper: c } = mountRuler({ duration: 60, focusable: true, disabled: true });
    expect(c.find('[role="group"]').attributes('tabindex')).toBeUndefined();
  });
});

describe('timeRulerRoot — scale & ticks', () => {
  it('exposes scale/invert that round-trip and ticks that are non-empty', async () => {
    const { getExposed } = mountRuler({ duration: 60, zoom: 100, width: 600 });
    await settle();
    const ex = getExposed();
    expect(ex).toBeTruthy();
    // scale/invert round-trip (offset 0, zoom 100 → 1s = 100px).
    expect(ex.scale(0)).toBeCloseTo(0, 3);
    expect(ex.scale(1)).toBeCloseTo(100, 3);
    expect(ex.invert(ex.scale(3.5))).toBeCloseTo(3.5, 3);
    // ticks span the visible window [0, 6s] → non-empty. (Exposed computed refs
    // are auto-unwrapped on the public instance proxy, so read them directly.)
    expect(ex.ticks.length).toBeGreaterThan(0);
  });

  it('formatTime renders clock labels in seconds mode', () => {
    const { getExposed } = mountRuler({ duration: 600, mode: 'seconds' });
    const ex = getExposed();
    expect(ex.formatTime(0)).toBe('0:00');
    expect(ex.formatTime(75)).toBe('1:15');
    expect(ex.formatTime(3661)).toBe('1:01:01');
  });

  it('formatTime renders HH:MM:SS:FF in timecode mode', () => {
    const { getExposed } = mountRuler({ duration: 600, mode: 'timecode', fps: 30 });
    const ex = getExposed();
    expect(ex.formatTime(0)).toBe('00:00:00:00');
    // 1.5s @30fps → 1 second + 15 frames.
    expect(ex.formatTime(1.5)).toBe('00:00:01:15');
    expect(ex.formatTime(61)).toBe('00:01:01:00');
  });

  it('produces timecode-formatted tick labels in timecode mode', async () => {
    const { getExposed } = mountRuler({ duration: 60, mode: 'timecode', fps: 30, zoom: 200, width: 600 });
    await settle();
    const ex = getExposed();
    const labelled = ex.majorTicks.filter((t: any) => t.label);
    expect(labelled.length).toBeGreaterThan(0);
    for (const t of labelled) {
      expect(t.label).toMatch(/^\d{2}:\d{2}:\d{2}:\d{2}$/);
    }
  });

  it('formatTime renders bare frame numbers in frames mode', () => {
    const { getExposed } = mountRuler({ duration: 600, mode: 'frames', fps: 30 });
    const ex = getExposed();
    expect(ex.formatTime(0)).toBe('0');
    expect(ex.formatTime(2)).toBe('60');
  });
});

describe('timeRulerRoot — keyboard pan & zoom', () => {
  it('ArrowRight pans the offset forward', async () => {
    const { wrapper, offset } = mountRuler({ duration: 600, focusable: true, zoom: 100, width: 600 });
    await settle();
    const root = wrapper.find('[role="group"]').element;
    const before = offset.value;
    keydown(root, 'ArrowRight');
    await nextTick();
    expect(offset.value).toBeGreaterThan(before);
  });

  it('ArrowLeft is clamped at zero (no negative offset)', async () => {
    const { wrapper, offset } = mountRuler({ duration: 600, focusable: true, zoom: 100, width: 600, offset: 0 });
    await settle();
    const root = wrapper.find('[role="group"]').element;
    keydown(root, 'ArrowLeft');
    await nextTick();
    expect(offset.value).toBe(0);
  });

  it('Shift+ArrowRight pans by a larger (major) interval than ArrowRight', async () => {
    const a = mountRuler({ duration: 600, focusable: true, zoom: 100, width: 600 });
    await settle();
    keydown(a.wrapper.find('[role="group"]').element, 'ArrowRight');
    await nextTick();
    const minorDelta = a.offset.value;

    const b = mountRuler({ duration: 600, focusable: true, zoom: 100, width: 600 });
    await settle();
    keydown(b.wrapper.find('[role="group"]').element, 'ArrowRight', { shiftKey: true });
    await nextTick();
    const majorDelta = b.offset.value;

    expect(majorDelta).toBeGreaterThan(minorDelta);
  });

  it('+ increases zoom and - decreases it, clamped to min/max', async () => {
    const { wrapper, zoom } = mountRuler({
      duration: 600, focusable: true, zoom: 100, minZoom: 50, maxZoom: 300, width: 600,
    });
    await settle();
    const root = wrapper.find('[role="group"]').element;

    keydown(root, '+');
    await nextTick();
    expect(zoom.value).toBeGreaterThan(100);

    // Zoom in repeatedly → clamps at maxZoom. Await between presses so the
    // controlled `zoom` prop propagates back before the next keypress reads it.
    for (let i = 0; i < 20; i++) {
      keydown(root, '+');
      await nextTick();
    }
    expect(zoom.value).toBe(300);

    // Zoom out repeatedly → clamps at minZoom.
    for (let i = 0; i < 30; i++) {
      keydown(root, '-');
      await nextTick();
    }
    expect(zoom.value).toBe(50);
  });

  it('does not handle keys when not focusable', async () => {
    const { wrapper, offset } = mountRuler({ duration: 600, zoom: 100, width: 600 });
    await settle();
    const root = wrapper.find('[role="group"]').element;
    keydown(root, 'ArrowRight');
    await nextTick();
    expect(offset.value).toBe(0);
  });
});

describe('timeRulerRoot — settle events & state flags', () => {
  it('emits panCommit and rangeChange on keyboard pan', async () => {
    const onPan = ref<number[]>([]);
    const onRange = ref<Array<[number, number]>>([]);
    const Harness = defineComponent({
      setup() {
        const offset = ref(0);
        const zoom = ref(100);
        return () => h(TimeRulerRoot, {
          duration: 600,
          focusable: true,
          style: { display: 'block', width: '600px', position: 'relative' },
          offset: offset.value,
          'onUpdate:offset': (v: number) => { offset.value = v; },
          zoom: zoom.value,
          'onUpdate:zoom': (v: number) => { zoom.value = v; },
          onPanCommit: (o: number) => { onPan.value.push(o); },
          onRangeChange: (r: [number, number]) => { onRange.value.push(r); },
        });
      },
    });
    const w = track(mount(Harness, { attachTo: document.body }));
    await settle();
    keydown(w.find('[role="group"]').element, 'ArrowRight');
    await nextTick();
    expect(onPan.value.length).toBe(1);
    expect(onRange.value.length).toBe(1);
  });

  it('emits zoomCommit on + / -', async () => {
    const onZoom = ref<number[]>([]);
    const Harness = defineComponent({
      setup() {
        const zoom = ref(100);
        return () => h(TimeRulerRoot, {
          duration: 600,
          focusable: true,
          style: { display: 'block', width: '600px', position: 'relative' },
          zoom: zoom.value,
          'onUpdate:zoom': (v: number) => { zoom.value = v; },
          onZoomCommit: (z: number) => { onZoom.value.push(z); },
        });
      },
    });
    const w = track(mount(Harness, { attachTo: document.body }));
    await settle();
    keydown(w.find('[role="group"]').element, '+');
    await nextTick();
    expect(onZoom.value.length).toBe(1);
  });
});

describe('timeRulerCursor', () => {
  it('positions itself via the ruler scale', async () => {
    const Harness = defineComponent({
      setup() {
        return () => h(TimeRulerRoot, {
          duration: 600,
          zoom: 100,
          offset: 0,
          style: { display: 'block', width: '600px', position: 'relative' },
        }, {
          default: () => h(TimeRulerCursor, { time: 2, 'data-testid': 'cursor' }),
        });
      },
    });
    const w = track(mount(Harness, { attachTo: document.body }));
    await settle();
    const cursor = w.find('[data-testid="cursor"]');
    expect(cursor.exists()).toBe(true);
    // time 2s * 100px/s = 200px.
    expect(cursor.attributes('style')).toContain('left: 200px');
    expect(cursor.attributes('aria-hidden')).toBe('true');
    expect(cursor.attributes('role')).toBe('presentation');
  });
});
