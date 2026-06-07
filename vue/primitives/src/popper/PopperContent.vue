<script lang="ts">
import type { Align, Side } from './utils';
import type { Middleware, Placement, ReferenceElement } from '@floating-ui/vue';
import type { PrimitiveProps } from '../primitive';

export interface PopperContentProps extends PrimitiveProps {
  /** Preferred side of the anchor. @default 'bottom' */
  side?: Side;
  /** Distance in pixels from the anchor. @default 0 */
  sideOffset?: number;
  /** Flip to the opposite side on collision. @default true */
  sideFlip?: boolean;
  /** Preferred alignment against the anchor. @default 'center' */
  align?: Align;
  /** Offset in pixels from the alignment edge. @default 0 */
  alignOffset?: number;
  /** Flip alignment on collision. @default true */
  alignFlip?: boolean;
  /** Reposition to prevent boundary overflow. @default true */
  avoidCollisions?: boolean;
  /** Collision boundary element(s). @default [] */
  collisionBoundary?: Array<Element | null> | Element | null;
  /** Distance from boundary for collision detection. @default 0 */
  collisionPadding?: number | Partial<Record<Side, number>>;
  /** Padding between arrow and content edges. @default 0 */
  arrowPadding?: number;
  /** Hide arrow when it can't be centered. @default true */
  hideShiftedArrow?: boolean;
  /** Sticky behavior on the align axis. @default 'partial' */
  sticky?: 'always' | 'partial';
  /** Hide when anchor is fully occluded. @default false */
  hideWhenDetached?: boolean;
  /** CSS position strategy. @default 'fixed' */
  positionStrategy?: 'absolute' | 'fixed';
  /** Position update strategy. @default 'optimized' */
  updatePositionStrategy?: 'always' | 'optimized';
  /** Disable layout-shift-based position update. @default false */
  disableUpdateOnLayoutShift?: boolean;
  /** Force content to stay within the viewport. @default false */
  prioritizePosition?: boolean;
  /** Custom reference element, overrides the anchor. */
  reference?: ReferenceElement;
}

export interface PopperContentEmits {
  placed: [];
}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import {
  autoUpdate,
  flip,
  arrow as floatingUIArrow,
  hide,
  limitShift,
  offset,
  shift,
  size,
  useFloating,
} from '@floating-ui/vue';
import { computed, onBeforeUnmount, ref, shallowRef, useTemplateRef, watchEffect, watchPostEffect } from 'vue';
import { getSideAndAlignFromPlacement, isNotNull, transformOrigin } from './utils';
import { providePopperContentContext, usePopperRootContext } from './context';
import { useForwardExpose } from '@robonen/vue';

defineOptions({ inheritAttrs: false });

const {
  side = 'bottom',
  sideOffset = 0,
  sideFlip = true,
  align = 'center',
  alignOffset = 0,
  alignFlip = true,
  avoidCollisions = true,
  collisionBoundary = [],
  collisionPadding: collisionPaddingProp = 0,
  arrowPadding = 0,
  hideShiftedArrow = true,
  sticky = 'partial',
  hideWhenDetached = false,
  positionStrategy = 'fixed',
  updatePositionStrategy = 'optimized',
  disableUpdateOnLayoutShift = false,
  prioritizePosition = false,
  reference: referenceProp,
  as,
} = defineProps<PopperContentProps>();

const emit = defineEmits<PopperContentEmits>();

const rootContext = usePopperRootContext();
const { forwardRef, currentElement: contentElement } = useForwardExpose();

const floatingRef = useTemplateRef<HTMLElement>('floatingRef');
const arrow = ref<HTMLElement>();

// Arrow size tracking via ResizeObserver (replaces useSize)
const arrowWidth = ref(0);
const arrowHeight = ref(0);
let arrowObserver: ResizeObserver | null = null;

watchEffect((onCleanup) => {
  arrowObserver?.disconnect();
  arrowObserver = null;

  const el = arrow.value;
  if (!el) return;

  arrowObserver = new ResizeObserver(([entry]) => {
    if (entry) {
      const borderBox = entry.borderBoxSize[0];
      if (borderBox) {
        arrowWidth.value = borderBox.inlineSize;
        arrowHeight.value = borderBox.blockSize;
      }
      else {
        const rect = el.getBoundingClientRect();
        arrowWidth.value = rect.width;
        arrowHeight.value = rect.height;
      }
    }
  });
  arrowObserver.observe(el);

  onCleanup(() => {
    arrowObserver?.disconnect();
  });
});

onBeforeUnmount(() => {
  arrowObserver?.disconnect();
});

const desiredPlacement = computed<Placement>(
  () => (side + (align !== 'center' ? `-${align}` : '')) as Placement,
);

