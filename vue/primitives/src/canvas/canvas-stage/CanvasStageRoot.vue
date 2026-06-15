<script lang="ts">
import type { Dimensions, Rect, Viewport, ViewportApi, XYPosition } from '../zoom-pan';
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Root of a headless pan/zoom **canvas stage** — a thin photo-editing shell over
 * the `zoom-pan` viewport that adds the three classic fit modes (**fit** /
 * **1:1** / **fill**) on top of pan + zoom, plus automatic content-size
 * measurement so those modes work without the consumer hand-feeding dimensions.
 *
 * It owns the master `Viewport` (two-way via `v-model:viewport`, or uncontrolled
 * via `defaultViewport`), renders an internal `ViewportRoot` wired with the same
 * model + zoom constraints + the resolved content extent, and builds the
 * {@link CanvasStageContext} that wraps the zoom-pan {@link ViewportApi} and adds
 * `fitView()` / `zoomToActual()` / `fitFill()` + the reactive content size. The
 * combined api is `defineExpose`d so consumers can drive it (and wire their own
 * zoom buttons) via a template ref.
 *
 * Carries `role="application"` (downgraded to `'group'` when keyboard a11y is
 * disabled), `aria-roledescription="zoomable canvas"`, and `tabindex 0`; pass an
 * `aria-label` via `$attrs`. Mount your `<img>` / `<video>` / `<canvas>` in the
 * default slot — it renders inside the single transformed layer.
 */
export interface CanvasStageRootProps extends PrimitiveProps {
  /** Uncontrolled initial viewport (ignored when `v-model:viewport` is bound). @default { x: 0, y: 0, zoom: 1 } */
  defaultViewport?: Viewport;
  /** Minimum zoom level. @default 0.1 */
  minZoom?: number;
  /** Maximum zoom level. @default 8 */
  maxZoom?: number;
  /**
   * Intrinsic content width in content-space px. When omitted (with
   * `contentHeight`) the content element is auto-measured. @default undefined
   */
  contentWidth?: number;
  /**
   * Intrinsic content height in content-space px. When omitted (with
   * `contentWidth`) the content element is auto-measured. @default undefined
   */
  contentHeight?: number;
  /** Fractional inset on each side when fitting, 0–1. @default 0.1 */
  fitPadding?: number;
  /** Fit the content into view once the pane + content are measured. @default true */
  fitOnReady?: boolean;
  /** Multiplicative zoom factor per keyboard zoom-in/out step. @default 1.2 */
  zoomStep?: number;
  /** Pixel step for arrow-key panning (Shift = ×5). @default 40 */
  panStep?: number;
  /** Master interactivity switch (lock). @default false */
  disabled?: boolean;
  /** Disable the keyboard a11y layer (downgrades `role` to `'group'`). @default false */
  disableKeyboardA11y?: boolean;
}
</script>

<script setup lang="ts">
import { computed, shallowRef, toRef, watch } from 'vue';
import { useElementBounding, useEventListener, useForwardExpose } from '@robonen/vue';
import { ViewportRoot } from '../zoom-pan';
import CanvasStagePane from './CanvasStagePane.vue';
import CanvasStageContent from './CanvasStageContent.vue';
import { provideCanvasStageContext } from './context';
import type { CanvasStageApi, CanvasStageContext } from './context';

const {
  defaultViewport = { x: 0, y: 0, zoom: 1 },
  minZoom = 0.1,
  maxZoom = 8,
  contentWidth = undefined,
  contentHeight = undefined,
  fitPadding = 0.1,
  fitOnReady = true,
  zoomStep = 1.2,
  panStep = 40,
  disabled = false,
  disableKeyboardA11y = false,
  as = 'div',
} = defineProps<CanvasStageRootProps>();

// ── viewport model (controlled + uncontrolled), delegated to ViewportRoot ─────
// `ViewportRoot` already runs the controlled/uncontrolled `shallowRef` + watch
// dance internally; we simply pass the model straight through so a single
// canonical `Viewport` lives in the zoom-pan layer.
const model = defineModel<Viewport | undefined>('viewport');

// ── content size: explicit props win, else the measured intrinsic size ────────
const autoMeasure = computed(() => contentWidth === undefined || contentHeight === undefined);
const measuredContentSize = shallowRef<Dimensions>({ width: 0, height: 0 });
function setMeasuredContentSize(size: Dimensions): void {
  measuredContentSize.value = size;
}

const contentSize = computed<Dimensions>(() => {
  if (!autoMeasure.value) return { width: contentWidth!, height: contentHeight! };
  return measuredContentSize.value;
});

// The fit target in content space, anchored at the origin.
const contentExtent = computed<Rect>(() => ({
  x: 0,
  y: 0,
  width: contentSize.value.width,
  height: contentSize.value.height,
}));

