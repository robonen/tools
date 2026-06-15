<script lang="ts">
import type { SurfaceRect, Viewport, ViewportApi, ViewportContext, ViewportRootProps, XYPosition, ZoomPanOptions } from './types';

/**
 * Root of a headless zoom-pan surface. Owns the master `Viewport` (two-way via
 * `v-model:viewport`, or uncontrolled via `defaultViewport`), holds the
 * interaction configuration (`minZoom`/`maxZoom`/`axis`/extents/gesture
 * toggles), builds the {@link ViewportContext}, and provides it to
 * `ViewportSurface` / `ViewportContent`. By default it renders the standard
 * `ViewportSurface → ViewportContent` subtree and exposes the default slot as
 * the viewport content; pass `#surface` to compose the parts manually. The
 * imperative {@link ViewportApi} is also `defineExpose`d so consumers can drive
 * pan/zoom via a template ref.
 *
 * The generalised substrate the flow canvas, a crop tool, an image stage, or a
 * transform box all mount their content inside.
 */
export type { ViewportRootProps };
</script>

<script setup lang="ts">
import { computed, shallowRef, toRef, useSlots, watch } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../../internal/primitive';
import ViewportSurface from './ViewportSurface.vue';
import ViewportContent from './ViewportContent.vue';
import { provideViewportContext } from './context';
import { useViewportApi } from './useViewportApi';
import { useInteractionState } from './useInteractionState';
import { clampViewport as clampViewportFn, contentToScreen as contentToScreenFn, measureContentRect as measureContentRectFn, screenToContent as screenToContentFn } from './utils';

const {
  defaultViewport = { x: 0, y: 0, zoom: 1 },
  minZoom = 0.5,
  maxZoom = 2,
  axis = 'xy',
  panOnDrag = true,
  zoomOnScroll = true,
  zoomOnPinch = true,
  panOnScroll = false,
  zoomOnDoubleClick = true,
  translateExtent = null,
  contentExtent = null,
  fitPadding = 0.1,
  fitView = false,
  zoomActivationKey = null,
  disabled = false,
  disableKeyboard = false,
  as = 'div',
} = defineProps<ViewportRootProps>();

const slots = useSlots();

// ── viewport model (controlled + uncontrolled), mirroring SliderRoot ─────────
// In uncontrolled mode `model.value` is `undefined` until the first write, so a
// local `shallowRef` seeded from `defaultViewport` is the source of truth and is
// kept in sync with any external bind by the watch below.
const model = defineModel<Viewport | undefined>('viewport');
const localViewport = shallowRef<Viewport>(model.value ?? { ...defaultViewport });

watch(model, (v) => {
  if (v === undefined || v === null) return;
  if (v === localViewport.value) return;
  localViewport.value = v;
});

const viewport = computed<Viewport>({
  get: () => localViewport.value,
  set: (v) => {
    localViewport.value = v;
    // `defineModel` emits `update:viewport` on write — no manual emit needed.
    model.value = v;
  },
});

// ── surface measurement ──────────────────────────────────────────────────────
const surfaceRect = shallowRef<SurfaceRect>({ left: 0, top: 0, width: 0, height: 0 });
const measured = shallowRef(false);
function setSurfaceRect(rect: SurfaceRect): void {
  surfaceRect.value = rect;
  if (!measured.value && rect.width > 0 && rect.height > 0) measured.value = true;
}

// ── reactive config refs (GetterRefImpl passthroughs) ────────────────────────
const minZoomRef = toRef(() => minZoom);
const maxZoomRef = toRef(() => maxZoom);
const axisRef = toRef(() => axis);
const translateExtentRef = toRef(() => translateExtent);
const contentExtentRef = toRef(() => contentExtent);
const fitPaddingRef = toRef(() => fitPadding);
const interactiveRef = toRef(() => !disabled);

const options = computed<ZoomPanOptions>(() => ({
  axis,
  panOnDrag,
  zoomOnScroll,
  zoomOnPinch,
  panOnScroll,
  zoomOnDoubleClick,
  zoomActivationKey,
  disabled,
  disableKeyboard,
}));

// ── coordinate bindings (live viewport + surface origin) ─────────────────────
function screenToContent(point: XYPosition): XYPosition {
  return screenToContentFn(point, viewport.value, surfaceRect.value);
}
function contentToScreen(point: XYPosition): XYPosition {
  return contentToScreenFn(point, viewport.value, surfaceRect.value);
}
function measureContentRect(el: HTMLElement) {
  return measureContentRectFn(el, viewport.value, surfaceRect.value);
}
function clampViewport(vp: Viewport): Viewport {
  return clampViewportFn(vp, {
    minZoom: minZoomRef.value,
    maxZoom: maxZoomRef.value,
    translateExtent: translateExtentRef.value,
  });
}

const isInteracting = useInteractionState(() => viewport.value);

// ── build + provide context ──────────────────────────────────────────────────
const context: ViewportContext = {
  viewport,
  surfaceRect,
  setSurfaceRect,
  minZoom: minZoomRef,
  maxZoom: maxZoomRef,
  axis: axisRef,
  translateExtent: translateExtentRef,
  contentExtent: contentExtentRef,
  fitPadding: fitPaddingRef,
  interactive: interactiveRef,
  measured,
  options,
  isInteracting,
  // `isPanning` / `isZooming` are surfaced from `useZoomPan` (run inside
  // `ViewportSurface`) via these proxy refs; `ViewportSurface` writes into them.
  isPanning: shallowRef(false),
  isZooming: shallowRef(false),
  screenToContent,
  contentToScreen,
  measureContentRect,
  clampViewport,
  // `api` is assigned right after construction (it closes over `context`).
  api: undefined as unknown as ViewportApi,
};

const api = useViewportApi(context);
context.api = api;

provideViewportContext(context);

// `fitView`: fit `contentExtent` into view once the surface is first measured.
if (fitView) {
  watch(measured, (m) => {
    if (m) api.fit();
  });
}

const hasSurfaceSlot = computed(() => !!slots.surface);

// `defineExpose` runs BEFORE `useForwardExpose` so the composable merges these
// bindings (plus props + `$el`) instead of `defineExpose`'s `expose()`
// clobbering them and warning "expose() should be called only once". ORDER IS
// LOAD-BEARING.
defineExpose({
  ...api,
  viewport,
});

const { forwardRef } = useForwardExpose();
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    data-viewport-root=""
  >
    <slot
      v-if="hasSurfaceSlot"
      name="surface"
      :api="api"
    />
    <ViewportSurface v-else>
      <ViewportContent>
        <slot :api="api" />
      </ViewportContent>
    </ViewportSurface>
  </Primitive>
</template>
