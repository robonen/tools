import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  KeyframeTrackEasingEditor,
  KeyframeTrackKeyframe,
  KeyframeTrackRoot,
} from '../index';
import type { KeyframeTrackKeyframeData } from '../index';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

function keydown(el: Element, key: string, opts: { shiftKey?: boolean } = {}): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, shiftKey: opts.shiftKey ?? false }));
}

interface MountOpts {
  defaultValue?: KeyframeTrackKeyframeData[];
  modelValue?: KeyframeTrackKeyframeData[];
  property?: string;
  valueAxis?: boolean;
  valueRange?: [number, number];
  duration?: number;
  fps?: number;
  step?: number;
  allowOverlap?: boolean;
  disabled?: boolean;
  selectedId?: string | null;
}

function mountTrack(opts: MountOpts = {}, withEasing = false) {
  const model = ref<KeyframeTrackKeyframeData[] | undefined>(opts.modelValue);
  const selected = ref<string | null>(opts.selectedId ?? null);
  const commits: string[] = [];
  const Harness = defineComponent({
    setup() {
      // Cast to `any` for the `h()` call: vue-tsc cannot resolve the `h` overload
      // for a `defineModel` component passed an inline props object (same pattern
      // the accordion/checkbox suites use); the runtime props are correct.
      return () => h(KeyframeTrackRoot as any, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: KeyframeTrackKeyframeData[]) => { model.value = v; },
        selectedId: selected.value,
        'onUpdate:selectedId': (v: string | null) => { selected.value = v; },
        onKeyframeCommit: (id: string) => { commits.push(id); },
        defaultValue: opts.defaultValue,
        property: opts.property,
        valueAxis: opts.valueAxis,
        valueRange: opts.valueRange,
        duration: opts.duration,
        fps: opts.fps,
        step: opts.step,
        allowOverlap: opts.allowOverlap,
        disabled: opts.disabled,
        style: 'width: 300px; height: 40px; position: relative; display: block;',
      }, {
        default: ({ keyframes }: { keyframes: KeyframeTrackKeyframeData[] }) => [
          ...keyframes.map(k => h(KeyframeTrackKeyframe, { key: k.id, keyframeId: k.id, id: `kf-${k.id}` })),
          ...(withEasing ? [h(KeyframeTrackEasingEditor)] : []),
        ],
      });
    },
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, model, selected, commits };
}

const TWO = (): KeyframeTrackKeyframeData[] => [
  { id: 'a', time: 0, value: 0, easing: [0, 0, 1, 1] },
  { id: 'b', time: 1, value: 1 },
];

describe('KeyframeTrack — rendering', () => {
  it('standalone root is a group with keyframe-track roledescription', async () => {
    mountTrack({ defaultValue: TWO(), property: 'opacity' });
    await nextTick();
    const root = document.querySelector('[aria-roledescription="keyframe track"]')!;
    expect(root).toBeTruthy();
    expect(root.getAttribute('role')).toBe('group');
    expect(root.getAttribute('aria-label')).toBe('opacity keyframes');
  });

  it('renders each keyframe as role="slider" with seconds aria-valuetext announcing the property + value', async () => {
    mountTrack({ defaultValue: TWO(), property: 'opacity' });
    await nextTick();
    const sliders = document.querySelectorAll<HTMLElement>('[role="slider"]');
    expect(sliders).toHaveLength(2);
    // aria-valuenow is the TIME in seconds (default, non-valueAxis).
    expect(sliders[0]!.getAttribute('aria-valuenow')).toBe('0');
    expect(sliders[1]!.getAttribute('aria-valuenow')).toBe('1');
    // aria-valuetext leads with the formatted time then property + value.
    expect(sliders[0]!.getAttribute('aria-valuetext')).toContain('opacity 0');
    expect(sliders[1]!.getAttribute('aria-valuetext')).toContain('opacity 1');
    expect(sliders[0]!.getAttribute('aria-orientation')).toBe('horizontal');
  });
});

