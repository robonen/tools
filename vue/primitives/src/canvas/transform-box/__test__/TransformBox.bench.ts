import { mount } from '@vue/test-utils';
import { bench, describe } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import {
  TransformBoxHandle,
  TransformBoxRoot,
  TransformBoxRotateHandle,
  TransformBoxStatus,
} from '../index';
import type { Point, TransformBoxHandlePosition, TransformBoxValue } from '../utils';
import {
  applyAspectRatio,
  boxCenter,
  constrainRect,
  decomposeTransform,
  handleAxes,
  localToWorld,
  moveBox,
  normalizeRotation,
  pointerAngle,
  resizeEdge,
  resolvePivot,
  rotatePoint,
  rotateVector,
  rotationFromPointer,
  shortestAngleDelta,
  snapRotation,
  worldToLocal,
} from '../utils';

// ──────────────────────────────────────────────────────────────────────────────
// Deterministic fixtures (NO Math.random — every value is seeded by its index so
// runs are reproducible). Built once at module scope with simple loops.
// ──────────────────────────────────────────────────────────────────────────────

/** The 8 handle positions in the package's stable order. */
const POSITIONS: TransformBoxHandlePosition[] = [
  'top-left',
  'top',
  'top-right',
  'right',
  'bottom-right',
  'bottom',
  'bottom-left',
  'left',
];

/** A representative rotated box; the math hot path mostly trades on `rotation`. */
const BOX: TransformBoxValue = { x: 96, y: 64, width: 200, height: 130, rotation: -8 };

/** Build N deterministic boxes spread across position / size / rotation space. */
function makeBoxes(n: number): TransformBoxValue[] {
  const out: TransformBoxValue[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = {
      x: (i % 400) - 200,
      y: ((i * 3) % 400) - 200,
      width: 20 + (i % 380),
      height: 20 + ((i * 7) % 380),
      // Sweep rotation across the full circle and across the ±180 seam.
      rotation: ((i * 13) % 720) - 360,
    };
  }
  return out;
}

/** Build N deterministic 2D points (used as pointer samples / deltas). */
function makePoints(n: number): Point[] {
  const out: Point[] = new Array(n);
  for (let i = 0; i < n; i++) {
    // Lissajous-ish spread so x/y are decorrelated but fully deterministic.
    out[i] = {
      x: ((i * 31) % 800) - 400,
      y: ((i * 17) % 600) - 300,
    };
  }
  return out;
}

/** Pre-resolve handle axes for every position once. */
const AXES = POSITIONS.map(handleAxes);

const BOXES_100 = makeBoxes(100);
const BOXES_1000 = makeBoxes(1000);
const POINTS_100 = makePoints(100);
const POINTS_1000 = makePoints(1000);

/** A simulated pointer-move drag track about a pivot (rotation gesture frames). */
const PIVOT: Point = boxCenter(BOX);
const DRAG_100 = makePoints(100);
const DRAG_1000 = makePoints(1000);
const START_POINTER_ANGLE = pointerAngle(DRAG_100[0]!, PIVOT);

// ──────────────────────────────────────────────────────────────────────────────
// Pure rotation primitives — the innermost kernel every gesture frame calls.
// ──────────────────────────────────────────────────────────────────────────────

