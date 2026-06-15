<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A trim handle on a clip edge. It is `role="slider"` (horizontal) over the
 * clip's trim range in seconds, with `aria-valuemin` / `aria-valuemax` /
 * `aria-valuenow` and an `aria-valuetext` timecode — so trims are keyboard
 * operable AND announced. Dragging trims the start edge (`side: 'start'`) or the
 * end edge (`side: 'end'`), snapped to clip edges / playhead / markers / grid and
 * clamped so duration stays `> 0`. Arrow keys trim by one frame (Shift = 1 s).
 *
 * Render it inside a `TimelineClip`'s default slot, absolutely positioned at the
 * clip's left / right edge.
 */
export interface TimelineClipHandleProps extends PrimitiveProps {
  /** Which edge this handle trims. */
  side: 'start' | 'end';
}
</script>

<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { Primitive } from '../../internal/primitive';
import { usePointerDrag } from '../../internal/pointer-drag';
import { getDirectionAwareKey } from '../../utilities/roving-focus/utils';
import { useTimelineContext } from './context';

const { side, as = 'span' } = defineProps<TimelineClipHandleProps>();

// A handle must live inside a clip; find its clip id from the data attribute on
// the nearest clip ancestor at interaction time (kept simple via a prop-less
// lookup through the DOM is avoided — instead we read the clip from context by
// the closest `[data-clip-id]`). To stay self-contained the handle accepts the
// clip via the closest clip element's dataset.
const ctx = useTimelineContext();
const el = shallowRef<HTMLElement | null>(null);

/** The owning clip id, resolved from the nearest `[data-clip-id]` ancestor. */
function ownerClipId(): string | undefined {
  return (el.value?.closest('[data-clip-id]') as HTMLElement | null)?.dataset['clipId'];
}

const clip = computed(() => {
  const id = ownerClipId();
  return id ? ctx.clipLookup.value.get(id) : undefined;
});

const locked = computed(() => !!clip.value?.locked);

// Slider value semantics: the handle's value is the edge time it controls.
const valueNow = computed(() => {
  const c = clip.value;
  if (!c) return 0;
  return side === 'start' ? c.start : c.start + c.duration;
});
const valueMin = computed(() => (side === 'start' ? 0 : (clip.value?.start ?? 0)));
const valueMax = computed(() => {
  const c = clip.value;
  if (!c) return ctx.duration.value;
  return side === 'start' ? c.start + c.duration : ctx.duration.value || Number.MAX_SAFE_INTEGER;
});
const valueText = computed(() => ctx.formatTimecode(valueNow.value));

// ── trimming ──────────────────────────────────────────────────────────────────
function applyTrim(edgeTime: number): void {
  const c = clip.value;
  if (!c) return;
  const exclude = new Set([c.id]);
  const snapped = ctx.snapTime(edgeTime, exclude);
  if (side === 'start') {
    // Trimming the start: keep the end fixed; duration shrinks/grows.
    const end = c.start + c.duration;
    const nextStart = Math.min(Math.max(0, snapped), end - 1e-4);
    ctx.trimClip(c.id, nextStart, end - nextStart, true);
  }
  else {
    // Trimming the end: keep the start fixed.
    const nextEnd = Math.max(snapped, c.start + 1e-4);
    ctx.trimClip(c.id, c.start, nextEnd - c.start, true);
  }
}

let startEdge = 0;

usePointerDrag(() => (ctx.disabled.value || locked.value ? null : el.value), {
  axis: 'x',
  disabled: () => ctx.disabled.value || locked.value,
  stopPropagation: true,
  onStart: () => {
    startEdge = valueNow.value;
    return undefined;
  },
  onMove: (state) => {
    const dirSign = ctx.direction.value === 'rtl' ? -1 : 1;
    const deltaSeconds = (state.total.x / ctx.pxPerSecond.value) * dirSign;
    applyTrim(startEdge + deltaSeconds);
  },
  onEnd: () => {
    ctx.commitMutation();
  },
});

function onKeydown(event: KeyboardEvent): void {
  if (ctx.disabled.value || locked.value) return;
  const key = getDirectionAwareKey(event.key, ctx.direction.value);
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;
  event.preventDefault();
  const sign = key === 'ArrowRight' ? 1 : -1;
  const step = event.shiftKey ? 1 : (ctx.fps.value > 0 ? 1 / ctx.fps.value : 1);
  applyTrim(valueNow.value + sign * step);
  ctx.commitMutation();
}

function setRef(node: unknown): void {
  el.value = (node && typeof node === 'object' && '$el' in node ? (node as { $el: HTMLElement }).$el : node) as HTMLElement | null;
}
</script>

<template>
  <Primitive
    :ref="setRef"
    :as="as"
    role="slider"
    aria-orientation="horizontal"
    :aria-label="side === 'start' ? 'Trim start' : 'Trim end'"
    :aria-valuemin="valueMin"
    :aria-valuemax="valueMax"
    :aria-valuenow="valueNow"
    :aria-valuetext="valueText"
    :data-side="side"
    :data-locked="locked ? '' : undefined"
    :aria-disabled="ctx.disabled.value || locked ? true : undefined"
    :tabindex="ctx.disabled.value || locked ? undefined : 0"
    @keydown="onKeydown"
  >
    <slot />
  </Primitive>
</template>
