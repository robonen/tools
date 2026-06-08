<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { useTemplateRefsList } from './index';

interface Track {
  id: number;
  title: string;
  artist: string;
}

let nextId = 6;
const tracks = ref<Track[]>([
  { id: 1, title: 'Midnight City', artist: 'M83' },
  { id: 2, title: 'Resonance', artist: 'Home' },
  { id: 3, title: 'Nightcall', artist: 'Kavinsky' },
  { id: 4, title: 'Strangers', artist: 'Sigrid' },
  { id: 5, title: 'Open Eye Signal', artist: 'Jon Hopkins' },
]);

// Collect a live, document-ordered array of every rendered row element.
const { refs, set } = useTemplateRefsList<HTMLLIElement>();

const lastMeasured = ref<{ index: number; width: number } | null>(null);

// Reads the freshly collected refs to measure the DOM directly.
function measureLast() {
  const els = refs.value;
  if (els.length === 0)
    return;
  const index = els.length - 1;
  const el = els[index]!;
  lastMeasured.value = { index, width: Math.round(el.getBoundingClientRect().width) };
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function addTrack() {
  const sample = { id: nextId++, title: `Aurora ${nextId}`, artist: 'Synthwave' };
  tracks.value.push(sample);
  // Wait for the update flush so the new element is in `refs`.
  await nextTick();
  measureLast();
}

function removeTrack(id: number) {
  tracks.value = tracks.value.filter(t => t.id !== id);
  lastMeasured.value = null;
}

const collected = computed(() => refs.value.length);
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Playlist</span>
      <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
        {{ collected }} refs collected
      </span>
    </div>

    <ul class="flex flex-col gap-2 max-h-56 overflow-y-auto rounded-xl border border-(--border) bg-(--bg-elevated) p-2">
      <li
        v-for="(track, index) in tracks"
        :key="track.id"
        :ref="set"
        class="group flex items-center gap-3 rounded-lg border border-(--border) bg-(--bg-inset) px-3 py-2 transition"
        :class="lastMeasured?.index === index ? 'border-(--accent) ring-2 ring-(--ring)' : 'hover:border-(--border-strong)'"
      >
        <span class="font-mono text-xs tabular-nums text-(--fg-subtle) w-5 text-right">{{ index + 1 }}</span>
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="truncate text-sm font-medium text-(--fg)">{{ track.title }}</span>
          <span class="truncate text-xs text-(--fg-muted)">{{ track.artist }}</span>
        </span>
        <button
          type="button"
          aria-label="Remove track"
          class="rounded-md px-1.5 py-0.5 text-xs text-(--fg-subtle) opacity-0 transition hover:text-(--fg) group-hover:opacity-100 cursor-pointer"
          @click="removeTrack(track.id)"
        >
          ✕
        </button>
      </li>
      <li v-if="tracks.length === 0" class="px-3 py-6 text-center text-sm text-(--fg-subtle)">
        No tracks — add one to collect a ref.
      </li>
    </ul>

    <div
      v-if="lastMeasured"
      class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums"
    >
      refs[{{ lastMeasured.index }}].width = {{ lastMeasured.width }}px
    </div>
    <p v-else class="text-xs text-(--fg-subtle)">
      Add a track to measure the newest collected element directly from the DOM.
    </p>

    <div class="flex gap-2">
      <button
        type="button"
        class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="addTrack"
      >
        Add track
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
        :disabled="collected === 0"
        @click="measureLast"
      >
        Measure last
      </button>
    </div>
  </div>
</template>