describe('KeyframeTrack — keyboard', () => {
  it('ArrowRight nudges the keyframe forward by one frame (neighbour-clamped)', async () => {
    const { model } = mountTrack({ defaultValue: TWO(), fps: 30 });
    await nextTick();
    const first = document.getElementById('kf-a')!;
    keydown(first, 'ArrowRight');
    await nextTick();
    const a = model.value!.find(k => k.id === 'a')!;
    expect(a.time).toBeCloseTo(1 / 30, 6);
  });

  it('ArrowRight does not cross the next keyframe unless allowOverlap', async () => {
    mountTrack({
      defaultValue: [
        { id: 'a', time: 0, value: 0 },
        { id: 'b', time: 5 / 30, value: 1 },
      ],
      fps: 30,
    });
    await nextTick();
    const first = document.getElementById('kf-a')!;
    // Push hard into b; neighbour-clamp keeps a strictly before b by minTimeBetween (1 frame).
    for (let i = 0; i < 20; i++) keydown(first, 'ArrowRight');
    await nextTick();
    // aria-valuenow always reflects the live time (seconds), even when clamped.
    const aTime = Number(first.getAttribute('aria-valuenow'));
    const bTime = Number(document.getElementById('kf-b')!.getAttribute('aria-valuenow'));
    expect(aTime).toBeLessThan(bTime);
    // Clamped exactly one frame before b.
    expect(aTime).toBeCloseTo(4 / 30, 6);
  });

  it('ArrowLeft nudges backward and clamps at 0', async () => {
    mountTrack({ defaultValue: [{ id: 'a', time: 2 / 30, value: 0 }, { id: 'b', time: 1, value: 1 }], fps: 30 });
    await nextTick();
    const first = document.getElementById('kf-a')!;
    keydown(first, 'ArrowLeft');
    await nextTick();
    expect(Number(first.getAttribute('aria-valuenow'))).toBeCloseTo(1 / 30, 6);
    keydown(first, 'ArrowLeft');
    keydown(first, 'ArrowLeft');
    await nextTick();
    expect(Number(first.getAttribute('aria-valuenow'))).toBe(0);
  });

  it('ArrowUp/ArrowDown change the value in valueAxis mode', async () => {
    const { model } = mountTrack({ defaultValue: TWO(), valueAxis: true, valueRange: [0, 1] });
    await nextTick();
    const first = document.getElementById('kf-a')!;
    keydown(first, 'ArrowUp');
    await nextTick();
    expect(model.value!.find(k => k.id === 'a')!.value).toBeCloseTo(0.01, 6);
    keydown(first, 'ArrowDown');
    keydown(first, 'ArrowDown');
    await nextTick();
    expect(model.value!.find(k => k.id === 'a')!.value).toBeCloseTo(0, 6);
  });

  it('Home/End jump to min / max time (neighbour-clamped)', async () => {
    const { model } = mountTrack({ defaultValue: TWO(), duration: 1, fps: 30 });
    await nextTick();
    const second = document.getElementById('kf-b')!;
    keydown(second, 'Home');
    await nextTick();
    // b is neighbour-clamped one frame after a (time 0).
    expect(model.value!.find(k => k.id === 'b')!.time).toBeCloseTo(1 / 30, 6);
    keydown(second, 'End');
    await nextTick();
    expect(model.value!.find(k => k.id === 'b')!.time).toBeCloseTo(1, 6);
  });

  it('Delete removes the keyframe', async () => {
    const { model } = mountTrack({ defaultValue: TWO() });
    await nextTick();
    const first = document.getElementById('kf-a')!;
    keydown(first, 'Delete');
    await nextTick();
    expect(model.value!.map(k => k.id)).toEqual(['b']);
  });

  it('disabled: keys do nothing and tabindex is -1', async () => {
    const { model } = mountTrack({ defaultValue: TWO(), disabled: true });
    await nextTick();
    const first = document.getElementById('kf-a')!;
    expect(first.tabIndex).toBe(-1);
    expect(first.getAttribute('aria-disabled')).toBe('true');
    keydown(first, 'ArrowRight');
    keydown(first, 'Delete');
    await nextTick();
    // unchanged (model never written, stays the seeded uncontrolled value).
    expect(model.value).toBeUndefined();
  });
});

describe('KeyframeTrack — selection', () => {
  it('focus selects the keyframe and marks it selected', async () => {
    const { selected } = mountTrack({ defaultValue: TWO() });
    await nextTick();
    const second = document.getElementById('kf-b')!;
    second.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    await nextTick();
    expect(selected.value).toBe('b');
    expect(second.getAttribute('aria-selected')).toBe('true');
  });
});

describe('KeyframeTrack — sampling expose', () => {
  it('sampleAt returns the eased value between two keyframes (linear midpoint ≈ average)', async () => {
    const { wrapper } = mountTrack({ defaultValue: TWO() });
    await nextTick();
    const root = wrapper.findComponent(KeyframeTrackRoot);
    const sampleAt = (root.vm as any).sampleAt as (t: number) => number;
    expect(sampleAt(0.5)).toBeCloseTo(0.5, 6);
    expect(sampleAt(-1)).toBe(0);
    expect(sampleAt(5)).toBe(1);
  });

  it('addKeyframe / removeKeyframe via the exposed API mutate the model', async () => {
    const { wrapper, model } = mountTrack({ defaultValue: TWO() });
    await nextTick();
    const root = wrapper.findComponent(KeyframeTrackRoot);
    const id = (root.vm as any).addKeyframe(0.5) as string;
    await nextTick();
    expect(model.value!.some(k => k.id === id)).toBe(true);
    expect(model.value!.find(k => k.id === id)!.value).toBeCloseTo(0.5, 6);
    (root.vm as any).removeKeyframe(id);
    await nextTick();
    expect(model.value!.some(k => k.id === id)).toBe(false);
  });
});

describe('KeyframeTrack — easing editor', () => {
  it('embeds a CurveEditor for the selected keyframe and setEasing updates it', async () => {
    const { wrapper, model, selected } = mountTrack({ defaultValue: TWO(), selectedId: 'a' }, true);
    await nextTick();
    // The selected keyframe (a) has a following segment → the editor renders a CurveEditor.
    expect(selected.value).toBe('a');
    expect(document.querySelector('[data-easing-editor]')).toBeTruthy();
    expect(document.querySelector('[data-interpolation="bezier"]')).toBeTruthy();

    // Drive setEasing directly through the context-backed API.
    const root = wrapper.findComponent(KeyframeTrackRoot);
    (root.vm as any).setEasing('a', [0.42, 0, 0.58, 1]);
    await nextTick();
    expect(model.value!.find(k => k.id === 'a')!.easing).toEqual([0.42, 0, 0.58, 1]);
  });

  it('renders no editor when the selected keyframe is the last (no following segment)', async () => {
    mountTrack({ defaultValue: TWO(), selectedId: 'b' }, true);
    await nextTick();
    expect(document.querySelector('[data-interpolation="bezier"]')).toBeNull();
  });
});
