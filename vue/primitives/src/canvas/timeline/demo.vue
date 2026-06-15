<script setup lang="ts">
import type {
  TimelineClipData,
  TimelineMarkerData,
  TimelineTrackData,
} from '@robonen/primitives';
import {
  TimelineClip,
  TimelineClipHandle,
  TimelineMarker,
  TimelinePlayhead,
  TimelineRoot,
  TimelineRuler,
  TimelineSelection,
  TimelineTrack,
  TimelineTrackHeader,
  TimelineTracks,
} from '@robonen/primitives';
import { computed, ref } from 'vue';

// ── seed data ────────────────────────────────────────────────────────────────
const tracks = ref<TimelineTrackData[]>([
  { id: 'video', label: 'Video', kind: 'video', height: 64 },
  { id: 'overlay', label: 'Overlay', kind: 'video', height: 56 },
  { id: 'audio', label: 'Audio', kind: 'audio', height: 52 },
]);

const clips = ref<TimelineClipData[]>([
  { id: 'intro', trackId: 'video', start: 0, duration: 3.2, label: 'Intro', color: 'var(--color-accent)' },
  { id: 'b-roll', trackId: 'video', start: 3.6, duration: 4, label: 'B-roll', color: '#0ea5e9' },
  { id: 'outro', trackId: 'video', start: 8.2, duration: 2.4, label: 'Outro', color: 'var(--color-accent)', locked: true },
  { id: 'title', trackId: 'overlay', start: 1, duration: 2.5, label: 'Title card', color: '#8b5cf6' },
  { id: 'lower-third', trackId: 'overlay', start: 5.5, duration: 2.2, label: 'Lower third', color: '#ec4899' },
  { id: 'music', trackId: 'audio', start: 0, duration: 7.8, label: 'Music bed', color: '#10b981' },
  { id: 'vo', trackId: 'audio', start: 8.4, duration: 2.1, label: 'Voiceover', color: '#f59e0b' },
]);

const markers = ref<TimelineMarkerData[]>([
  { id: 'm-cut', time: 3.6, label: 'Cut', color: '#f43f5e' },
  { id: 'm-beat', time: 7, label: 'Beat drop', color: '#f59e0b' },
]);

const currentTime = ref(2.4);
const pxPerSecond = ref(90);
const selectedClipIds = ref<string[]>(['b-roll']);

const fps = 30;

// ── live readout ─────────────────────────────────────────────────────────────
const root = ref<InstanceType<typeof TimelineRoot> | null>(null);

