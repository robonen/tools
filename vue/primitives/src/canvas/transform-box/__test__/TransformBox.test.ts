import { mount } from '@vue/test-utils';
import type { VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import {
  TransformBoxHandle,
  TransformBoxRoot,
  TransformBoxRotateHandle,
  TransformBoxStatus,
} from '../index';
import type { TransformBoxHandlePosition, TransformBoxValue } from '../utils';
import {
  applyAspectRatio,
  constrainRect,
  decomposeTransform,
  handleAxes,
  pointerAngle,
  resizeEdge,
  rotatePoint,
  shortestAngleDelta,
  snapRotation,
} from '../utils';

const wrappers: Array<VueWrapper<any>> = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount();
  document.body.innerHTML = '';
});

function track<T extends VueWrapper<any>>(w: T): T {
  wrappers.push(w);
  return w;
}

/** One animation-frame tick so the rAF-batched drag flush has run. */
function raf(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

function down(el: Element, clientX: number, clientY: number, opts: { shiftKey?: boolean; altKey?: boolean } = {}): void {
  el.dispatchEvent(new PointerEvent('pointerdown', {
    pointerId: 1, button: 0, clientX, clientY, bubbles: true, cancelable: true,
    shiftKey: opts.shiftKey ?? false, altKey: opts.altKey ?? false,
  }));
}
function move(el: Element, clientX: number, clientY: number, opts: { shiftKey?: boolean; altKey?: boolean } = {}): void {
  el.dispatchEvent(new PointerEvent('pointermove', {
    pointerId: 1, clientX, clientY, bubbles: true,
    shiftKey: opts.shiftKey ?? false, altKey: opts.altKey ?? false,
  }));
}
function up(el: Element, clientX: number, clientY: number): void {
  el.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX, clientY, bubbles: true }));
}

function keydown(el: Element, key: string, opts: { shiftKey?: boolean; altKey?: boolean } = {}): void {
  el.dispatchEvent(new KeyboardEvent('keydown', {
    key, bubbles: true, cancelable: true,
    shiftKey: opts.shiftKey ?? false, altKey: opts.altKey ?? false,
  }));
}

interface MountOpts {
  defaultValue?: TransformBoxValue;
  aspectRatio?: number | null;
  allowFlip?: boolean;
  rotationSnap?: number;
  rotationStep?: number;
  keyboardStep?: number;
  minWidth?: number;
  minHeight?: number;
  disabled?: boolean;
  withRotate?: boolean;
  withStatus?: boolean;
}

const POSITIONS: TransformBoxHandlePosition[] = [
  'top', 'right', 'bottom', 'left', 'top-left', 'top-right', 'bottom-right', 'bottom-left',
];

function mountBox(opts: MountOpts = {}) {
  const model = ref<TransformBoxValue | undefined>(undefined);
  const commits: TransformBoxValue[] = [];
  const Harness = defineComponent({
    setup() {
      return () => h(TransformBoxRoot, {
        modelValue: model.value,
        'onUpdate:modelValue': (v: TransformBoxValue | null | undefined) => { model.value = v ?? undefined; },
        onTransformCommit: (v: TransformBoxValue) => { commits.push(v); },
        defaultValue: opts.defaultValue ?? { x: 0, y: 0, width: 100, height: 100, rotation: 0 },
        aspectRatio: opts.aspectRatio ?? null,
        allowFlip: opts.allowFlip ?? true,
        rotationSnap: opts.rotationSnap ?? 0,
        rotationStep: opts.rotationStep ?? 1,
        keyboardStep: opts.keyboardStep ?? 1,
        minWidth: opts.minWidth ?? 1,
        minHeight: opts.minHeight ?? 1,
        disabled: opts.disabled ?? false,
      }, {
        default: () => [
          ...POSITIONS.map(p => h(TransformBoxHandle, { key: p, position: p })),
          opts.withRotate ? h(TransformBoxRotateHandle) : null,
          opts.withStatus ? h(TransformBoxStatus) : null,
        ],
      });
    },
  });
  const w = track(mount(Harness, { attachTo: document.body }));
  return { wrapper: w, model, commits };
}

