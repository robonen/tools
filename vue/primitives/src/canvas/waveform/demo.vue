<script setup lang="ts">
import type { WaveformRegionData } from '@robonen/primitives';
import {
  WaveformBars,
  WaveformCursor,
  WaveformRegion,
  WaveformRegionHandle,
  WaveformRoot,
} from '@robonen/primitives';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { HEALING_DURATION, HEALING_PEAKS, HEALING_SRC } from './demo-audio';

// ── Peaks: generated in the browser when possible ───────────────────────────
// The waveform shape is just the max amplitude per slice of the decoded audio.
// `generatePeaks` does exactly that in JS — fetch the bytes, decode them with
// the Web Audio API, and reduce each block to its peak. It works for any
// CORS-enabled audio URL. THIS track sends no CORS header, so the fetch is
// blocked and we fall back to peaks decoded offline (bundled in ./demo-audio).
async function generatePeaks(url: string, count = 800): Promise<{ peaks: number[]; duration: number }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bytes = await res.arrayBuffer();
  const Ctx: typeof AudioContext = window.AudioContext
    ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const buffer = await ctx.decodeAudioData(bytes);
    const data = buffer.getChannelData(0); // first channel is enough for a mono shape
    const block = Math.max(1, Math.floor(data.length / count));
    const peaks = Array.from<number>({ length: count });
    let gmax = 0;
    for (let i = 0; i < count; i++) {
      let m = 0;
      const s = i * block;
      for (let j = 0; j < block; j++) {
        const v = Math.abs(data[s + j] ?? 0);
        if (v > m) m = v;
      }
      peaks[i] = m;
      if (m > gmax) gmax = m;
    }
    return {
      peaks: gmax > 0 ? peaks.map(p => p / gmax) : peaks, // normalize to fill height
      duration: buffer.duration,
    };
  }
  finally {
    void ctx.close();
  }
}

const peaks = ref<readonly number[]>(HEALING_PEAKS); // real peaks, shown instantly
const duration = ref(HEALING_DURATION);
const decoding = ref(false);
const source = ref<'live' | 'bundled'>('bundled');

onMounted(async () => {
  decoding.value = true;
  try {
    const r = await generatePeaks(HEALING_SRC);
    peaks.value = r.peaks;
    duration.value = r.duration;
    source.value = 'live';
  }
  catch {
    source.value = 'bundled'; // CORS/offline → keep the bundled peaks
  }
  finally {
    decoding.value = false;
  }
});

// ── Playback: a plain <audio> element (cross-origin playback needs no CORS) ──
const audio = useTemplateRef<HTMLAudioElement>('audio');
const currentTime = ref(0);
const playing = ref(false);

const regions = ref<WaveformRegionData[]>([
  { id: 'phrase', start: 14, end: 26, label: 'Phrase' },
]);

// Two-way sync: the audio clock drives the cursor during playback (an rAF loop);
// a user scrub writes `currentTime` and we seek the audio. `fromAudio` guards
// the two from fighting.
let raf = 0;
let fromAudio = false;

function frame(): void {
  const el = audio.value;
  if (!el) return;
  fromAudio = true;
  currentTime.value = el.currentTime;
  fromAudio = false;
  if (!el.paused && !el.ended) raf = requestAnimationFrame(frame);
}

watch(currentTime, (t) => {
  const el = audio.value;
  if (!el || fromAudio) return;
  if (Math.abs(el.currentTime - t) > 0.05) el.currentTime = t;
});

function toggle(): void {
  const el = audio.value;
  if (!el) return;
  if (el.paused) void el.play().catch(() => { /* autoplay blocked / offline */ });
  else el.pause();
}
function rewind(): void {
  currentTime.value = 0;
  if (audio.value) audio.value.currentTime = 0;
}
function onPlay(): void {
  playing.value = true;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
}
function onPause(): void {
  playing.value = false;
  cancelAnimationFrame(raf);
}
function onEnded(): void {
  playing.value = false;
  cancelAnimationFrame(raf);
  currentTime.value = 0;
}

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  audio.value?.pause();
});

function fmt(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
}

const progress = computed(() => Math.round((currentTime.value / duration.value) * 100));
</script>

