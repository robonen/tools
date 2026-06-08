<script setup lang="ts">
import { ref } from 'vue';
import { useSyncRefs } from './index';

// A single source kept in lock-step with several independent target refs.
const source = ref('#6366f1');

const swatch = ref(source.value);
const label = ref(source.value);
const hex = ref(source.value);

useSyncRefs(source, [swatch, label, hex]);

const presets = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9'];
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">useSyncRefs</span>

    <div class="flex flex-col gap-2">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" for="color">
        Source ref
      </label>
      <div class="flex items-center gap-2">
        <input
          id="color"
          v-model="source"
          type="color"
          class="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-(--border) bg-(--bg)"
        >
        <input
          v-model="source"
          type="text"
          class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 font-mono text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
        >
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">Three independent target refs stay synced to the source:</p>

    <div class="grid grid-cols-3 gap-3">
      <div class="flex flex-col items-center gap-2 rounded-xl border border-(--border) bg-(--bg-elevated) p-3">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">swatch</span>
        <span
          class="size-10 rounded-lg border border-(--border-strong) shadow-sm transition"
          :style="{ backgroundColor: swatch }"
        />
      </div>
      <div class="flex flex-col items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--bg-elevated) p-3">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">label</span>
        <span class="font-mono text-xs text-(--fg)">{{ label }}</span>
      </div>
      <div class="flex flex-col items-center justify-center gap-2 rounded-xl border border-(--border) bg-(--bg-inset) p-3">
        <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">hex</span>
        <span class="font-mono text-xs uppercase text-(--fg)">{{ hex }}</span>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="preset in presets"
        :key="preset"
        type="button"
        class="size-7 rounded-md border border-(--border) transition hover:scale-110 active:scale-95 cursor-pointer"
        :style="{ backgroundColor: preset }"
        :aria-label="`Set source to ${preset}`"
        @click="source = preset"
      />
    </div>
  </div>
</template>
