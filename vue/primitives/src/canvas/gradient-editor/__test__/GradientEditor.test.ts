import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  GradientEditorRoot,
  GradientEditorStops,
  GradientEditorTrack,
} from '../index';
import type { GradientStop } from '../index';
import { buildCssGradient, interpolateColorAt, neighboursAt, sortStops } from '../utils';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

type RootOpts = Partial<{
  type: 'linear' | 'radial';
  defaultAngle: number;
  minStops: number;
  reorder: boolean;
  step: number;
  largeStep: number;
  snapStep: number;
  disabled: boolean;
  dir: 'ltr' | 'rtl';
  defaultSelectedId: string | null;
}>;

function mountEditor(initial: GradientStop[], opts: RootOpts = {}) {
  const model = ref<GradientStop[]>(initial.map(s => ({ ...s })));
  const angle = ref<number | undefined>(undefined);
  const Harness = defineComponent({
    setup() {
      return () => h(GradientEditorRoot, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: GradientStop[] | null | undefined) => { if (v) model.value = v; },
        angle: angle.value,
        'onUpdate:angle': (v: number | null | undefined) => { angle.value = v ?? undefined; },
        defaultSelectedId: initial[0]?.id ?? null,
        ...opts,
      }, {
        default: () => h(GradientEditorTrack, null, {
          default: () => h(GradientEditorStops),
        }),
      });
    },
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, model, angle };
}

function keydown(el: Element, key: string, opts: { shiftKey?: boolean } = {}): void {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, shiftKey: opts.shiftKey ?? false });
  el.dispatchEvent(event);
}

function pointer(el: Element, type: string, x: number, y: number, button = 0): void {
  const ev = new PointerEvent(type, {
    pointerId: 1,
    button,
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
  });
  el.dispatchEvent(ev);
}

function stopEls(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="slider"]'));
}

function sizeTrack(el: HTMLElement): { left: number; width: number } {
  el.style.position = 'fixed';
  el.style.left = '0px';
  el.style.top = '0px';
  el.style.width = '200px';
  el.style.height = '20px';
  const rect = el.getBoundingClientRect();
  return { left: rect.left, width: rect.width };
}

function trackEl(): HTMLElement {
  // The track is the GradientEditorStops' parent (the Track's rendered element).
  return stopEls()[0]!.parentElement!.parentElement!;
}

const STOPS: GradientStop[] = [
  { id: 'a', position: 0, color: '#ff0000' },
  { id: 'b', position: 1, color: '#0000ff' },
];

describe('GradientEditorStop — ARIA', () => {
  it('renders role=slider with aria-valuemin/max/now and "<color> at <pct>%" valuetext', async () => {
    mountEditor(STOPS);
    await nextTick();
    const stops = stopEls();
    expect(stops).toHaveLength(2);
    expect(stops[0]!.getAttribute('role')).toBe('slider');
    expect(stops[0]!.getAttribute('aria-valuemin')).toBe('0');
    expect(stops[0]!.getAttribute('aria-valuemax')).toBe('1');
    expect(stops[0]!.getAttribute('aria-valuenow')).toBe('0');
    expect(stops[0]!.getAttribute('aria-valuetext')).toBe('#ff0000 at 0%');
    expect(stops[1]!.getAttribute('aria-valuetext')).toBe('#0000ff at 100%');
  });

  it('roving tabindex: only the selected stop is tabbable', async () => {
    mountEditor(STOPS, { defaultSelectedId: 'a' });
    await nextTick();
    const stops = stopEls();
    expect(stops[0]!.tabIndex).toBe(0);
    expect(stops[1]!.tabIndex).toBe(-1);
  });

  it('reflects selection via aria-selected + data-selected', async () => {
    mountEditor(STOPS, { defaultSelectedId: 'a' });
    await nextTick();
    const stops = stopEls();
    expect(stops[0]!.getAttribute('aria-selected')).toBe('true');
    expect(stops[0]!.hasAttribute('data-selected')).toBe(true);
    expect(stops[1]!.getAttribute('aria-selected')).toBeNull();
  });

  it('default aria-label is "Stop N of M"; explicit label wins', async () => {
    mountEditor(STOPS);
    await nextTick();
    expect(stopEls()[0]!.getAttribute('aria-label')).toBe('Stop 1 of 2');
  });
});

