<script setup lang="ts">
import type { KeyframeTrackKeyframeData } from '@robonen/primitives';
import {
  CurveEditorHandle,
  CurveEditorPoint,
  KeyframeTrackEasingEditor,
  KeyframeTrackKeyframe,
  KeyframeTrackRoot,
  KeyframeTrackSegment,
} from '@robonen/primitives';
import { computed, ref } from 'vue';

// Cubic-bezier easing tuples for the segment STARTING at each keyframe
// (CSS `cubic-bezier(x1, y1, x2, y2)` semantics).
const EASE_OUT: [number, number, number, number] = [0, 0, 0.2, 1];
const EASE_IN: [number, number, number, number] = [0.5, 0, 1, 1];
const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

const keyframes = ref<KeyframeTrackKeyframeData[]>([
  { id: 'k1', time: 0, value: 0, easing: EASE_OUT },
  { id: 'k2', time: 1.2, value: 1, easing: EASE_IN_OUT },
  { id: 'k3', time: 2.6, value: 0.35, easing: EASE_IN },
  { id: 'k4', time: 4, value: 0.9 },
]);

const selectedId = ref<string | null>('k2');

const duration = 4;
const fps = 30;

// Live sampler, mirrored from the Root's `sampleAt` slot prop, for the readout.
const sampleFn = ref<(time: number) => number>(() => 0);

// A scrubbing probe so the demo shows the sampled value at an arbitrary time.
const probeTime = ref(1.6);
const probeValue = computed(() => sampleFn.value(probeTime.value));

const selectedKeyframe = computed(() =>
  keyframes.value.find(k => k.id === selectedId.value),
);

function easingLabel(e?: [number, number, number, number]): string {
  if (!e) return 'linear';
  return `cubic-bezier(${e.map(n => +n.toFixed(2)).join(', ')})`;
}