<template>
  <div class="demo-card w-full max-w-lg space-y-4 bg-bg p-6 text-fg">
    <div class="flex items-baseline justify-between text-sm">
      <div class="min-w-0">
        <span class="font-medium">Healing 01</span>
        <span class="ml-2 font-mono text-[11px] text-fg-subtle">
          {{ decoding ? 'decoding…' : source === 'live' ? 'peaks decoded in-browser' : 'bundled peaks (no CORS)' }}
        </span>
      </div>
      <span class="font-mono tabular-nums text-fg-muted">
        {{ fmt(currentTime) }} / {{ fmt(duration) }}
      </span>
    </div>

    <!-- The Root measures its own width; the fixed height gives the bars (sized
         as a % of their container) and the absolute cursor something to fill. -->
    <WaveformRoot
      v-model:current-time="currentTime"
      v-model:regions="regions"
      :peaks="peaks"
      peaks-range="0..1"
      :duration="duration"
      :bar-width="2"
      :bar-gap="1"
      class="relative h-28 w-full cursor-pointer touch-none select-none overflow-hidden rounded-card border border-border bg-bg-inset"
    >
      <!-- Amplitude bars. WaveformBars hardcodes `position: relative`, so it must
           be SIZED (size-full) rather than positioned `absolute inset-0` — an
           inline style can't be overridden by a class, and an auto-height
           container would collapse its percentage-height bars to 0. -->
      <WaveformBars
        class="pointer-events-none size-full [&_[data-waveform-bar]]:rounded-full [&_[data-waveform-bar]]:bg-fg-subtle"
      />

      <!-- Played-portion tint, over the bars, clipped to the cursor position. -->
      <div
        class="pointer-events-none absolute inset-y-0 left-0 z-0 bg-accent/15"
        :style="{ width: `${progress}%` }"
      />

      <!-- Region: a labelled selection with two draggable trim handles. -->
      <WaveformRegion
        v-for="r in regions"
        :key="r.id"
        v-slot="{ start, end }"
        :region-id="r.id"
        class="z-10 border-x border-accent bg-accent/15 outline-none transition-colors focus-visible:bg-accent/25 data-[selected]:bg-accent/25"
      >
        <span class="absolute -top-px left-1 truncate text-[10px] font-medium text-accent-text/90">
          {{ r.label }}
        </span>
        <WaveformRegionHandle
          edge="start"
          aria-label="Region start"
          class="absolute inset-y-0 left-0 z-20 w-2 -translate-x-1/2 cursor-ew-resize outline-none before:absolute before:inset-y-2 before:left-1/2 before:w-0.5 before:-translate-x-1/2 before:rounded-full before:bg-accent focus-visible:before:ring-2 focus-visible:before:ring-ring"
        />
        <WaveformRegionHandle
          edge="end"
          aria-label="Region end"
          class="absolute inset-y-0 right-0 z-20 w-2 translate-x-1/2 cursor-ew-resize outline-none before:absolute before:inset-y-2 before:left-1/2 before:w-0.5 before:-translate-x-1/2 before:rounded-full before:bg-accent focus-visible:before:ring-2 focus-visible:before:ring-ring"
        />
        <span class="sr-only">{{ fmt(start) }} to {{ fmt(end) }}</span>
      </WaveformRegion>

      <!-- Playback cursor (draggable + keyboard seekable). -->
      <WaveformCursor
        aria-label="Playback position"
        class="absolute inset-y-0 z-30 w-px -translate-x-1/2 cursor-ew-resize bg-accent outline-none after:absolute after:left-1/2 after:top-0 after:h-3 after:w-3 after:-translate-x-1/2 after:rounded-full after:border-2 after:border-accent after:bg-bg after:shadow-sm focus-visible:after:ring-2 focus-visible:after:ring-ring"
      />
    </WaveformRoot>

    <!-- Transport row. -->
    <div class="flex items-center gap-3 text-sm">
      <button
        type="button"
        :aria-label="playing ? 'Pause' : 'Play'"
        class="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-fg outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        @click="toggle"
      >
        <svg v-if="playing" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
        </svg>
      </button>

      <button
        type="button"
        class="rounded-md bg-bg-inset px-3 py-1.5 text-xs font-medium text-fg-muted outline-none transition hover:text-fg focus-visible:ring-2 focus-visible:ring-ring"
        @click="rewind"
      >
        Rewind
      </button>

      <div class="relative h-1.5 flex-1 overflow-hidden rounded-full bg-bg-inset">
        <div class="absolute inset-y-0 left-0 rounded-full bg-accent" :style="{ width: `${progress}%` }" />
      </div>
      <span class="w-10 text-right font-mono text-xs tabular-nums text-fg-muted">{{ progress }}%</span>
    </div>

    <p class="text-xs text-fg-subtle">
      Peaks are generated in-browser (Web Audio decode) when the source allows
      CORS; this track doesn't, so it falls back to peaks decoded offline. The
      audio streams from sousound.com on play — click or drag to scrub.
    </p>

    <!-- Plain <audio> (no `crossorigin`): cross-origin playback needs no CORS,
         and `preload="none"` keeps the 1.4 MB track off the wire until play. -->
    <audio
      ref="audio"
      :src="HEALING_SRC"
      preload="none"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
    />
  </div>
</template>
