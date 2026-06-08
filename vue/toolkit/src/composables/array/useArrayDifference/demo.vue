<script setup lang="ts">
import { ref } from 'vue';
import { useArrayDifference } from './index';

interface Track {
  id: number;
  title: string;
}

const library: Track[] = [
  { id: 1, title: 'Midnight City' },
  { id: 2, title: 'Strobe' },
  { id: 3, title: 'Open Eye Signal' },
  { id: 4, title: 'Innerbloom' },
  { id: 5, title: 'Teardrop' },
  { id: 6, title: 'Resonance' },
];

const list = ref<Track[]>([...library]);
const playlist = ref<Track[]>([library[1], library[3]]);
const symmetric = ref(false);

// Compare tracks by their `id` key.
const diff = useArrayDifference(list, playlist, 'id', {
  get symmetric() {
    return symmetric.value;
  },
});

function inPlaylist(track: Track) {
  return playlist.value.some(t => t.id === track.id);
}

function toggle(track: Track) {
  if (inPlaylist(track))
    playlist.value = playlist.value.filter(t => t.id !== track.id);
  else
    playlist.value = [...playlist.value, track];
}
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Library — tap to add / remove from playlist
      </span>
      <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-(--fg-muted)">
        <input
          v-model="symmetric"
          type="checkbox"
          class="size-4 cursor-pointer accent-(--accent)"
        >
        Symmetric
      </label>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="track in library"
        :key="track.id"
        class="inline-flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition active:scale-[0.98] cursor-pointer"
        :class="inPlaylist(track)
          ? 'border-transparent bg-(--accent) text-(--accent-fg) hover:bg-(--accent-hover)'
          : 'border-(--border) bg-(--bg-elevated) text-(--fg) hover:bg-(--bg-inset) hover:border-(--border-strong)'"
        @click="toggle(track)"
      >
        <span class="truncate">{{ track.title }}</span>
        <span class="shrink-0 text-xs opacity-70">{{ inPlaylist(track) ? '−' : '+' }}</span>
      </button>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex items-baseline justify-between">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
          {{ symmetric ? 'In exactly one (XOR)' : 'Not in playlist' }}
        </span>
        <span class="font-mono text-sm tabular-nums text-(--fg-muted)">
          {{ diff.length }}
        </span>
      </div>

      <ul v-if="diff.length" class="mt-3 flex flex-wrap gap-2">
        <li
          v-for="track in diff"
          :key="track.id"
          class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)"
        >
          {{ track.title }}
        </li>
      </ul>
      <p v-else class="mt-3 text-sm text-(--fg-subtle)">
        No difference — every track matches.
      </p>
    </div>
  </div>
</template>