// Build an SVG polyline of the whole value curve in lane-local coordinates.
// `projection` maps time → px (x); we map value → px (y) ourselves so the curve
// fills the lane height regardless of the component's own (horizontal) lane mode.
function curvePath(projection: (t: number) => number, sample: (t: number) => number, width: number, height: number): string {
  if (width <= 0) return '';
  const pad = 10;
  const usable = height - pad * 2;
  const samples = 120;
  let d = '';
  for (let i = 0; i < samples; i++) {
    const t = (i / (samples - 1)) * duration;
    const x = projection(t);
    const y = pad + (1 - sample(t)) * usable;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return d.trim();
}

function yForValue(value: number, height: number): number {
  const pad = 10;
  return pad + (1 - value) * (height - pad * 2);
}
</script>

<template>
  <div class="demo-card w-full max-w-xl space-y-4 rounded-card border border-border bg-bg p-5 text-fg shadow-(--shadow-card)">
    <div class="flex items-baseline justify-between">
      <div>
        <h3 class="text-sm font-semibold text-fg">Opacity</h3>
        <p class="text-xs text-fg-subtle">Animation keyframes with editable easing</p>
      </div>
      <span class="rounded-md bg-bg-inset px-2 py-1 font-mono text-xs tabular-nums text-fg-muted">
        f({{ probeTime.toFixed(2) }}s) = {{ probeValue.toFixed(3) }}
      </span>
    </div>

    <!-- ── the keyframe lane ──────────────────────────────────────────────
         The Root measures its OWN box (standalone), so it needs an explicit
         height + relative positioning; the curve SVG, segments, and keyframe
         diamonds all read pixel coords from that box. -->
    <KeyframeTrackRoot
      v-model="keyframes"
      v-model:selected-id="selectedId"
      property="opacity"
      :duration="duration"
      :fps="fps"
      :value-range="[0, 1]"
      class="block w-full touch-none select-none"
    >
      <template #default="{ projection, sampleAt }">
        {{ (sampleFn = sampleAt, '') }}

        <!-- the lane box: keyframes, curve, and segments position against it -->
        <div class="relative h-40 w-full overflow-hidden rounded-card border border-border bg-bg-inset">

        <!-- horizontal value gridlines (0 / 0.5 / 1) -->
        <div class="pointer-events-none absolute inset-0">
          <div
            v-for="v in [0, 0.5, 1]"
            :key="v"
            class="absolute inset-x-0 flex items-center"
            :style="{ top: `${yForValue(v, 160)}px` }"
          >
            <span class="w-full border-t border-dashed border-border" />
            <span class="absolute left-1 -translate-y-1/2 font-mono text-[9px] text-fg-subtle">{{ v }}</span>
          </div>
        </div>

        <!-- the eased value curve across all segments -->
        <svg class="pointer-events-none absolute inset-0 size-full" aria-hidden="true" preserveAspectRatio="none">
          <path
            :d="`${curvePath(projection, sampleAt, 600, 160)} L 600,170 L 0,170 Z`"
            fill="var(--color-accent)"
            fill-opacity="0.08"
          />
          <path
            :d="curvePath(projection, sampleAt, 600, 160)"
            fill="none"
            stroke="var(--color-accent)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>

        <!-- selectable segment bands (click selects the starting keyframe) -->
        <KeyframeTrackSegment
          v-for="kf in keyframes.slice(0, -1)"
          :key="`seg-${kf.id}`"
          :keyframe-id="kf.id"
          class="absolute inset-y-0 cursor-pointer border-l border-border/60 transition-colors hover:bg-fg/[0.03] data-[selected]:bg-accent/8"
        />

        <!-- draggable keyframe diamonds, parked on the curve -->
        <KeyframeTrackKeyframe
          v-for="kf in keyframes"
          :key="kf.id"
          v-slot="{ keyframe, selected, dragging }"
          :keyframe-id="kf.id"
          class="absolute z-10 cursor-grab outline-none active:cursor-grabbing"
          :style="{ top: `${yForValue(kf.value, 160)}px`, transform: 'translate(-50%, -50%)' }"
        >
          <span
            class="block size-3.5 rotate-45 rounded-[2px] border-2 bg-bg shadow-sm transition-transform"
            :class="[
              selected ? 'border-accent scale-125 ring-2 ring-accent/40' : 'border-border-strong',
              dragging ? 'scale-125' : 'hover:scale-110',
            ]"
            :style="selected ? { backgroundColor: 'var(--color-accent)' } : undefined"
          />
          <span class="sr-only">Keyframe at {{ keyframe?.time.toFixed(2) }}s, value {{ keyframe?.value.toFixed(2) }}</span>
        </KeyframeTrackKeyframe>

        <!-- a draggable time probe so the sampled value is live -->
        <input
          v-model.number="probeTime"
          type="range"
          :min="0"
          :max="duration"
          :step="0.02"
          aria-label="Sample time"
          class="absolute inset-x-0 bottom-0 z-20 m-0 h-5 w-full cursor-ew-resize appearance-none bg-transparent"
        >
        <span
          class="pointer-events-none absolute inset-y-0 z-10 w-px bg-fg-muted/60"
          :style="{ left: `${projection(probeTime)}px` }"
        />
        </div>

        <!-- selected-segment easing editor — INSIDE the Root so it receives the
             KeyframeTrack context. Renders only when a keyframe with a
             following segment is selected. -->
        <div class="grid grid-cols-[1fr_auto] gap-4 mt-4">
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="font-medium text-fg-muted">Selected keyframe</span>
          <span v-if="selectedKeyframe" class="font-mono tabular-nums text-fg-subtle">
            {{ selectedKeyframe.time.toFixed(2) }}s · {{ selectedKeyframe.value.toFixed(2) }}
          </span>
        </div>
        <p class="text-xs text-fg-subtle">
          Segment easing:
          <code class="rounded bg-bg-inset px-1 py-0.5 font-mono text-[11px] text-fg-muted">{{ easingLabel(selectedKeyframe?.easing) }}</code>
        </p>
        <p class="text-xs text-fg-subtle">
          Drag the diamonds to move keyframes; drag the bezier handles to retune
          the easing of the selected segment. Arrow keys nudge the focused keyframe.
        </p>
      </div>

      <!-- the easing curve for the selected segment (an embedded CurveEditor).
           The editor measures its OWN box; CurveEditorPoint / CurveEditorHandle
           position themselves in that box's pixel space and are draggable. -->
      <KeyframeTrackEasingEditor
        v-slot="{ anchors, sample }"
        :samples="64"
        class="relative size-28 shrink-0 touch-none select-none overflow-hidden rounded-card border border-border bg-bg-inset"
      >
        <!-- the eased curve, sampled across [0,1] (y flipped for screen coords) -->
        <svg class="pointer-events-none absolute inset-0 size-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1="1" x2="1" y2="0" stroke="var(--color-border-strong)" stroke-width="0.012" stroke-dasharray="0.03 0.03" />
          <polyline
            :points="Array.from({ length: 33 }, (_, i) => {
              const x = i / 32;
              return `${x},${1 - sample(x)}`;
            }).join(' ')"
            fill="none"
            stroke="var(--color-accent)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>

        <!-- draggable bezier tangent handles -->
        <CurveEditorHandle
          v-for="a in anchors"
          :key="`out-${a.id}`"
          :anchor="a"
          side="out"
          class="absolute z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-accent bg-bg outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring"
        />
        <CurveEditorHandle
          v-for="a in anchors"
          :key="`in-${a.id}`"
          :anchor="a"
          side="in"
          class="absolute z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-accent bg-bg outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring"
        />

        <!-- the two pinned (0,0) / (1,1) anchors -->
        <CurveEditorPoint
          v-for="a in anchors"
          :key="a.id"
          :anchor="a"
          class="absolute z-20 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-fg-subtle bg-bg outline-none"
        />
      </KeyframeTrackEasingEditor>
        </div>
      </template>
    </KeyframeTrackRoot>
  </div>
</template>