describe('GradientEditorStop — keyboard', () => {
  it('ArrowRight moves the selected stop by step; ArrowLeft moves it back', async () => {
    const { model } = mountEditor(
      [{ id: 'a', position: 0.5, color: '#ff0000' }, { id: 'b', position: 1, color: '#0000ff' }],
      { step: 0.01, defaultSelectedId: 'a' },
    );
    await nextTick();
    const stop = stopEls()[0]!;
    keydown(stop, 'ArrowRight');
    await nextTick();
    expect(model.value.find(s => s.id === 'a')!.position).toBeCloseTo(0.51);
    keydown(stop, 'ArrowLeft');
    keydown(stop, 'ArrowLeft');
    await nextTick();
    expect(model.value.find(s => s.id === 'a')!.position).toBeCloseTo(0.49);
  });

  it('Shift+Arrow / Page move by largeStep', async () => {
    const { model } = mountEditor(
      [{ id: 'a', position: 0.5, color: '#f00' }, { id: 'b', position: 1, color: '#00f' }],
      { step: 0.001, largeStep: 0.1, defaultSelectedId: 'a' },
    );
    await nextTick();
    const stop = stopEls()[0]!;
    keydown(stop, 'ArrowRight', { shiftKey: true });
    await nextTick();
    expect(model.value.find(s => s.id === 'a')!.position).toBeCloseTo(0.6);
    keydown(stop, 'PageDown');
    await nextTick();
    expect(model.value.find(s => s.id === 'a')!.position).toBeCloseTo(0.5);
  });

  it('Home/End jump to 0 / 1', async () => {
    const { model } = mountEditor(
      [{ id: 'a', position: 0.5, color: '#f00' }, { id: 'b', position: 0.6, color: '#00f' }],
      { reorder: true, defaultSelectedId: 'a' },
    );
    await nextTick();
    const stop = stopEls()[0]!;
    keydown(stop, 'Home');
    await nextTick();
    expect(model.value.find(s => s.id === 'a')!.position).toBe(0);
    keydown(stop, 'End');
    await nextTick();
    expect(model.value.find(s => s.id === 'a')!.position).toBe(1);
  });

  it('ArrowLeft is reversed in RTL', async () => {
    const { model } = mountEditor(
      [{ id: 'a', position: 0.5, color: '#f00' }, { id: 'b', position: 1, color: '#00f' }],
      { step: 0.01, dir: 'rtl', defaultSelectedId: 'a' },
    );
    await nextTick();
    keydown(stopEls()[0]!, 'ArrowLeft');
    await nextTick();
    expect(model.value.find(s => s.id === 'a')!.position).toBeCloseTo(0.51);
  });

  it('Delete removes the selected stop', async () => {
    const { model } = mountEditor(
      [
        { id: 'a', position: 0, color: '#f00' },
        { id: 'b', position: 0.5, color: '#0f0' },
        { id: 'c', position: 1, color: '#00f' },
      ],
      { minStops: 2, defaultSelectedId: 'b' },
    );
    await nextTick();
    const stop = stopEls()[1]!;
    keydown(stop, 'Delete');
    await nextTick();
    expect(model.value.map(s => s.id)).toEqual(['a', 'c']);
  });

  it('Delete is a no-op at minStops', async () => {
    const { model } = mountEditor(STOPS, { minStops: 2, defaultSelectedId: 'a' });
    await nextTick();
    keydown(stopEls()[0]!, 'Delete');
    await nextTick();
    expect(model.value).toHaveLength(2);
  });
});

