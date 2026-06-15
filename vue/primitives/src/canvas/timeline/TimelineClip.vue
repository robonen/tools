<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * A clip block. Positioned by the shared scale (`left = scale(start)`,
 * `width = scale(start + duration) - scale(start)` — real layout pixels, never a
 * CSS transform-scale). It is a roving-focus stop (single Root tab-stop → roving
 * between clips in time order), `role="group"` / `aria-roledescription="clip"`
 * with a descriptive label (label + start/duration timecode), `aria-selected`,
 * and `data-selected` / `data-dragging` / `data-locked`.
 *
 * Dragging (via `usePointerDrag`) converts the pointer x-delta to a time delta
 * (snapped to clip edges / playhead / markers / grid) for a move, and the
 * y-delta crosses lanes (drop onto another track). Keyboard: Arrow Left/Right
 * nudge the selected clip(s) by a frame (Shift = 1 s), Arrow Up/Down move across
 * tracks, Delete removes.
 */
export interface TimelineClipProps extends PrimitiveProps {
  /** Id of the clip this block renders. */
  clipId: string;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue';
import { Primitive } from '../../internal/primitive';
import { usePointerDrag } from '../../internal/pointer-drag';
import { getDirectionAwareKey } from '../../utilities/roving-focus/utils';
import { useTimelineContext } from './context';

const { clipId, as = 'div' } = defineProps<TimelineClipProps>();

const ctx = useTimelineContext();
const el = shallowRef<HTMLElement | null>(null);

const clip = computed(() => ctx.clipLookup.value.get(clipId));
const selected = computed(() => ctx.selectedClipIds.value.has(clipId));
const dragging = computed(() => ctx.draggingClipId.value === clipId);
const locked = computed(() => !!clip.value?.locked);

// This clip is the roving tab-stop when it is the Root's single tab-stop id (the
// first selected clip in time order, else the first clip). The id is computed
// once in the Root, so this is an O(1) equality check (not an O(N) scan per clip).
const isTabStop = computed(() => ctx.tabStopClipId.value === clipId);

// Pixel geometry from the shared scale (real layout px).
const left = computed(() => {
  const c = clip.value;
  if (!c) return 0;
  return Math.min(ctx.scale(c.start), ctx.scale(c.start + c.duration));
});
const width = computed(() => {
  const c = clip.value;
  if (!c) return 0;
  return Math.abs(ctx.scale(c.start + c.duration) - ctx.scale(c.start));
});

const ariaLabel = computed(() => {
  const c = clip.value;
  if (!c) return 'clip';
  const name = c.label ?? clipId;
  return `${name}, start ${ctx.formatTimecode(c.start)}, duration ${ctx.formatTimecode(c.duration)}`;
});

// ── element registration for roving focus + marquee ──────────────────────────
watch(el, (node, _prev) => {
  if (node) ctx.registerClipEl(clipId, node);
});
onBeforeUnmount(() => ctx.unregisterClipEl(clipId));

// ── drag (x → time move, y → cross-track) ────────────────────────────────────
let startStart = 0;
let startTrackId = '';
const dragExclude = new Set<string>([clipId]);

/** Which track lane sits under a client-y point (DOM hit-test on `[data-track-id]`). */
function trackIdAtClientY(clientX: number, clientY: number): string | undefined {
  const target = document.elementFromPoint(clientX, clientY);
  const row = target?.closest('[data-track-id]') as HTMLElement | null;
  return row?.dataset['trackId'];
}

usePointerDrag(() => (ctx.disabled.value || locked.value ? null : el.value), {
  axis: 'both',
  disabled: () => ctx.disabled.value || locked.value,
  stopPropagation: true,
  onStart: () => {
    const c = clip.value;
    if (!c) return false;
    startStart = c.start;
    startTrackId = c.trackId;
    // Select this clip on grab (non-additive) so the drag affects it.
    if (!selected.value) ctx.selectClip(clipId, false);
    return undefined;
  },
  onMove: (state) => {
    const c = clip.value;
    if (!c) return;
    // x → time. Convert the cumulative pixel delta to seconds via px-per-second.
    const dirSign = ctx.direction.value === 'rtl' ? -1 : 1;
    const deltaSeconds = (state.total.x / ctx.pxPerSecond.value) * dirSign;
    const rawStart = Math.max(0, startStart + deltaSeconds);
    const snapped = ctx.snapTime(rawStart, dragExclude);
    // y → cross-track: hit-test the lane under the pointer.
    const trackId = trackIdAtClientY(state.point.x, state.point.y) ?? startTrackId;
    ctx.moveClip(clipId, snapped, trackId, true);
  },
  onEnd: () => {
    ctx.commitMutation();
  },
});

// ── keyboard ──────────────────────────────────────────────────────────────────
function onKeydown(event: KeyboardEvent): void {
  if (ctx.disabled.value) return;
  // Roving navigation between clips (handled here so we control time order).
  const key = getDirectionAwareKey(event.key, ctx.direction.value);

  switch (key) {
    case 'ArrowLeft':
    case 'ArrowRight': {
      // Shift+Arrow without a clip-move modifier still nudges; we always nudge
      // the SELECTED clips (this one is selected on focus via roving).
      event.preventDefault();
      const sign = key === 'ArrowRight' ? 1 : -1;
      const step = event.shiftKey ? 1 : (ctx.fps.value > 0 ? 1 / ctx.fps.value : 1);
      // Ensure this clip is in the selection before nudging.
      if (!selected.value) ctx.selectClip(clipId, false);
      ctx.nudgeSelected(sign * step);
      break;
    }
    case 'ArrowUp':
    case 'ArrowDown': {
      event.preventDefault();
      if (!selected.value) ctx.selectClip(clipId, false);
      ctx.moveSelectedToAdjacentTrack(key === 'ArrowDown' ? 1 : -1);
      break;
    }
    case 'Home':
    case 'End': {
      // Move roving focus to the first / last clip in time order.
      event.preventDefault();
      const order = ctx.orderedClipIds.value;
      const targetId = key === 'Home' ? order[0] : order[order.length - 1];
      if (targetId && targetId !== clipId) ctx.focusClip(targetId);
      break;
    }
    case 'Delete':
    case 'Backspace': {
      event.preventDefault();
      if (!selected.value) ctx.selectClip(clipId, false);
      ctx.removeSelected();
      break;
    }
    default:
      break;
  }
}

function onPointerDownSelect(event: PointerEvent): void {
  if (ctx.disabled.value || event.button !== 0) return;
  // Additive selection with Shift/Meta.
  if (event.shiftKey || event.metaKey || event.ctrlKey) ctx.selectClip(clipId, true);
  else if (!selected.value) ctx.selectClip(clipId, false);
  el.value?.focus();
}

function setRef(node: unknown): void {
  el.value = (node && typeof node === 'object' && '$el' in node ? (node as { $el: HTMLElement }).$el : node) as HTMLElement | null;
}
</script>

<template>
  <Primitive
    :ref="setRef"
    :as="as"
    role="group"
    aria-roledescription="clip"
    :aria-label="ariaLabel"
    :aria-selected="selected"
    :data-clip-id="clipId"
    :data-selected="selected ? '' : undefined"
    :data-dragging="dragging ? '' : undefined"
    :data-locked="locked ? '' : undefined"
    :tabindex="ctx.disabled.value ? undefined : (isTabStop ? 0 : -1)"
    :style="{
      position: 'absolute',
      left: `${left}px`,
      width: `${width}px`,
    }"
    @keydown="onKeydown"
    @pointerdown="onPointerDownSelect"
  >
    <slot
      :clip="clip"
      :selected="selected"
      :dragging="dragging"
      :locked="locked"
    />
  </Primitive>
</template>