describe('rotatePoint — kernel', () => {
  bench('rotatePoint × 100', () => {
    for (let i = 0; i < POINTS_100.length; i++) {
      rotatePoint(POINTS_100[i]!, 37, PIVOT);
    }
  });

  bench('rotatePoint × 1000', () => {
    for (let i = 0; i < POINTS_1000.length; i++) {
      rotatePoint(POINTS_1000[i]!, 37, PIVOT);
    }
  });

  bench('rotateVector (origin-free) × 1000', () => {
    for (let i = 0; i < POINTS_1000.length; i++) {
      rotateVector(POINTS_1000[i]!, -BOX.rotation);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Pointer→angle math — the rotate-handle hot path (atan2 + seam-safe delta).
// ──────────────────────────────────────────────────────────────────────────────

describe('pointer angle math', () => {
  bench('pointerAngle × 100', () => {
    for (let i = 0; i < POINTS_100.length; i++) {
      pointerAngle(POINTS_100[i]!, PIVOT);
    }
  });

  bench('pointerAngle × 1000', () => {
    for (let i = 0; i < POINTS_1000.length; i++) {
      pointerAngle(POINTS_1000[i]!, PIVOT);
    }
  });

  bench('shortestAngleDelta × 1000', () => {
    for (let i = 0; i < BOXES_1000.length; i++) {
      shortestAngleDelta(BOXES_1000[i]!.rotation, BOX.rotation);
    }
  });

  bench('normalizeRotation × 1000', () => {
    for (let i = 0; i < BOXES_1000.length; i++) {
      normalizeRotation(BOXES_1000[i]!.rotation);
    }
  });

  bench('snapRotation (15°) × 1000', () => {
    for (let i = 0; i < BOXES_1000.length; i++) {
      snapRotation(BOXES_1000[i]!.rotation, 15);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Simulated rotate drag — one rotationFromPointer per pointer-move frame, the
// full per-frame computation the rotate handle does (angle + accumulate delta).
// ──────────────────────────────────────────────────────────────────────────────

describe('rotate drag — per-frame', () => {
  bench('rotationFromPointer × 100 frames', () => {
    for (let i = 0; i < DRAG_100.length; i++) {
      rotationFromPointer(DRAG_100[i]!, PIVOT, START_POINTER_ANGLE, BOX.rotation);
    }
  });

  bench('rotationFromPointer × 1000 frames', () => {
    for (let i = 0; i < DRAG_1000.length; i++) {
      rotationFromPointer(DRAG_1000[i]!, PIVOT, START_POINTER_ANGLE, BOX.rotation);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// resizeEdge — the heaviest pure helper (anchor capture, aspect lock, flip,
// re-place, normalize). Driven every scale-handle pointer-move frame.
// ──────────────────────────────────────────────────────────────────────────────

describe('resizeEdge — per-frame', () => {
  bench('resizeEdge corner (no options) × 100', () => {
    for (let i = 0; i < POINTS_100.length; i++) {
      resizeEdge(BOX, 'bottom-right', POINTS_100[i]!);
    }
  });

  bench('resizeEdge corner (no options) × 1000', () => {
    for (let i = 0; i < POINTS_1000.length; i++) {
      resizeEdge(BOX, 'bottom-right', POINTS_1000[i]!);
    }
  });

  bench('resizeEdge aspect-locked corner × 1000', () => {
    for (let i = 0; i < POINTS_1000.length; i++) {
      resizeEdge(BOX, 'bottom-right', POINTS_1000[i]!, { aspectRatio: 1.5 });
    }
  });

  bench('resizeEdge symmetric (Alt) corner × 1000', () => {
    for (let i = 0; i < POINTS_1000.length; i++) {
      resizeEdge(BOX, 'bottom-right', POINTS_1000[i]!, { symmetric: true, pivot: 'center' });
    }
  });

  bench('resizeEdge edge handle × 1000', () => {
    for (let i = 0; i < POINTS_1000.length; i++) {
      resizeEdge(BOX, 'right', POINTS_1000[i]!);
    }
  });

  // Full scale-frame as the root runs it: rotate the screen delta into local
  // axes first, then resize (the load-bearing step for rotated boxes).
  bench('rotated scale frame (rotateVector → resizeEdge) × 1000', () => {
    for (let i = 0; i < POINTS_1000.length; i++) {
      const local = rotateVector(POINTS_1000[i]!, -BOX.rotation);
      resizeEdge(BOX, 'bottom-right', local, { minWidth: 40, minHeight: 40, allowFlip: true });
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// applyAspectRatio / handleAxes — small per-frame helpers.
// ──────────────────────────────────────────────────────────────────────────────

describe('aspect + axes helpers', () => {
  const cornerAxes = handleAxes('bottom-right');

  bench('applyAspectRatio × 1000', () => {
    for (let i = 0; i < BOXES_1000.length; i++) {
      const b = BOXES_1000[i]!;
      applyAspectRatio(b.width, b.height, 1.5, cornerAxes);
    }
  });

  bench('handleAxes × 8 positions × 125 (=1000)', () => {
    for (let i = 0; i < 125; i++) {
      for (let j = 0; j < POSITIONS.length; j++) {
        handleAxes(POSITIONS[j]!);
      }
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// constrainRect / moveBox — commit-path normalization + whole-box drag.
// ──────────────────────────────────────────────────────────────────────────────

describe('constrain + move', () => {
  bench('constrainRect × 1000', () => {
    for (let i = 0; i < BOXES_1000.length; i++) {
      constrainRect(BOXES_1000[i]!, 40, 40);
    }
  });

  bench('moveBox × 1000', () => {
    for (let i = 0; i < POINTS_1000.length; i++) {
      moveBox(BOX, POINTS_1000[i]!);
    }
  });

  bench('resolvePivot (center) × 1000', () => {
    for (let i = 0; i < BOXES_1000.length; i++) {
      resolvePivot(BOXES_1000[i]!, 'center');
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// local⇄world round-trip — used to capture/re-place anchors against rotation.
// ──────────────────────────────────────────────────────────────────────────────

describe('local ⇄ world', () => {
  bench('localToWorld → worldToLocal round-trip × 1000', () => {
    for (let i = 0; i < POINTS_1000.length; i++) {
      const w = localToWorld(BOX, POINTS_1000[i]!);
      worldToLocal(BOX, w);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// decomposeTransform — Crop/overlay hot path: normalize + 4 rotated corners.
// ──────────────────────────────────────────────────────────────────────────────

describe('decomposeTransform — corners', () => {
  bench('decomposeTransform × 100', () => {
    for (let i = 0; i < BOXES_100.length; i++) {
      decomposeTransform(BOXES_100[i]!);
    }
  });

  bench('decomposeTransform × 1000', () => {
    for (let i = 0; i < BOXES_1000.length; i++) {
      decomposeTransform(BOXES_1000[i]!);
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Component mount + update — realistic (1 root, 8 handles) and stress scale.
// Mirrors the existing Primitive.bench convention: mount() then unmount().
// ──────────────────────────────────────────────────────────────────────────────

/** A harness with `count` independent transform boxes, each with 8 handles. */
function makeStage(count: number, value: TransformBoxValue) {
  return defineComponent({
    setup() {
      return () => h(
        'div',
        null,
        Array.from({ length: count }, (_, i) =>
          h(
            TransformBoxRoot,
            {
              key: i,
              modelValue: value,
              minWidth: 40,
              minHeight: 40,
              rotationSnap: 15,
            },
            {
              default: () => [
                ...POSITIONS.map(p => h(TransformBoxHandle, { key: p, position: p })),
                h(TransformBoxRotateHandle),
                h(TransformBoxStatus),
              ],
            },
          )),
      );
    },
  });
}

describe('TransformBoxRoot — mount full part set', () => {
  bench('mount + unmount — 1 box (root + 8 handles + rotate + status)', () => {
    const w = mount(makeStage(1, BOX), { attachTo: document.body });
    w.unmount();
  });

  bench('mount + unmount — 50 boxes', () => {
    const w = mount(makeStage(50, BOX), { attachTo: document.body });
    w.unmount();
  });

  bench('mount + unmount — 500 boxes (stress)', () => {
    const w = mount(makeStage(500, BOX), { attachTo: document.body });
    w.unmount();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Re-render after a prop (transform v-model) change — restyle + reflow path for
// every part. Mirrors the "mount + update" bench in Primitive.bench.
// ──────────────────────────────────────────────────────────────────────────────

const BOX_B: TransformBoxValue = { x: 140, y: 90, width: 260, height: 180, rotation: 42 };

function makeUpdatableStage(count: number) {
  return defineComponent({
    props: { v: { type: Object, required: true } },
    setup(props) {
      return () => h(
        'div',
        null,
        Array.from({ length: count }, (_, i) =>
          h(
            TransformBoxRoot,
            { key: i, modelValue: props.v as TransformBoxValue, minWidth: 40, minHeight: 40 },
            {
              default: () => POSITIONS.map(p => h(TransformBoxHandle, { key: p, position: p })),
            },
          )),
      );
    },
  });
}

describe('TransformBoxRoot — update after transform change', () => {
  bench('mount → setProps(transform) → update — 50 boxes', async () => {
    const w = mount(makeUpdatableStage(50), {
      props: { v: BOX },
      attachTo: document.body,
    });
    await w.setProps({ v: BOX_B });
    await nextTick();
    w.unmount();
  });
});