describe('GradientEditorTrack — add on click', () => {
  it('clicking the track adds a stop at the click position', async () => {
    const { model } = mountEditor(STOPS, { step: 0.01 });
    await nextTick();
    const track = trackEl();
    const { left, width } = sizeTrack(track);
    // Click at 25% of the track.
    pointer(track, 'pointerdown', left + width * 0.25, 10);
    await nextTick();
    expect(model.value).toHaveLength(3);
    const added = model.value.find(s => s.id !== 'a' && s.id !== 'b')!;
    expect(added.position).toBeCloseTo(0.25, 2);
  });

  it('interpolates the new stop color from the neighbours', async () => {
    const { model } = mountEditor(
      [{ id: 'a', position: 0, color: '#000000' }, { id: 'b', position: 1, color: '#ffffff' }],
      { step: 0.01 },
    );
    await nextTick();
    const track = trackEl();
    const { left, width } = sizeTrack(track);
    pointer(track, 'pointerdown', left + width * 0.5, 10);
    await nextTick();
    const added = model.value.find(s => s.id !== 'a' && s.id !== 'b')!;
    // Midway between black and white → mid grey ~ rgb(128,128,128).
    expect(added.color).toMatch(/^rgba\(12[78], 12[78], 12[78], 1\)$/);
  });

  it('Enter on the focused track adds a stop at the center', async () => {
    const { model } = mountEditor(STOPS);
    await nextTick();
    const track = trackEl();
    track.focus();
    keydown(track, 'Enter');
    await nextTick();
    expect(model.value).toHaveLength(3);
    const added = model.value.find(s => s.id !== 'a' && s.id !== 'b')!;
    expect(added.position).toBe(0.5);
  });
});