// ── inner ViewportRoot api + pane measurement ─────────────────────────────────
// `ViewportRoot` exposes the imperative `ViewportApi`; we capture it via a
// template ref and build the canvas fit modes on top of it. The pane element is
// the `ViewportSurface` (= `CanvasStagePane`) — its bounding rect is the screen
// origin and the source for the fit/actual/fill maths.
const viewportRef = shallowRef<(ViewportApi & { viewport: Viewport }) | null>(null);
const rootEl = shallowRef<HTMLElement | null>(null);
const paneEl = shallowRef<HTMLElement | null>(null);
function setPaneEl(el: HTMLElement | null): void {
  paneEl.value = el;
}

const { width: paneWidth, height: paneHeight } = useElementBounding(paneEl);
const measured = shallowRef(false);
watch([paneWidth, paneHeight, contentSize], () => {
  if (!measured.value && paneWidth.value > 0 && paneHeight.value > 0)
    measured.value = true;
}, { immediate: true });

/** True once the pane has a non-zero rect — fit maths are meaningful. */
function paneReady(): boolean {
  return paneWidth.value > 0 && paneHeight.value > 0;
}

/** The content-space point currently centred in the pane (content centre fallback). */
function contentCentre(): XYPosition {
  const ext = contentExtent.value;
  return { x: ext.x + ext.width / 2, y: ext.y + ext.height / 2 };
}

/** Centre `target` (content space) at zoom `zoom`, clamped via the zoom-pan api. */
function applyCentred(zoom: number, target: XYPosition): void {
  const vp = viewportRef.value;
  if (!vp) return;
  vp.setViewport({
    zoom,
    x: paneWidth.value / 2 - target.x * zoom,
    y: paneHeight.value / 2 - target.y * zoom,
  });
}

// ── canvas fit modes ──────────────────────────────────────────────────────────
function fitView(): void {
  const vp = viewportRef.value;
  if (!vp || !paneReady()) return;
  const ext = contentExtent.value;
  if (ext.width === 0 || ext.height === 0) return;
  // The zoom-pan `fit` is exactly the "contain" mode (min of the two ratios).
  vp.fit(ext, { padding: fitPadding });
}

function zoomToActual(): void {
  if (!viewportRef.value || !paneReady()) return;
  // 1:1 — one content px per screen px — centred on the content centre.
  applyCentred(1, contentCentre());
}

function fitFill(): void {
  const ext = contentExtent.value;
  if (!viewportRef.value || !paneReady() || ext.width === 0 || ext.height === 0) return;
  // "Cover": the LARGER of the two ratios, so the content fills the pane with no
  // letterboxing (the opposite choice to `fitView`'s `min`). Padding does not
  // apply to a cover.
  const zoom = Math.max(paneWidth.value / ext.width, paneHeight.value / ext.height);
  applyCentred(zoom, contentCentre());
}

// ── combined api ──────────────────────────────────────────────────────────────
const api: CanvasStageApi = {
  getViewport: () => viewportRef.value?.getViewport() ?? { x: 0, y: 0, zoom: 1 },
  setViewport: vp => viewportRef.value?.setViewport(vp),
  zoomIn: (factor = zoomStep) => viewportRef.value?.zoomIn(factor),
  zoomOut: (factor = zoomStep) => viewportRef.value?.zoomOut(factor),
  zoomTo: zoom => viewportRef.value?.zoomTo(zoom),
  fitView,
  zoomToActual,
  fitFill,
  center: point => viewportRef.value?.center(point),
  reset: () => viewportRef.value?.reset(),
};

// Reactive viewport mirror: read straight off the inner `ViewportRoot`'s exposed
// `viewport` computed (reactive through the component instance), falling back to
// the model / default before it resolves.
const viewport = computed<Viewport>(
  () => viewportRef.value?.viewport ?? model.value ?? defaultViewport,
);

const context: CanvasStageContext = {
  api,
  viewport,
  contentSize,
  contentExtent,
  measured,
  autoMeasure: toRef(() => autoMeasure.value),
  setMeasuredContentSize,
};
provideCanvasStageContext(context);

// ── fit once on ready ─────────────────────────────────────────────────────────
// Wait until both the pane is measured AND the content extent is non-zero (auto
// mode resolves it asynchronously after the first ResizeObserver tick). Runs
// once; focus stays on the Root.
if (fitOnReady) {
  const stop = watch(
    [measured, contentExtent],
    ([m, ext]) => {
      if (m && ext.width > 0 && ext.height > 0) {
        fitView();
        stop();
      }
    },
    { immediate: true },
  );
}

