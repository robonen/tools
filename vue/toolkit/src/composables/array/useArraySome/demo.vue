<script setup lang="ts">
import { ref } from 'vue';
import { useArraySome } from './index';

interface Server {
  name: string;
  cpu: number;
}

const servers = ref<Server[]>([
  { name: 'api-west-1', cpu: 32 },
  { name: 'api-east-1', cpu: 54 },
  { name: 'worker-1', cpu: 71 },
  { name: 'db-primary', cpu: 48 },
]);

const threshold = ref(80);

// Reactive Array.prototype.some — true if ANY server is over the threshold.
const hasOverloaded = useArraySome(servers, server => server.cpu > threshold.value);

function load(index: number, delta: number) {
  const next = servers.value.slice();
  next[index] = { ...next[index], cpu: Math.min(100, Math.max(0, next[index].cpu + delta)) };
  servers.value = next;
}
</script>

<template>
  <div class="w-full max-w-md flex flex-col gap-4">
    <div
      class="flex items-center gap-3 rounded-xl border p-4 transition"
      :class="hasOverloaded
        ? 'border-amber-500/30 bg-amber-500/10'
        : 'border-emerald-500/30 bg-emerald-500/10'"
    >
      <span
        class="inline-flex size-2.5 rounded-full"
        :class="hasOverloaded ? 'bg-amber-500' : 'bg-emerald-500'"
      />
      <p class="text-sm font-medium" :class="hasOverloaded ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'">
        {{ hasOverloaded ? 'At least one server is overloaded' : 'All servers within limits' }}
      </p>
    </div>

    <label class="flex items-center justify-between gap-3 text-sm text-(--fg-muted)">
      <span>Alert threshold</span>
      <span class="flex items-center gap-2">
        <input
          v-model.number="threshold"
          type="range"
          min="40"
          max="100"
          class="accent-(--accent)"
        >
        <span class="w-10 text-right font-mono tabular-nums text-(--fg)">{{ threshold }}%</span>
      </span>
    </label>

    <ul class="flex flex-col gap-2">
      <li
        v-for="(server, index) in servers"
        :key="server.name"
        class="rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-2.5"
      >
        <div class="mb-1.5 flex items-center justify-between">
          <span class="font-mono text-sm text-(--fg)">{{ server.name }}</span>
          <span class="flex items-center gap-2">
            <span
              class="font-mono text-sm tabular-nums"
              :class="server.cpu > threshold ? 'text-amber-600 dark:text-amber-400' : 'text-(--fg-muted)'"
            >{{ server.cpu }}%</span>
            <button
              class="inline-flex size-6 items-center justify-center rounded-md border border-(--border) bg-(--bg-elevated) text-(--fg) transition hover:bg-(--bg-inset) active:scale-[0.98] cursor-pointer"
              aria-label="Decrease load"
              @click="load(index, -10)"
            >&minus;</button>
            <button
              class="inline-flex size-6 items-center justify-center rounded-md border border-(--border) bg-(--bg-elevated) text-(--fg) transition hover:bg-(--bg-inset) active:scale-[0.98] cursor-pointer"
              aria-label="Increase load"
              @click="load(index, 10)"
            >+</button>
          </span>
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-(--bg-inset)">
          <div
            class="h-full rounded-full transition-all"
            :class="server.cpu > threshold ? 'bg-amber-500' : 'bg-(--accent)'"
            :style="{ width: `${server.cpu}%` }"
          />
        </div>
      </li>
    </ul>
  </div>
</template>