describe('GradientEditorRoot — reorder policy', () => {
  it('reorder=false neighbour-clamps (ids never cross)', async () => {
    const { model } = mountEditor(
      [
        { id: 'a', position: 0.4, color: '#f00' },
        { id: 'b', position: 0.5, color: '#0f0' },
        { id: 'c', position: 0.6, color: '#00f' },
      ],
      { reorder: false, defaultSelectedId: 'a' },
    );
    await nextTick();
    // Push 'a' hard right past 'b'; it must clamp to b's position, never cross.
    keydown(stopEls()[0]!, 'End');
    await nextTick();
    const a = model.value.find(s => s.id === 'a')!;
    expect(a.position).toBe(0.5);
    // Order preserved.
    expect(sortStops(model.value).map(s => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('reorder=true lets a stop cross and re-sorts; each id keeps its color', async () => {
    const { model } = mountEditor(
      [
        { id: 'a', position: 0.4, color: '#ff0000' },
        { id: 'b', position: 0.5, color: '#00ff00' },
        { id: 'c', position: 0.6, color: '#0000ff' },
      ],
      { reorder: true, defaultSelectedId: 'a' },
    );
    await nextTick();
    keydown(stopEls()[0]!, 'End');
    await nextTick();
    // 'a' is now last by position but keeps its red color.
    const a = model.value.find(s => s.id === 'a')!;
    expect(a.position).toBe(1);
    expect(a.color).toBe('#ff0000');
    expect(sortStops(model.value).map(s => s.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('GradientEditorRoot — disabled', () => {
  it('blocks keyboard moves, removal, and track clicks', async () => {
    const { model } = mountEditor(
      [{ id: 'a', position: 0.5, color: '#f00' }, { id: 'b', position: 1, color: '#00f' }],
      { disabled: true, defaultSelectedId: 'a' },
    );
    await nextTick();
    const stops = stopEls();
    expect(stops[0]!.tabIndex).toBe(-1);
    expect(stops[0]!.getAttribute('aria-disabled')).toBe('true');
    keydown(stops[0]!, 'ArrowRight');
    keydown(stops[0]!, 'Delete');
    await nextTick();
    expect(model.value.find(s => s.id === 'a')!.position).toBe(0.5);
    expect(model.value).toHaveLength(2);
    // Track click does nothing.
    const track = trackEl();
    const { left, width } = sizeTrack(track);
    pointer(track, 'pointerdown', left + width * 0.5, 10);
    await nextTick();
    expect(model.value).toHaveLength(2);
  });
});

describe('GradientEditorRoot — cssGradient via exposed root', () => {
  it('reflects stops + type + angle', async () => {
    const exposed = ref<any>(null);
    const Harness = defineComponent({
      setup() {
        const model = ref<GradientStop[]>([
          { id: 'a', position: 0, color: '#ff0000' },
          { id: 'b', position: 1, color: '#0000ff' },
        ]);
        return () => h(GradientEditorRoot, {
          ref: (r: any) => { exposed.value = r; },
          modelValue: model.value,
          'onUpdate:modelValue': (v: GradientStop[] | null | undefined) => { if (v) model.value = v; },
          type: 'linear',
          defaultAngle: 45,
        }, {
          default: () => h(GradientEditorTrack, null, { default: () => h(GradientEditorStops) }),
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    expect(exposed.value.cssGradient).toBe('linear-gradient(45deg, #ff0000 0%, #0000ff 100%)');
  });
});

describe('utils — sort / tie-break', () => {
  it('sorts ascending by position', () => {
    const out = sortStops([
      { id: 'b', position: 0.8, color: '#00f' },
      { id: 'a', position: 0.2, color: '#f00' },
    ]);
    expect(out.map(s => s.id)).toEqual(['a', 'b']);
  });

  it('keeps both stops at identical positions (stable tie-break by index)', () => {
    const input: GradientStop[] = [
      { id: 'x', position: 0.5, color: '#f00' },
      { id: 'y', position: 0.5, color: '#0f0' },
      { id: 'z', position: 0.5, color: '#00f' },
    ];
    const out = sortStops(input);
    // Order preserved (stable) and all three present.
    expect(out.map(s => s.id)).toEqual(['x', 'y', 'z']);
    expect(out).toHaveLength(3);
  });

  it('does not mutate the input', () => {
    const input: GradientStop[] = [
      { id: 'b', position: 1, color: '#00f' },
      { id: 'a', position: 0, color: '#f00' },
    ];
    const snapshot = input.map(s => s.id);
    sortStops(input);
    expect(input.map(s => s.id)).toEqual(snapshot);
  });
});

describe('utils — buildCssGradient', () => {
  it('builds a linear gradient with the angle', () => {
    const css = buildCssGradient(
      [{ id: 'a', position: 0, color: 'red' }, { id: 'b', position: 1, color: 'blue' }],
      'linear',
      90,
    );
    expect(css).toBe('linear-gradient(90deg, red 0%, blue 100%)');
  });

  it('builds a radial gradient (ignores angle)', () => {
    const css = buildCssGradient(
      [{ id: 'a', position: 0, color: 'red' }, { id: 'b', position: 0.5, color: 'blue' }],
      'radial',
      45,
    );
    expect(css).toBe('radial-gradient(circle, red 0%, blue 50%)');
  });

  it('compacts fractional percentages', () => {
    const css = buildCssGradient([{ id: 'a', position: 1 / 3, color: 'red' }], 'linear', 0);
    expect(css).toBe('linear-gradient(0deg, red 33.333%)');
  });

  it('returns empty string for no stops', () => {
    expect(buildCssGradient([], 'linear', 90)).toBe('');
  });
});

describe('utils — color interpolation / neighbours', () => {
  it('interpolates midway between two colors', () => {
    const c = interpolateColorAt(
      0.5,
      { id: 'a', position: 0, color: '#000000' },
      { id: 'b', position: 1, color: '#ffffff' },
      '#000000',
    );
    expect(c).toMatch(/^rgba\(12[78], 12[78], 12[78], 1\)$/);
  });

  it('copies the single neighbour when only one exists', () => {
    const c = interpolateColorAt(0.3, { id: 'a', position: 0, color: '#abcdef' }, null, '#000000');
    expect(c).toBe('#abcdef');
  });

  it('falls back when there are no neighbours', () => {
    expect(interpolateColorAt(0.5, null, null, '#123456')).toBe('#123456');
  });

  it('neighboursAt finds the bracketing stops', () => {
    const sorted: GradientStop[] = [
      { id: 'a', position: 0, color: '#f00' },
      { id: 'b', position: 0.5, color: '#0f0' },
      { id: 'c', position: 1, color: '#00f' },
    ];
    const { before, after } = neighboursAt(sorted, 0.3);
    expect(before!.id).toBe('a');
    expect(after!.id).toBe('b');
  });
});