// ── keyboard layer (canvas-specific shortcuts) ────────────────────────────────
// Bound on the focusable Root element. zoom-pan's own keyboard layer is disabled
// (`:disable-keyboard`), so CanvasStage is the single source of truth: this lets
// us honour `panStep`/`zoomStep` and map `0`/`1`/`2`/`Home` onto the canvas fit
// modes (zoom-pan's `0`/`Home` would do `zoomTo(1)` / `reset`, not
// `zoomToActual` / `fitView`). Skipped entirely when disabled or when keyboard
// a11y is off. Focus stays on the Root after a programmatic fit (we never move
// it), so the next keypress lands here.
const EDITABLE = /^(?:input|textarea|select)$/i;
function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (EDITABLE.test(el.tagName) || el.isContentEditable);
}

function onKeydown(event: KeyboardEvent): void {
  if (disabled || disableKeyboardA11y || isTyping()) return;

  const step = event.shiftKey ? panStep * 5 : panStep;
  const arrows: Record<string, [number, number]> = {
    ArrowUp: [0, step],
    ArrowDown: [0, -step],
    ArrowLeft: [step, 0],
    ArrowRight: [-step, 0],
  };

  const pan = arrows[event.key];
  if (pan) {
    const vp = api.getViewport();
    api.setViewport({ zoom: vp.zoom, x: vp.x + pan[0], y: vp.y + pan[1] });
  }
  else if (event.key === '+' || event.key === '=') {
    api.zoomIn();
  }
  else if (event.key === '-' || event.key === '_') {
    api.zoomOut();
  }
  else if (event.key === '0') {
    zoomToActual();
  }
  else if (event.key === '1') {
    fitView();
  }
  else if (event.key === '2') {
    fitFill();
  }
  else if (event.key === 'Home') {
    api.reset();
  }
  else {
    return; // not ours — let it bubble (e.g. to the page).
  }

  event.preventDefault();
}

// ── focus-visible reflection ──────────────────────────────────────────────────
const focusVisible = shallowRef(false);
function onFocus(event: FocusEvent): void {
  // `:focus-visible` semantics — only reflect keyboard focus, not a pointer grab
  // (which would flash a focus ring on every drag-to-pan).
  const el = event.currentTarget as HTMLElement | null;
  focusVisible.value = !!el?.matches?.(':focus-visible');
}
function onBlur(): void {
  focusVisible.value = false;
}

// Bind the a11y listeners on the Root element once it resolves. `currentElement`
// (from `useForwardExpose`) is the rendered Root, which carries `tabindex 0`.
useEventListener(rootEl, 'keydown', onKeydown);
useEventListener(rootEl, 'focus', onFocus);
useEventListener(rootEl, 'blur', onBlur);

// `defineExpose` runs BEFORE `useForwardExpose` so the composable merges these
// bindings (plus props + `$el`) instead of `defineExpose`'s `expose()`
// clobbering them and warning "expose() should be called only once". ORDER IS
// LOAD-BEARING.
defineExpose({
  getViewport: api.getViewport,
  setViewport: api.setViewport,
  zoomIn: api.zoomIn,
  zoomOut: api.zoomOut,
  zoomTo: api.zoomTo,
  fitView: api.fitView,
  zoomToActual: api.zoomToActual,
  fitFill: api.fitFill,
  center: api.center,
  reset: api.reset,
  contentSize,
});

const { forwardRef } = useForwardExpose();

// Pass-through attrs (`role` / `aria-*` / `data-*` / `tabindex`) the inner
// `ViewportRoot` doesn't declare as typed props are bound as one object via
// `v-bind` so they ride through `$attrs` to the DOM without tripping the strict
// per-prop type check (the codebase convention for forwarding non-prop attrs to
// a typed SFC child).
const rootAttrs = computed<Record<string, unknown>>(() => ({
  role: disableKeyboardA11y ? 'group' : 'application',
  'aria-roledescription': 'zoomable canvas',
  tabindex: 0,
  'data-canvas-stage-root': '',
  'data-focus-visible': focusVisible.value ? '' : undefined,
}));
</script>

<template>
  <ViewportRoot
    :ref="(r: any) => { forwardRef(r); viewportRef = r; rootEl = (r?.$el ?? null) as HTMLElement | null; }"
    v-model:viewport="model"
    :as="as"
    :default-viewport="defaultViewport"
    :min-zoom="minZoom"
    :max-zoom="maxZoom"
    :content-extent="contentExtent"
    :fit-padding="fitPadding"
    :disabled="disabled"
    :disable-keyboard="true"
    v-bind="rootAttrs"
  >
    <template #surface>
      <CanvasStagePane @pane="setPaneEl">
        <CanvasStageContent>
          <slot />
        </CanvasStageContent>
      </CanvasStagePane>
    </template>
  </ViewportRoot>
</template>
