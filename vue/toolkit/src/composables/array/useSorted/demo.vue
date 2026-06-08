<script setup lang="ts">
import { ref } from 'vue';
import { useSorted } from './index';

interface Player {
  name: string;
  score: number;
  level: number;
}

const players = ref<Player[]>([
  { name: 'Nova', score: 1840, level: 12 },
  { name: 'Echo', score: 2310, level: 9 },
  { name: 'Pixel', score: 1840, level: 7 },
  { name: 'Drift', score: 990, level: 14 },
  { name: 'Sable', score: 2310, level: 11 },
]);

type SortKey = 'score' | 'level' | 'name';

const sortKey = ref<SortKey>('score');
const descending = ref(true);

// Reactive, stable sorted copy — the source `players` is never mutated.
// Stable ordering means ties (equal score) keep their original relative order.
const sorted = useSorted(players, (a, b) => {
  const direction = descending.value ? -1 : 1;
  if (sortKey.value === 'name')
    return a.name.localeCompare(b.name) * direction;
  return (a[sortKey.value] - b[sortKey.value]) * direction;
});

const keys: { id: SortKey; label: string }[] = [
  { id: 'score', label: 'Score' },
  { id: 'level', label: 'Level' },
  { id: 'name', label: 'Name' },
];
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-4">
    <div class="flex items-center justify-between gap-2">
      <div class="inline-flex rounded-lg border border-(--border) bg-(--bg-elevated) p-0.5">
        <button
          v-for="key in keys"
          :key="key.id"
          class="rounded-md px-3 py-1 text-sm font-medium transition cursor-pointer"
          :class="sortKey === key.id
            ? 'bg-(--accent) text-(--accent-fg)'
            : 'text-(--fg-muted) hover:text-(--fg)'"
          @click="sortKey = key.id"
        >
          {{ key.label }}
        </button>
      </div>
      <button
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="descending = !descending"
      >
        {{ descending ? 'Desc ↓' : 'Asc ↑' }}
      </button>
    </div>

    <ol class="flex flex-col gap-2">
      <li
        v-for="(player, index) in sorted"
        :key="player.name"
        class="flex items-center gap-3 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-2.5"
      >
        <span class="w-6 text-center font-mono text-sm tabular-nums text-(--fg-subtle)">
          {{ index + 1 }}
        </span>
        <span class="flex-1 text-sm font-medium text-(--fg)">{{ player.name }}</span>
        <span class="inline-flex items-center gap-1.5 rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted)">
          Lv {{ player.level }}
        </span>
        <span class="w-16 text-right font-mono text-sm font-semibold tabular-nums text-(--fg)">
          {{ player.score.toLocaleString() }}
        </span>
      </li>
    </ol>

    <p class="text-xs text-(--fg-subtle)">
      Stable sort — players with an equal {{ sortKey }} keep their original order. The source array is left untouched.
    </p>
  </div>
</template>
