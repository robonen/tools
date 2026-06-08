<script setup lang="ts">
import { computed, ref } from 'vue';
import { useCssVar } from './index';

const target = ref<HTMLElement>();

// Read/write live CSS custom properties on the preview box.
const hue = useCssVar('--demo-hue', target, { initialValue: '210' });
const radius = useCssVar('--demo-radius', target, { initialValue: '16' });
const size = useCssVar('--demo-size', target, { initialValue: '96' });

const swatches = ['12', '90', '150', '210', '270', '330'];

const accent = computed(() => `hsl(${hue.value} 80% 55%)`);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div
      ref="target"
      class="flex items-center justify-center rounded-xl border border-(--border) bg-(--bg-inset) p-6"
    >
      <div
        class="shadow-lg transition-all duration-300 ease-out"
        :style="{
          width: 'calc(var(--demo-size) * 1px)',
          height: 'calc(var(--demo-size) * 1px)',
          borderRadius: 'calc(var(--demo-radius) * 1px)',
          background: 'hsl(var(--demo-hue) 80% 55%)',
        }"
      />
    </div>

    <div class="flex flex-col gap-4 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" for="hue">Hue</label>
          <span class="font-mono text-sm tabular-nums text-(--fg)">--demo-hue: {{ hue }}</span>
        </div>
        <input
          id="hue"
          v-model="hue"
          type="range"
          min="0"
          max="360"
          class="w-full accent-(--accent) cursor-pointer"
        >
        <div class="flex gap-1.5">
          <button
            v-for="s in swatches"
            :key="s"
            type="button"
            class="h-6 w-6 rounded-md border border-(--border) transition hover:scale-110 active:scale-95 cursor-pointer"
            :style="{ background: `hsl(${s} 80% 55%)` }"
            :aria-label="`Set hue ${s}`"
            @click="hue = s"
          />
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" for="radius">Radius</label>
          <span class="font-mono text-sm tabular-nums text-(--fg)">--demo-radius: {{ radius }}</span>
        </div>
        <input
          id="radius"
          v-model="radius"
          type="range"
          min="0"
          max="48"
          class="w-full accent-(--accent) cursor-pointer"
        >
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" for="size">Size</label>
          <span class="font-mono text-sm tabular-nums text-(--fg)">--demo-size: {{ size }}</span>
        </div>
        <input
          id="size"
          v-model="size"
          type="range"
          min="48"
          max="140"
          class="w-full accent-(--accent) cursor-pointer"
        >
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
      background: {{ accent }};
    </div>
  </div>
</template>
