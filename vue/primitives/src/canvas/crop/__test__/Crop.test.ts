import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import type { CropRect } from '../utils';
import { CROP_HANDLE_POSITIONS } from '../utils';
import { CropArea, CropGrid, CropHandle, CropOverlay, CropRoot } from '../index';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

/** Mount a full crop with all parts. The Root is sized so its rect is well-defined. */
function mountCrop(opts: Record<string, unknown> = {}, initial: CropRect | null = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 }) {
  const model = ref<CropRect | null>(initial);
  const committed = ref<CropRect | null | undefined>(undefined);
  const Harness = defineComponent({
    setup() {
      const props: Record<string, unknown> = {
        modelValue: model.value,
        'onUpdate:modelValue': (v: CropRect | null) => { model.value = v; },
        onCropCommit: (v: CropRect | null) => { committed.value = v; },
        style: { position: 'relative', width: '400px', height: '300px' },
        ...opts,
      };
      return () => h(CropRoot, props, {
        default: () => [
          h(CropOverlay),
          h(CropArea, null, {
            default: () => [
              h(CropGrid),
              ...CROP_HANDLE_POSITIONS.map(position => h(CropHandle, { position, key: position })),
            ],
          }),
        ],
      });
    },
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, model, committed };
}

function keydown(el: Element, key: string, opts: { shiftKey?: boolean } = {}): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, shiftKey: opts.shiftKey ?? false }));
}

function pointer(type: string, el: Element, x: number, y: number, id = 1): void {
  el.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, button: 0, bubbles: true, cancelable: true }));
}

describe('CropArea', () => {
  it('has role="group", is focusable, and carries an aria-label', async () => {
    mountCrop();
    await nextTick();
    const area = document.querySelector<HTMLElement>('[role="group"]')!;
    expect(area).toBeTruthy();
    expect(area.tabIndex).toBe(0);
    expect(area.getAttribute('aria-label')).toBe('Crop region');
  });

  it('renders nothing while the selection is empty', async () => {
    mountCrop({}, null);
    await nextTick();
    expect(document.querySelector('[role="group"]')).toBeNull();
  });
});

describe('CropHandle', () => {
  it('renders 8 handle buttons each with an aria-label', async () => {
    mountCrop();
    await nextTick();
    const handles = Array.from(document.querySelectorAll<HTMLElement>('[data-position]'));
    expect(handles).toHaveLength(8);
    for (const h of handles) {
      expect(h.tagName.toLowerCase()).toBe('button');
      expect(h.getAttribute('type')).toBe('button');
      expect(h.getAttribute('aria-label')).toMatch(/^Resize /);
    }
  });
});