function rootEl(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-selected], [data-disabled], [tabindex="0"]')!;
}
function handleEl(position: TransformBoxHandlePosition): HTMLElement {
  return document.querySelector<HTMLElement>(`[data-position="${position}"]`)!;
}
function rotateEl(): HTMLElement {
  return document.querySelector<HTMLElement>('[data-transform-box-rotate]')!;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure math (utils.ts) — Crop shares these.
// ─────────────────────────────────────────────────────────────────────────────
describe('utils — handleAxes', () => {
  it('decodes edges and corners with outward signs', () => {
    expect(handleAxes('left')).toEqual({ x: -1, y: 0 });
    expect(handleAxes('right')).toEqual({ x: 1, y: 0 });
    expect(handleAxes('top')).toEqual({ x: 0, y: -1 });
    expect(handleAxes('bottom')).toEqual({ x: 0, y: 1 });
    expect(handleAxes('top-left')).toEqual({ x: -1, y: -1 });
    expect(handleAxes('bottom-right')).toEqual({ x: 1, y: 1 });
  });
});

describe('utils — constrainRect', () => {
  it('folds a negative width/height into the origin (positive size)', () => {
    const r = constrainRect({ x: 0, y: 0, width: -40, height: -20, rotation: 0 }, 1, 1);
    expect(r).toEqual({ x: -40, y: -20, width: 40, height: 20, rotation: 0 });
  });
  it('clamps below the minimum size', () => {
    const r = constrainRect({ x: 5, y: 5, width: 0.5, height: 0.2, rotation: 0 }, 1, 1);
    expect(r.width).toBe(1);
    expect(r.height).toBe(1);
  });
});

describe('utils — applyAspectRatio', () => {
  it('derives height from width on a horizontal edge', () => {
    const { width, height } = applyAspectRatio(200, 50, 2, { x: 1, y: 0 });
    expect(width).toBe(200);
    expect(height).toBe(100); // 200 / 2
  });
  it('keeps the dominant axis on a corner', () => {
    // width (300) implies a bigger box than height (10) at ratio 2 → keep width.
    const { width, height } = applyAspectRatio(300, 10, 2, { x: 1, y: 1 });
    expect(width).toBe(300);
    expect(height).toBeCloseTo(150);
  });
});

describe('utils — resizeEdge (unrotated)', () => {
  it('right handle grows width with the LEFT edge fixed', () => {
    const start: TransformBoxValue = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
    const { box } = resizeEdge(start, 'right', { x: 20, y: 0 });
    expect(box.x).toBe(0); // left edge fixed
    expect(box.width).toBe(120);
    expect(box.height).toBe(100);
  });
  it('left handle grows width with the RIGHT edge fixed', () => {
    const start: TransformBoxValue = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
    const { box } = resizeEdge(start, 'left', { x: -20, y: 0 });
    expect(box.x).toBe(-20); // grew left
    expect(box.width).toBe(120);
    // right edge stayed at 100.
    expect(box.x + box.width).toBe(100);
  });
  it('symmetric (Alt) resize grows both sides about the center', () => {
    const start: TransformBoxValue = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
    const { box } = resizeEdge(start, 'right', { x: 10, y: 0 }, { symmetric: true });
    // both sides move by 10 → width +20, x shifts -10 to keep center fixed.
    expect(box.width).toBe(120);
    expect(box.x).toBe(-10);
    expect(box.x + box.width / 2).toBe(50); // center unchanged
  });
  it('aspect lock keeps the ratio on a corner', () => {
    const start: TransformBoxValue = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
    const { box } = resizeEdge(start, 'bottom-right', { x: 40, y: 0 }, { aspectRatio: 1 });
    expect(box.width).toBeCloseTo(box.height);
  });
});

describe('utils — resizeEdge (rotated, local-axis delta)', () => {
  it('a 90° box: a screen-x drag rotated into local axes resizes the right edge', () => {
    // Box rotated 90°. A pure local-x delta resizes width regardless of rotation,
    // because resizeEdge receives the delta ALREADY in local axes.
    const start: TransformBoxValue = { x: 0, y: 0, width: 100, height: 100, rotation: 90 };
    const { box } = resizeEdge(start, 'right', { x: 30, y: 0 });
    expect(box.width).toBeCloseTo(130);
    expect(box.height).toBeCloseTo(100);
    expect(box.rotation).toBe(90);
  });
  it('preserves the world anchor of the opposite edge under rotation', () => {
    const start: TransformBoxValue = { x: 0, y: 0, width: 100, height: 100, rotation: 45 };
    // World position of the anchored LEFT-edge midpoint before resize.
    const center0 = { x: start.x + start.width / 2, y: start.y + start.height / 2 };
    const anchorBefore = rotatePoint({ x: start.x, y: start.y + start.height / 2 }, 45, center0);

    const { box } = resizeEdge(start, 'right', { x: 40, y: 0 });
    const center1 = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const anchorAfter = rotatePoint({ x: box.x, y: box.y + box.height / 2 }, 45, center1);

    expect(anchorAfter.x).toBeCloseTo(anchorBefore.x, 4);
    expect(anchorAfter.y).toBeCloseTo(anchorBefore.y, 4);
    expect(box.width).toBeCloseTo(140);
  });
});

describe('utils — flip policy', () => {
  it('allowFlip=false clamps the dragged edge at the minimum size', () => {
    const start: TransformBoxValue = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
    // Drag the right edge far past the left edge (would flip).
    const { box, flippedX } = resizeEdge(start, 'right', { x: -200, y: 0 }, {
      allowFlip: false, minWidth: 5,
    });
    expect(box.width).toBe(5);
    expect(flippedX).toBe(false);
    expect(box.x).toBe(0); // left edge still anchored
  });
  it('allowFlip=true reports a flip and normalizes to a positive box', () => {
    const start: TransformBoxValue = { x: 0, y: 0, width: 100, height: 100, rotation: 0 };
    const { box, flippedX } = resizeEdge(start, 'right', { x: -150, y: 0 }, {
      allowFlip: true, minWidth: 5,
    });
    expect(flippedX).toBe(true);
    expect(box.width).toBeGreaterThan(0); // normalized
  });
});

describe('utils — rotation helpers', () => {
  it('pointerAngle: up=0, right=90, down=180, left=270', () => {
    const c = { x: 0, y: 0 };
    expect(pointerAngle({ x: 0, y: -10 }, c)).toBeCloseTo(0);
    expect(pointerAngle({ x: 10, y: 0 }, c)).toBeCloseTo(90);
    expect(pointerAngle({ x: 0, y: 10 }, c)).toBeCloseTo(180);
    expect(pointerAngle({ x: -10, y: 0 }, c)).toBeCloseTo(270);
  });
  it('shortestAngleDelta crosses the seam smoothly', () => {
    expect(shortestAngleDelta(350, 10)).toBeCloseTo(20);
    expect(shortestAngleDelta(10, 350)).toBeCloseTo(-20);
  });
  it('snapRotation snaps to increments', () => {
    expect(snapRotation(43, 15)).toBe(45);
    expect(snapRotation(43, 0)).toBe(43); // disabled
  });
});

describe('utils — decomposeTransform', () => {
  it('returns the normalized rect, center, and unrotated corners at rotation 0', () => {
    const d = decomposeTransform({ x: 10, y: 20, width: 40, height: 60, rotation: 0 });
    expect(d.rect).toEqual({ x: 10, y: 20, width: 40, height: 60 });
    expect(d.center).toEqual({ x: 30, y: 50 });
    expect(d.rotation).toBe(0);
    expect(d.corners[0]).toEqual({ x: 10, y: 20 }); // top-left
    expect(d.corners[2]).toEqual({ x: 50, y: 80 }); // bottom-right
  });
  it('rotates the corners about the center under rotation', () => {
    const d = decomposeTransform({ x: 0, y: 0, width: 100, height: 100, rotation: 90 });
    // 90° about center (50,50): top-left (0,0) → (100,0).
    expect(d.corners[0].x).toBeCloseTo(100, 4);
    expect(d.corners[0].y).toBeCloseTo(0, 4);
    expect(d.rotation).toBe(90);
  });
  it('normalizes a negative-size box', () => {
    const d = decomposeTransform({ x: 50, y: 50, width: -30, height: -20, rotation: 0 });
    expect(d.rect).toEqual({ x: 20, y: 30, width: 30, height: 20 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────
describe('TransformBoxHandle — rendering & ARIA', () => {
  it('renders 8 handles as buttons with derived aria-labels', async () => {
    mountBox();
    await nextTick();
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-position]'));
    expect(buttons).toHaveLength(8);
    for (const btn of buttons) {
      expect(btn.tagName).toBe('BUTTON');
      expect(btn.getAttribute('type')).toBe('button');
      const pos = btn.getAttribute('data-position');
      expect(btn.getAttribute('aria-label')).toBe(`Resize ${pos}`);
      expect(btn.tabIndex).toBe(0);
    }
  });

  it('renders the rotate handle as a button labelled "Rotate"', async () => {
    mountBox({ withRotate: true });
    await nextTick();
    const rot = rotateEl();
    expect(rot.tagName).toBe('BUTTON');
    expect(rot.getAttribute('aria-label')).toBe('Rotate');
  });
});

describe('TransformBoxRoot — keyboard move', () => {
  it('ArrowRight on the body moves x by keyboardStep', async () => {
    const { commits } = mountBox({ keyboardStep: 5 });
    await nextTick();
    const root = rootEl();
    root.focus();
    keydown(root, 'ArrowRight');
    await nextTick();
    expect(commits.at(-1)!.x).toBe(5);
  });

  it('Shift+ArrowRight uses the large step', async () => {
    const { commits } = mountBox({ keyboardStep: 1 });
    await nextTick();
    const root = rootEl();
    keydown(root, 'ArrowRight', { shiftKey: true });
    await nextTick();
    expect(commits.at(-1)!.x).toBe(10); // default keyboardLargeStep
  });
});

describe('TransformBoxHandle — keyboard resize', () => {
  it('ArrowRight on the RIGHT handle increases width with the left edge fixed', async () => {
    const { commits } = mountBox({ keyboardStep: 4 });
    await nextTick();
    const handle = handleEl('right');
    handle.focus();
    keydown(handle, 'ArrowRight');
    await nextTick();
    const v = commits.at(-1)!;
    expect(v.width).toBe(104);
    expect(v.x).toBe(0); // left edge fixed
  });

  it('Shift+Arrow aspect-locks the resize ratio', async () => {
    const { commits } = mountBox({ keyboardStep: 10, defaultValue: { x: 0, y: 0, width: 100, height: 100, rotation: 0 } });
    await nextTick();
    const handle = handleEl('bottom-right');
    handle.focus();
    keydown(handle, 'ArrowRight', { shiftKey: true });
    await nextTick();
    const v = commits.at(-1)!;
    // ratio 1 preserved.
    expect(v.width).toBeCloseTo(v.height);
  });
});

describe('TransformBoxHandle — pointer resize', () => {
  it('dragging the right handle increases width', async () => {
    const { commits } = mountBox();
    await nextTick();
    const handle = handleEl('right');
    down(handle, 100, 50);
    await raf();
    move(handle, 130, 50);
    await raf();
    up(handle, 130, 50);
    await raf();
    const v = commits.at(-1)!;
    expect(v.width).toBeGreaterThan(100);
    expect(v.x).toBe(0); // left edge fixed
  });
});

describe('TransformBoxRotateHandle — rotation', () => {
  it('ArrowRight on the rotate handle changes rotation by rotationStep', async () => {
    const { commits } = mountBox({ withRotate: true, rotationStep: 3 });
    await nextTick();
    const rot = rotateEl();
    rot.focus();
    keydown(rot, 'ArrowRight');
    await nextTick();
    expect(commits.at(-1)!.rotation).toBe(3);
    keydown(rot, 'ArrowLeft');
    await nextTick();
    expect(commits.at(-1)!.rotation).toBe(0);
  });

  it('Shift+Arrow on the rotate handle rotates by rotationSnap', async () => {
    const { commits } = mountBox({ withRotate: true, rotationSnap: 15, rotationStep: 1 });
    await nextTick();
    const rot = rotateEl();
    keydown(rot, 'ArrowRight', { shiftKey: true });
    await nextTick();
    expect(commits.at(-1)!.rotation).toBe(15);
  });
});

describe('TransformBoxRoot — allowFlip clamping (pointer)', () => {
  it('allowFlip=false clamps at min on a keyboard over-drag', async () => {
    const { commits } = mountBox({
      allowFlip: false,
      minWidth: 5,
      keyboardStep: 200,
      defaultValue: { x: 0, y: 0, width: 100, height: 100, rotation: 0 },
    });
    await nextTick();
    const handle = handleEl('right');
    // Shrink the right edge past the left edge → would flip; clamps to min.
    keydown(handle, 'ArrowLeft');
    await nextTick();
    const v = commits.at(-1)!;
    expect(v.width).toBe(5);
    expect(v.x).toBe(0);
  });
});

describe('TransformBoxStatus', () => {
  it('renders an aria-live region announcing the settled transform', async () => {
    mountBox({ withStatus: true, defaultValue: { x: 12, y: 0, width: 40, height: 20, rotation: 0 } });
    await nextTick();
    const status = document.querySelector<HTMLElement>('[aria-live="polite"]')!;
    expect(status).toBeTruthy();
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toContain('width 40');
    expect(status.textContent).toContain('height 20');
  });
});

describe('TransformBoxRoot — disabled', () => {
  it('blocks keyboard move when disabled', async () => {
    const { commits } = mountBox({ disabled: true, keyboardStep: 5 });
    await nextTick();
    const root = rootEl();
    keydown(root, 'ArrowRight');
    await nextTick();
    expect(commits).toHaveLength(0);
  });

  it('blocks handle resize when disabled', async () => {
    const { commits } = mountBox({ disabled: true });
    await nextTick();
    const handle = handleEl('right');
    keydown(handle, 'ArrowRight');
    down(handle, 100, 50);
    await raf();
    move(handle, 130, 50);
    await raf();
    up(handle, 130, 50);
    await raf();
    expect(commits).toHaveLength(0);
  });

  it('sets tabindex -1 on handles when disabled', async () => {
    mountBox({ disabled: true });
    await nextTick();
    const handle = handleEl('right');
    expect(handle.tabIndex).toBe(-1);
    expect(handle.getAttribute('data-disabled')).toBe('');
  });
});

describe('TransformBoxRoot — selection state', () => {
  it('exposes data-selected by default and toggles via the model', async () => {
    const selected = ref(true);
    const Harness = defineComponent({
      setup() {
        return () => h(TransformBoxRoot, {
          selected: selected.value,
          'onUpdate:selected': (v: boolean) => { selected.value = v; },
        });
      },
    });
    track(mount(Harness, { attachTo: document.body }));
    await nextTick();
    const root = document.querySelector<HTMLElement>('[data-selected]');
    expect(root).toBeTruthy();
    selected.value = false;
    await nextTick();
    expect(document.querySelector('[data-selected]')).toBeNull();
  });
});