const collisionPadding = computed(() => {
  return typeof collisionPaddingProp === 'number'
    ? collisionPaddingProp
    : { top: 0, right: 0, bottom: 0, left: 0, ...collisionPaddingProp };
});

const boundary = computed(() => {
  return Array.isArray(collisionBoundary)
    ? collisionBoundary
    : [collisionBoundary];
});

const detectOverflowOptions = computed(() => ({
  padding: collisionPadding.value,
  boundary: boundary.value.filter(isNotNull),
  altBoundary: boundary.value.length > 0,
}));

const flipOptions = computed(() => ({
  mainAxis: sideFlip,
  crossAxis: alignFlip,
}));

const computedMiddleware = computed<Middleware[]>(() => [
  offset({
    mainAxis: sideOffset + arrowHeight.value,
    alignmentAxis: alignOffset,
  }),
  prioritizePosition
  && avoidCollisions
  && flip({ ...detectOverflowOptions.value, ...flipOptions.value }),
  avoidCollisions
  && shift({
    mainAxis: true,
    crossAxis: !!prioritizePosition,
    limiter: sticky === 'partial' ? limitShift() : undefined,
    ...detectOverflowOptions.value,
  }),
  !prioritizePosition
  && avoidCollisions
  && flip({ ...detectOverflowOptions.value, ...flipOptions.value }),
  size({
    ...detectOverflowOptions.value,
    apply: ({ elements, rects, availableWidth, availableHeight }) => {
      const { width: anchorWidth, height: anchorHeight } = rects.reference;
      const contentStyle = elements.floating.style;
      contentStyle.setProperty('--popper-available-width', `${availableWidth}px`);
      contentStyle.setProperty('--popper-available-height', `${availableHeight}px`);
      contentStyle.setProperty('--popper-anchor-width', `${anchorWidth}px`);
      contentStyle.setProperty('--popper-anchor-height', `${anchorHeight}px`);
    },
  }),
  arrow.value && floatingUIArrow({ element: arrow.value, padding: arrowPadding }),
  transformOrigin({ arrowWidth: arrowWidth.value, arrowHeight: arrowHeight.value }),
  hideWhenDetached && hide({ strategy: 'referenceHidden', ...detectOverflowOptions.value }),
] as Middleware[]);

const reference = computed(() => referenceProp ?? rootContext.anchor.value);

const { floatingStyles, placement, isPositioned, middlewareData } = useFloating(
  reference,
  floatingRef,
  {
    strategy: positionStrategy,
    placement: desiredPlacement,
    whileElementsMounted: (...args) => {
      return autoUpdate(...args, {
        layoutShift: !disableUpdateOnLayoutShift,
        animationFrame: updatePositionStrategy === 'always',
      });
    },
    middleware: computedMiddleware,
  },
);

const placedSide = computed(() => getSideAndAlignFromPlacement(placement.value)[0]);
const placedAlign = computed(() => getSideAndAlignFromPlacement(placement.value)[1]);

watchPostEffect(() => {
  if (isPositioned.value) emit('placed');
});

const shouldHideArrow = computed(() => {
  const cannotCenterArrow = middlewareData.value.arrow?.centerOffset !== 0;
  return hideShiftedArrow && cannotCenterArrow;
});

const contentZIndex = shallowRef('');
watchEffect(() => {
  if (contentElement.value) {
    contentZIndex.value = globalThis.getComputedStyle(contentElement.value).zIndex;
  }
});

const arrowX = computed(() => middlewareData.value.arrow?.x ?? 0);
const arrowY = computed(() => middlewareData.value.arrow?.y ?? 0);

providePopperContentContext({
  placedSide,
  onArrowChange: (element: HTMLElement | undefined) => { arrow.value = element; },
  arrowX,
  arrowY,
  shouldHideArrow,
});
</script>

<template>
  <div
    ref="floatingRef"
    data-popper-content-wrapper=""
    :style="{
      ...floatingStyles,
      transform: isPositioned ? floatingStyles.transform : 'translate(0, -200%)',
      minWidth: 'max-content',
      zIndex: contentZIndex,
      ['--popper-transform-origin' as any]: [
        middlewareData.transformOrigin?.x,
        middlewareData.transformOrigin?.y,
      ].join(' '),
      // Always set both keys so V8 keeps a single hidden class for the style
      // object across renders, instead of allocating a new shape when the
      // conditional spread kicks in.
      visibility: middlewareData.hide?.referenceHidden ? ('hidden' as const) : undefined,
      pointerEvents: middlewareData.hide?.referenceHidden ? ('none' as const) : undefined,
    }"
  >
    <Primitive
      :ref="forwardRef"
      v-bind="$attrs"
      :as="as"
      :data-side="placedSide"
      :data-align="placedAlign"
      :style="{
        animation: isPositioned ? undefined : 'none',
      }"
    >
      <slot />
    </Primitive>
  </div>
</template>
