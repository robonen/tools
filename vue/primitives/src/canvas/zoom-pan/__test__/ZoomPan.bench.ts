import { bench, describe } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import type { Rect, Viewport, XYPosition } from '../types';
import {
  clampViewport,
  clampZoom,
  contentToScreen,
  fitViewTransform,
  measureContentRect,
  screenToContent,
  wheelToZoomFactor,
  zoomAtPointer,
} from '../utils';
import { ViewportRoot } from '../index';

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic fixtures (NO Math.random — every value is a closed form of its
// index). Built once at module scope so the benched body does only the hot work.
// ─────────────────────────────────────────────────────────────────────────────

const ORIGIN = { left: 0, top: 0 };
const SURFACE_ORIGIN = { left: 64, top: 40 };

/** A stable viewport with a non-trivial pan + zoom for coordinate math. */
const VIEWPORT: Viewport = { x: 120, y: -48, zoom: 1.5 };

/** Constraints WITHOUT a translate extent (the common pan/zoom clamp). */
const CONSTRAINTS_ZOOM_ONLY = { minZoom: 0.3, maxZoom: 4 } as const;

/** Constraints WITH a translate extent (the boundary-clamped pan case). */
const CONSTRAINTS_EXTENT = {
  minZoom: 0.3,
  maxZoom: 4,
  translateExtent: { minX: -2000, maxX: 2000, minY: -2000, maxY: 2000 },
} as const;

/** Constraints with a DEGENERATE extent on x (min > max → centring branch). */
const CONSTRAINTS_DEGENERATE = {
  minZoom: 0.3,
  maxZoom: 4,
  translateExtent: { minX: 500, maxX: -500, minY: -2000, maxY: 2000 },
} as const;

/** Content bounds for fit-view math (content space). */
const CONTENT_BOUNDS: Rect = { x: 0, y: 0, width: 720, height: 480 };
const SURFACE_SIZE = { width: 400, height: 300 };

/**
 * Pre-built point batches at realistic (100) and stress (1000) scale. Each
 * coordinate is a deterministic spread of its index so values are non-uniform
 * (exercising the divide/multiply paths) without any RNG.
 */
function buildPoints(n: number): XYPosition[] {
  const out: XYPosition[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = { x: (i * 37) % 1280, y: (i * 53) % 720 };
  }
  return out;
}
const POINTS_100 = buildPoints(100);
const POINTS_1000 = buildPoints(1000);

/**
 * Candidate viewports to clamp, at realistic and stress scale. Each is pushed
 * deliberately out of bounds (large pan, out-of-range zoom) so the clamp does
 * real work on most entries.
 */
function buildViewports(n: number): Viewport[] {
  const out: Viewport[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = {
      x: ((i * 311) % 8000) - 4000,
      y: ((i * 173) % 8000) - 4000,
      zoom: 0.1 + ((i * 7) % 50) / 10, // 0.1 .. 5.0
    };
  }
  return out;
}
const VIEWPORTS_100 = buildViewports(100);
const VIEWPORTS_1000 = buildViewports(1000);

/**
 * Pre-built WheelEvent fixtures spanning the three deltaMode branches and the
 * ctrlKey (pinch) amplifier. Constructed in browser mode (Playwright chromium)
 * where the WheelEvent constructor is real.
 */
function buildWheelEvents(n: number): WheelEvent[] {
  const out: WheelEvent[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = new WheelEvent('wheel', {
      deltaY: ((i % 7) - 3) * 40, // -120 .. 120, includes 0
      deltaX: ((i % 5) - 2) * 30,
      deltaMode: i % 3, // 0 px, 1 line, 2 page
      ctrlKey: i % 4 === 0, // ~25% pinch
    });
  }
  return out;
}
const WHEEL_100 = buildWheelEvents(100);
const WHEEL_1000 = buildWheelEvents(1000);

/**
 * A simulated pointer-move stream (surface-relative client points) used to drive
 * the zoom-at-pointer hot path the same way `useZoomPan`'s wheel handler does:
 * read current vp → factor → clamp → zoomAtPointer. One step per fixture entry.
 */
const POINTER_STREAM_100 = buildPoints(100);
const POINTER_STREAM_1000 = buildPoints(1000);

// Sinks to defeat dead-code elimination of pure-function results.
let sinkNum = 0;
let sinkPoint: XYPosition = { x: 0, y: 0 };
let sinkVp: Viewport = { x: 0, y: 0, zoom: 1 };

// ─────────────────────────────────────────────────────────────────────────────
// Pure coordinate math — screen↔content (the per-frame hit-test conversions).
// ─────────────────────────────────────────────────────────────────────────────

describe('screenToContent — over N points', () => {
  bench('100 points', () => {
    for (let i = 0; i < POINTS_100.length; i++)
      sinkPoint = screenToContent(POINTS_100[i], VIEWPORT, SURFACE_ORIGIN);
  });

  bench('1000 points', () => {
    for (let i = 0; i < POINTS_1000.length; i++)
      sinkPoint = screenToContent(POINTS_1000[i], VIEWPORT, SURFACE_ORIGIN);
  });
});

describe('contentToScreen — over N points', () => {
  bench('100 points', () => {
    for (let i = 0; i < POINTS_100.length; i++)
      sinkPoint = contentToScreen(POINTS_100[i], VIEWPORT, SURFACE_ORIGIN);
  });

  bench('1000 points', () => {
    for (let i = 0; i < POINTS_1000.length; i++)
      sinkPoint = contentToScreen(POINTS_1000[i], VIEWPORT, SURFACE_ORIGIN);
  });
});

describe('round-trip screen→content→screen — over N points', () => {
  bench('100 points', () => {
    for (let i = 0; i < POINTS_100.length; i++) {
      const c = screenToContent(POINTS_100[i], VIEWPORT, ORIGIN);
      sinkPoint = contentToScreen(c, VIEWPORT, ORIGIN);
    }
  });

  bench('1000 points', () => {
    for (let i = 0; i < POINTS_1000.length; i++) {
      const c = screenToContent(POINTS_1000[i], VIEWPORT, ORIGIN);
      sinkPoint = contentToScreen(c, VIEWPORT, ORIGIN);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// zoomAtPointer — the anchored-zoom transform run on every wheel/pinch step.
// ─────────────────────────────────────────────────────────────────────────────

describe('zoomAtPointer — over N anchor points', () => {
  bench('100 points', () => {
    for (let i = 0; i < POINTS_100.length; i++)
      sinkVp = zoomAtPointer(VIEWPORT, VIEWPORT.zoom * 1.1, POINTS_100[i], SURFACE_ORIGIN);
  });

  bench('1000 points', () => {
    for (let i = 0; i < POINTS_1000.length; i++)
      sinkVp = zoomAtPointer(VIEWPORT, VIEWPORT.zoom * 1.1, POINTS_1000[i], SURFACE_ORIGIN);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// clampViewport — the per-write clamp. Three branches: zoom-only, with extent,
// and the degenerate (centring) extent. Each at realistic + stress scale.
// ─────────────────────────────────────────────────────────────────────────────

describe('clampViewport — zoom-only (no extent)', () => {
  bench('100 viewports', () => {
    for (let i = 0; i < VIEWPORTS_100.length; i++)
      sinkVp = clampViewport(VIEWPORTS_100[i], CONSTRAINTS_ZOOM_ONLY);
  });

  bench('1000 viewports', () => {
    for (let i = 0; i < VIEWPORTS_1000.length; i++)
      sinkVp = clampViewport(VIEWPORTS_1000[i], CONSTRAINTS_ZOOM_ONLY);
  });
});

describe('clampViewport — with translate extent', () => {
  bench('100 viewports', () => {
    for (let i = 0; i < VIEWPORTS_100.length; i++)
      sinkVp = clampViewport(VIEWPORTS_100[i], CONSTRAINTS_EXTENT);
  });

  bench('1000 viewports', () => {
    for (let i = 0; i < VIEWPORTS_1000.length; i++)
      sinkVp = clampViewport(VIEWPORTS_1000[i], CONSTRAINTS_EXTENT);
  });
});

describe('clampViewport — degenerate extent (centring branch)', () => {
  bench('100 viewports', () => {
    for (let i = 0; i < VIEWPORTS_100.length; i++)
      sinkVp = clampViewport(VIEWPORTS_100[i], CONSTRAINTS_DEGENERATE);
  });

  bench('1000 viewports', () => {
    for (let i = 0; i < VIEWPORTS_1000.length; i++)
      sinkVp = clampViewport(VIEWPORTS_1000[i], CONSTRAINTS_DEGENERATE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// wheelToZoomFactor — normalises deltaMode + ctrlKey on every wheel event.
// ─────────────────────────────────────────────────────────────────────────────

describe('wheelToZoomFactor — over N wheel events', () => {
  bench('100 events', () => {
    for (let i = 0; i < WHEEL_100.length; i++)
      sinkNum += wheelToZoomFactor(WHEEL_100[i]);
  });

  bench('1000 events', () => {
    for (let i = 0; i < WHEEL_1000.length; i++)
      sinkNum += wheelToZoomFactor(WHEEL_1000[i]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Simulated wheel-zoom pipeline — the exact composition useZoomPan runs per
// wheel event: factor → clampZoom → zoomAtPointer (skipping the boundary no-op).
// ─────────────────────────────────────────────────────────────────────────────

describe('wheel-zoom pipeline (factor → clamp → zoomAtPointer)', () => {
  bench('100 steps', () => {
    let vp = VIEWPORT;
    for (let i = 0; i < WHEEL_100.length; i++) {
      const factor = wheelToZoomFactor(WHEEL_100[i]);
      const next = clampZoom(vp.zoom * factor, CONSTRAINTS_ZOOM_ONLY.minZoom, CONSTRAINTS_ZOOM_ONLY.maxZoom);
      if (next === vp.zoom) continue;
      vp = zoomAtPointer(vp, next, POINTER_STREAM_100[i], SURFACE_ORIGIN);
    }
    sinkVp = vp;
  });

  bench('1000 steps', () => {
    let vp = VIEWPORT;
    for (let i = 0; i < WHEEL_1000.length; i++) {
      const factor = wheelToZoomFactor(WHEEL_1000[i]);
      const next = clampZoom(vp.zoom * factor, CONSTRAINTS_ZOOM_ONLY.minZoom, CONSTRAINTS_ZOOM_ONLY.maxZoom);
      if (next === vp.zoom) continue;
      vp = zoomAtPointer(vp, next, POINTER_STREAM_1000[i], SURFACE_ORIGIN);
    }
    sinkVp = vp;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Simulated drag-pan move stream — the onMove body: translate from a base vp by
// the accumulated screen delta, then clamp. One scheduled write per move.
// ─────────────────────────────────────────────────────────────────────────────

describe('drag-pan move (translate + clamp)', () => {
  bench('100 moves', () => {
    const base = VIEWPORT;
    for (let i = 0; i < POINTER_STREAM_100.length; i++) {
      sinkVp = clampViewport(
        { zoom: base.zoom, x: base.x + POINTER_STREAM_100[i].x, y: base.y + POINTER_STREAM_100[i].y },
        CONSTRAINTS_EXTENT,
      );
    }
  });

  bench('1000 moves', () => {
    const base = VIEWPORT;
    for (let i = 0; i < POINTER_STREAM_1000.length; i++) {
      sinkVp = clampViewport(
        { zoom: base.zoom, x: base.x + POINTER_STREAM_1000[i].x, y: base.y + POINTER_STREAM_1000[i].y },
        CONSTRAINTS_EXTENT,
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fitViewTransform — fit-to-view math (zoom + centre). Once per fit, but cheap
// enough that a tight loop gives a stable baseline.
// ─────────────────────────────────────────────────────────────────────────────

describe('fitViewTransform', () => {
  bench('single fit', () => {
    sinkVp = fitViewTransform(CONTENT_BOUNDS, SURFACE_SIZE, { padding: 0.1, minZoom: 0.3, maxZoom: 4 });
  });

  bench('100 fits', () => {
    for (let i = 0; i < 100; i++)
      sinkVp = fitViewTransform(CONTENT_BOUNDS, SURFACE_SIZE, { padding: 0.1, minZoom: 0.3, maxZoom: 4 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// measureContentRect — reads a real DOM rect (browser mode) and divides out zoom.
// A single live element measured repeatedly; the getBoundingClientRect read is
// the dominant cost, so this captures the measure hot path under real layout.
// ─────────────────────────────────────────────────────────────────────────────

const measureEl = document.createElement('div');
measureEl.style.cssText = 'position:absolute;left:0;top:0;width:200px;height:120px;';
document.body.appendChild(measureEl);

describe('measureContentRect (real getBoundingClientRect)', () => {
  bench('100 measurements', () => {
    for (let i = 0; i < 100; i++)
      sinkVp = measureContentRect(measureEl, VIEWPORT, SURFACE_ORIGIN) as unknown as Viewport;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Component: ViewportRoot mount with N content tiles (realistic 50, stress 500).
// Mirrors demo.vue: a single transformed content layer holding a grid of tiles.
// ─────────────────────────────────────────────────────────────────────────────

const CONTENT_EXTENT = { x: 0, y: 0, width: 720, height: 480 };

function makeTiles(n: number) {
  return () =>
    h(
      'div',
      { style: 'display:grid;grid-template-columns:repeat(6,110px);gap:10px;width:720px;' },
      Array.from({ length: n }, (_, i) =>
        h('div', { key: i, style: 'height:110px;display:grid;place-items:center;' }, String(i)),
      ),
    );
}

const tiles50 = makeTiles(50);
const tiles500 = makeTiles(500);

function mountRoot(tiles: () => ReturnType<typeof h>, viewport: Viewport) {
  const Harness = defineComponent({
    setup() {
      return () =>
        h(
          ViewportRoot,
          {
            viewport,
            'min-zoom': 0.3,
            'max-zoom': 4,
            'content-extent': CONTENT_EXTENT,
            style: 'width:400px;height:300px;position:relative;overflow:hidden;',
          },
          { default: tiles },
        );
    },
  });
  return mount(Harness, { attachTo: document.body });
}

describe('ViewportRoot — mount with N tiles', () => {
  bench('50 tiles — mount + unmount', () => {
    const w = mountRoot(tiles50, { x: 40, y: 40, zoom: 1 });
    w.unmount();
  });

  bench('500 tiles — mount + unmount', () => {
    const w = mountRoot(tiles500, { x: 40, y: 40, zoom: 1 });
    w.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Component: re-render after a viewport prop change (the transform-update path —
// what every pan/zoom frame ultimately drives through the content layer).
// ─────────────────────────────────────────────────────────────────────────────

describe('ViewportRoot — update after viewport prop change', () => {
  bench('50 tiles — mount + viewport update', async () => {
    const viewport = ref<Viewport>({ x: 40, y: 40, zoom: 1 });
    const Harness = defineComponent({
      setup() {
        return () =>
          h(
            ViewportRoot,
            {
              viewport: viewport.value,
              'min-zoom': 0.3,
              'max-zoom': 4,
              'content-extent': CONTENT_EXTENT,
              style: 'width:400px;height:300px;position:relative;overflow:hidden;',
            },
            { default: tiles50 },
          );
      },
    });
    const w = mount(Harness, { attachTo: document.body });
    viewport.value = { x: 80, y: -20, zoom: 1.75 };
    await nextTick();
    w.unmount();
  });

  bench('50 tiles — mount + minZoom prop update', async () => {
    const w = mountRoot(tiles50, { x: 40, y: 40, zoom: 1 });
    await w.setProps({});
    await w.findComponent(ViewportRoot).setProps({ minZoom: 0.8 });
    await nextTick();
    w.unmount();
  });
});