function timecode(seconds: number): string {
  const f = Math.max(0, Math.round(seconds * fps));
  const frames = f % fps;
  const totalSeconds = Math.floor(f / fps);
  const secs = totalSeconds % 60;
  const mins = Math.floor(totalSeconds / 60) % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}:${pad(frames)}`;
}

const selectedClip = computed(() => clips.value.find(c => selectedClipIds.value.includes(c.id)));

function fitZoom(): void {
  pxPerSecond.value = pxPerSecond.value >= 90 ? 50 : 120;
}

function splitSelected(): void {
  const clip = selectedClip.value;
  if (!clip) return;
  root.value?.splitClip(clip.id, currentTime.value);
}
</script>

<template>
  <div class="demo-card w-full overflow-hidden rounded-card border border-border bg-bg text-fg shadow-(--shadow-card)">
    <TimelineRoot
      ref="root"
      v-model:tracks="tracks"
      v-model:clips="clips"
      v-model:markers="markers"
      v-model:current-time="currentTime"
      v-model:px-per-second="pxPerSecond"
      v-model:selected-clip-ids="selectedClipIds"
      :fps="fps"
      :track-height="60"
      class="flex flex-col"
    >
      <!-- ── transport bar ──────────────────────────────────────────────── -->
      <div class="flex items-center gap-3 border-b border-border bg-bg-elevated px-3 py-2">
        <div class="flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-red-500" />
          <span class="text-xs font-semibold uppercase tracking-wide text-fg-muted">Sequence 01</span>
        </div>

        <div class="ml-1 flex items-center rounded-md border border-border bg-bg px-2.5 py-1 font-mono text-sm tabular-nums text-fg">
          {{ timecode(currentTime) }}
        </div>

        <div class="ml-auto flex items-center gap-2 text-xs">
          <button
            type="button"
            class="rounded-md border border-border bg-bg px-2.5 py-1 font-medium text-fg-muted outline-none transition focus-visible:ring-2 focus-visible:ring-ring hover:bg-bg-inset hover:text-fg disabled:opacity-40"
            :disabled="!selectedClip || selectedClip.locked"
            @click="splitSelected()"
          >
            Split at playhead
          </button>
          <button
            type="button"
            class="rounded-md border border-border bg-bg px-2.5 py-1 font-medium text-fg-muted outline-none transition focus-visible:ring-2 focus-visible:ring-ring hover:bg-bg-inset hover:text-fg"
            @click="fitZoom()"
          >
            Zoom {{ pxPerSecond }}px/s
          </button>
        </div>
      </div>

      <!-- ── editor body: gutter column + scale column ──────────────────── -->
      <div class="flex">
        <!-- track-header gutter -->
        <div class="w-40 shrink-0 border-r border-border bg-bg-inset">
          <!-- spacer aligning with the ruler row -->
          <div class="h-8 border-b border-border" />
          <TimelineTrack
            v-for="track in tracks"
            :key="track.id"
            :track-id="track.id"
            class="border-b border-border last:border-b-0"
          >
            <template #default="{ height }">
              <TimelineTrackHeader
                v-slot="{ label, muted, locked, soloed, toggleMute, toggleLock, toggleSolo, setResizeRef }"
                class="relative flex h-full flex-col justify-center gap-1 px-3"
                :style="{ height: `${height}px` }"
              >
                <span class="truncate text-sm font-medium text-fg">{{ label }}</span>

                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="track-flag-btn"
                    :class="muted ? 'is-active' : ''"
                    :aria-pressed="muted"
                    @click="toggleMute()"
                  >M</button>
                  <button
                    type="button"
                    class="track-flag-btn"
                    :class="soloed ? 'is-active' : ''"
                    :aria-pressed="soloed"
                    @click="toggleSolo()"
                  >S</button>
                  <button
                    type="button"
                    class="track-flag-btn"
                    :class="locked ? 'is-active' : ''"
                    :aria-pressed="locked"
                    @click="toggleLock()"
                  >L</button>
                </div>

                <!-- drag-to-resize the lane height -->
                <span
                  :ref="setResizeRef"
                  class="absolute inset-x-0 -bottom-1 h-2 cursor-ns-resize"
                  aria-hidden="true"
                />
              </TimelineTrackHeader>
            </template>
          </TimelineTrack>
        </div>

        <!-- scale column: ruler + lanes share ONE coordinate origin -->
        <div class="relative min-w-0 flex-1 overflow-hidden bg-bg">
          <!-- time ruler -->
          <TimelineRuler
            v-slot="{ ticks }"
            mode="timecode"
            class="relative h-8 cursor-ew-resize border-b border-border bg-bg-elevated select-none"
          >
            <div
              v-for="tick in ticks"
              :key="tick.value"
              class="pointer-events-none absolute bottom-0 flex flex-col items-start"
              :style="{ left: `${tick.px}px` }"
            >
              <span
                class="w-px bg-border-strong"
                :class="tick.major ? 'h-3' : 'h-1.5'"
              />
              <span
                v-if="tick.major"
                class="absolute -top-5 left-0 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] tabular-nums text-fg-subtle"
              >{{ tick.label }}</span>
            </div>
          </TimelineRuler>

          <!-- lanes viewport (the scale's range origin lives here) -->
          <TimelineTracks v-slot="{ marquee }" class="relative">
            <TimelineTrack
              v-for="track in tracks"
              :key="track.id"
              :track-id="track.id"
              class="relative border-b border-border last:border-b-0"
              :class="track.kind === 'audio' ? 'bg-bg-inset/60' : ''"
            >
              <!-- clips on this lane. State is read off the component's own
                   data-attributes (data-selected / data-dragging / data-locked)
                   via CSS variants, so styling stays decoupled from slot props. -->
              <template v-for="clip in clips" :key="clip.id">
                <TimelineClip
                  v-if="clip.trackId === track.id"
                  v-slot="{ clip: c }"
                  :clip-id="clip.id"
                  class="timeline-clip group absolute inset-y-1 cursor-grab touch-none overflow-hidden rounded-md border border-border-strong shadow-sm outline-none transition-shadow active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring data-[dragging]:shadow-lg data-[locked]:cursor-not-allowed data-[selected]:z-10 data-[selected]:border-accent data-[selected]:ring-2 data-[selected]:ring-accent/50"
                  :style="{ background: `color-mix(in oklch, ${clip.color ?? 'var(--color-accent)'} 22%, var(--color-bg))` }"
                >
                  <!-- accent spine -->
                  <span
                    class="absolute inset-y-0 left-0 w-1"
                    :style="{ backgroundColor: clip.color ?? 'var(--color-accent)' }"
                  />

                  <div class="flex h-full flex-col justify-center gap-0.5 pl-2.5 pr-2">
                    <span class="flex items-center gap-1 truncate text-xs font-semibold text-fg">
                      <svg v-if="clip.locked" viewBox="0 0 24 24" class="size-3 shrink-0 text-fg-muted" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                      {{ c?.label }}
                    </span>
                    <span class="truncate font-mono text-[10px] tabular-nums text-fg-subtle">{{ timecode(c?.duration ?? 0) }}</span>
                  </div>

                  <!-- waveform-ish hint for audio clips -->
                  <span
                    v-if="track.kind === 'audio'"
                    class="pointer-events-none absolute inset-x-2 bottom-1 flex h-3 items-end gap-px opacity-50"
                  >
                    <span
                      v-for="n in 28"
                      :key="n"
                      class="flex-1 rounded-sm"
                      :style="{ height: `${30 + Math.abs(Math.sin(n * 1.3)) * 70}%`, backgroundColor: clip.color ?? 'var(--color-accent)' }"
                    />
                  </span>

                  <!-- trim handles (revealed on hover, or when the clip is selected) -->
                  <template v-if="!clip.locked">
                    <TimelineClipHandle side="start" class="trim-handle left-0" />
                    <TimelineClipHandle side="end" class="trim-handle right-0" />
                  </template>
                </TimelineClip>
              </template>
            </TimelineTrack>

            <!-- markers (chapter pins) span the full lane stack -->
            <TimelineMarker
              v-for="marker in markers"
              :key="marker.id"
              v-slot="{ marker: m }"
              :marker-id="marker.id"
              as="button"
              class="absolute z-20 flex -translate-x-1/2 flex-col items-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style="top: 0; bottom: 0"
            >
              <span
                class="flex items-center gap-1 rounded-b-sm px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm"
                :style="{ backgroundColor: m?.color ?? 'var(--color-accent)' }"
              >{{ m?.label }}</span>
              <span class="w-px flex-1" :style="{ backgroundColor: m?.color ?? 'var(--color-accent)' }" />
            </TimelineMarker>

            <!-- playhead -->
            <TimelinePlayhead
              v-slot="{ currentTime: t }"
              class="z-30 cursor-ew-resize outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style="bottom: 0"
            >
              <span class="absolute -left-1.5 -top-0.5 size-3 rounded-sm bg-red-500 shadow-sm" />
              <span class="absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-red-500" />
              <span class="sr-only">{{ timecode(t) }}</span>
            </TimelinePlayhead>

            <!-- marquee selection overlay -->
            <TimelineSelection
              v-if="marquee"
              class="z-40 rounded-sm border border-accent bg-accent/15"
            />
          </TimelineTracks>
        </div>
      </div>

      <!-- ── status bar ─────────────────────────────────────────────────── -->
      <div class="flex items-center gap-4 border-t border-border bg-bg-elevated px-3 py-1.5 text-[11px] text-fg-subtle">
        <span>{{ tracks.length }} tracks</span>
        <span>{{ clips.length }} clips</span>
        <span class="flex items-center gap-1">
          <span class="size-1.5 rounded-full bg-accent" />
          {{ selectedClip ? selectedClip.label : 'No' }} selected
        </span>
        <span class="ml-auto">Drag clips to move · drag edges to trim · drag the ruler to scrub</span>
      </div>
    </TimelineRoot>
  </div>
</template>

<style scoped>
.track-flag-btn {
  display: grid;
  place-items: center;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 0.25rem;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: var(--color-fg-subtle, #94a3b8);
  background: var(--color-bg, #fff);
  border: 1px solid var(--color-border, #e2e8f0);
  cursor: pointer;
  transition: all 0.12s;
}
.track-flag-btn:hover {
  color: var(--color-fg, #0f172a);
}
.track-flag-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-ring, #6366f1);
}
.track-flag-btn.is-active {
  color: #fff;
  background: var(--color-accent, #6366f1);
  border-color: var(--color-accent, #6366f1);
}

.trim-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  z-index: 5;
  opacity: 0;
  transition: opacity 0.12s;
  touch-action: none;
}
.timeline-clip:hover .trim-handle,
.timeline-clip[data-selected] .trim-handle,
.trim-handle:focus-visible {
  opacity: 1;
}
.trim-handle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 40%;
  transform: translate(-50%, -50%);
  border-radius: 9999px;
  background: var(--color-fg, #0f172a);
  opacity: 0.5;
}
.trim-handle:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--color-ring, #6366f1);
  border-radius: 4px;
}
</style>