describe('keyboard — CropArea moves the rect', () => {
  it('ArrowRight/ArrowDown nudge the whole rect by keyboardStep', async () => {
    const { model } = mountCrop({ keyboardStep: 0.05 });
    await nextTick();
    const area = document.querySelector<HTMLElement>('[role="group"]')!;
    keydown(area, 'ArrowRight');
    await nextTick();
    expect(model.value!.x).toBeCloseTo(0.25, 6);
    keydown(area, 'ArrowDown');
    await nextTick();
    expect(model.value!.y).toBeCloseTo(0.25, 6);
    // Size is unchanged by a move.
    expect(model.value!.width).toBeCloseTo(0.4, 6);
  });

  it('clamps to [0,1] at the media edge', async () => {
    const { model } = mountCrop({ keyboardStep: 0.5 });
    await nextTick();
    const area = document.querySelector<HTMLElement>('[role="group"]')!;
    keydown(area, 'ArrowRight');
    keydown(area, 'ArrowRight');
    keydown(area, 'ArrowRight');
    await nextTick();
    expect(model.value!.x + model.value!.width).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('Shift+Arrow uses the large step', async () => {
    const { model } = mountCrop({ keyboardStep: 0.01, keyboardLargeStep: 0.1 });
    await nextTick();
    const area = document.querySelector<HTMLElement>('[role="group"]')!;
    keydown(area, 'ArrowRight', { shiftKey: true });
    await nextTick();
    expect(model.value!.x).toBeCloseTo(0.3, 6);
  });
});

describe('keyboard — CropHandle resizes with the opposite edge fixed', () => {
  it('ArrowRight on the right handle widens, left edge stays put', async () => {
    const { model } = mountCrop({ keyboardStep: 0.05 });
    await nextTick();
    const right = document.querySelector<HTMLElement>('[data-position="right"]')!;
    const before = { ...model.value! };
    keydown(right, 'ArrowRight');
    await nextTick();
    expect(model.value!.x).toBeCloseTo(before.x, 6); // left fixed
    expect(model.value!.width).toBeCloseTo(before.width + 0.05, 6);
  });

  it('ArrowLeft on the left handle keeps the right edge fixed', async () => {
    const { model } = mountCrop({ keyboardStep: 0.05 });
    await nextTick();
    const left = document.querySelector<HTMLElement>('[data-position="left"]')!;
    const rightEdge = model.value!.x + model.value!.width;
    keydown(left, 'ArrowLeft');
    await nextTick();
    expect(model.value!.x + model.value!.width).toBeCloseTo(rightEdge, 6);
    expect(model.value!.x).toBeLessThan(0.2);
  });
});

describe('aspectRatio keeps the ratio on keyboard resize', () => {
  it('a corner nudge preserves width/height', async () => {
    const { model } = mountCrop({ keyboardStep: 0.05, aspectRatio: 1, units: 'pixels', mediaWidth: 400, mediaHeight: 400 }, { x: 100, y: 100, width: 100, height: 100 });
    await nextTick();
    const corner = document.querySelector<HTMLElement>('[data-position="bottom-right"]')!;
    keydown(corner, 'ArrowRight');
    await nextTick();
    expect(model.value!.width / model.value!.height).toBeCloseTo(1, 6);
  });
});

describe('constrain clamps the rect within bounds', () => {
  it('a handle drag past the edge keeps the rect inside the media', async () => {
    const { model } = mountCrop({ keyboardStep: 0.5 });
    await nextTick();
    const corner = document.querySelector<HTMLElement>('[data-position="bottom-right"]')!;
    keydown(corner, 'ArrowRight');
    keydown(corner, 'ArrowDown');
    keydown(corner, 'ArrowRight');
    keydown(corner, 'ArrowDown');
    await nextTick();
    expect(model.value!.x + model.value!.width).toBeLessThanOrEqual(1 + 1e-9);
    expect(model.value!.y + model.value!.height).toBeLessThanOrEqual(1 + 1e-9);
  });
});

describe('createOnEmpty draws from null', () => {
  it('a pointer drag on empty media creates a rect', async () => {
    const { model } = mountCrop({ keyboardStep: 0.05 }, null);
    await nextTick();
    const root = document.querySelector<HTMLElement>('[data-empty]')!;
    const rect = root.getBoundingClientRect();
    expect(model.value).toBeNull();
    // Press near the top-left quarter, drag toward the centre.
    pointer('pointerdown', root, rect.left + rect.width * 0.25, rect.top + rect.height * 0.25);
    pointer('pointermove', document.body, rect.left + rect.width * 0.75, rect.top + rect.height * 0.75);
    pointer('pointerup', document.body, rect.left + rect.width * 0.75, rect.top + rect.height * 0.75);
    await nextTick();
    expect(model.value).not.toBeNull();
    expect(model.value!.width).toBeGreaterThan(0.3);
    expect(model.value!.height).toBeGreaterThan(0.3);
  });

  it('does not create when createOnEmpty is false', async () => {
    const { model } = mountCrop({ createOnEmpty: false }, null);
    await nextTick();
    const root = document.querySelector<HTMLElement>('[data-empty]')!;
    const rect = root.getBoundingClientRect();
    pointer('pointerdown', root, rect.left + 10, rect.top + 10);
    pointer('pointermove', document.body, rect.left + 100, rect.top + 100);
    pointer('pointerup', document.body, rect.left + 100, rect.top + 100);
    await nextTick();
    expect(model.value).toBeNull();
  });
});

describe('disabled blocks interaction', () => {
  it('arrow keys do nothing when disabled', async () => {
    const { model } = mountCrop({ disabled: true, keyboardStep: 0.05 });
    await nextTick();
    const area = document.querySelector<HTMLElement>('[role="group"]')!;
    expect(area.getAttribute('aria-disabled')).toBe('true');
    const before = { ...model.value! };
    keydown(area, 'ArrowRight');
    await nextTick();
    expect(model.value).toEqual(before);
  });

  it('handle buttons are disabled', async () => {
    mountCrop({ disabled: true });
    await nextTick();
    const handle = document.querySelector<HTMLButtonElement>('[data-position="right"]')!;
    expect(handle.disabled).toBe(true);
  });
});

describe('CropGrid', () => {
  it('renders the rule-of-thirds lines (2 vertical + 2 horizontal) when grid is on', async () => {
    mountCrop();
    await nextTick();
    const grid = document.querySelector<HTMLElement>('[data-crop-grid]')!;
    expect(grid).toBeTruthy();
    expect(grid.getAttribute('aria-hidden')).toBe('true');
    expect(grid.querySelectorAll('[data-orientation="vertical"]')).toHaveLength(2);
    expect(grid.querySelectorAll('[data-orientation="horizontal"]')).toHaveLength(2);
  });

  it('is absent when grid is disabled', async () => {
    mountCrop({ grid: false });
    await nextTick();
    expect(document.querySelector('[data-crop-grid]')).toBeNull();
  });
});

describe('CropOverlay', () => {
  it('renders 4 scrim rects (aria-hidden) when a selection exists', async () => {
    mountCrop();
    await nextTick();
    const overlay = document.querySelector<HTMLElement>('[data-crop-overlay]')!;
    expect(overlay).toBeTruthy();
    expect(overlay.getAttribute('aria-hidden')).toBe('true');
    expect(overlay.querySelectorAll('[data-side]')).toHaveLength(4);
  });
});
