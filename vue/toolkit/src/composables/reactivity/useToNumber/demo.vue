<script setup lang="ts">
import { ref } from 'vue';
import { useToNumber } from './index';

// Source string the user edits — kept as a string so we can demo real parsing.
const source = ref('42.50');

// The composable reads its options once at setup, so each variant below is its
// own instance fed the SAME reactive source. They all recompute as you type.
const asFloat = useToNumber(() => source.value, { method: 'parseFloat' });
const asInt = useToNumber(() => source.value, { method: 'parseInt', radix: 10 });
const safe = useToNumber(() => source.value, { nanToZero: true });
const clamped = useToNumber(() => source.value, { min: 0, max: 100, nanToZero: true });

const variants = [
  { label: 'parseFloat', desc: 'default', value: asFloat },
  { label: 'parseInt', desc: 'radix 10', value: asInt },
  { label: 'nanToZero', desc: 'NaN → 0', value: safe },
  { label: 'clamp 0–100', desc: 'min / max', value: clamped },
];

const presets = ['42.50', '3.14159', '255.9', 'abc', '-12'];
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <label class="flex flex-col gap-1.5">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Source value</span>
      <input
        v-model="source"
        type="text"
        placeholder="Type a number…"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
    </label>

    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="v in presets"
        :key="v"
        type="button"
        class="inline-flex items-center rounded-md border border-(--border) bg-(--bg-inset) px-2 py-0.5 text-xs font-medium text-(--fg-muted) transition hover:bg-(--bg-elevated) hover:border-(--border-strong) cursor-pointer"
        @click="source = v"
      >
        {{ v }}
      </button>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) divide-y divide-(--border)">
      <div
        v-for="variant in variants"
        :key="variant.label"
        class="flex items-center justify-between gap-3 px-4 py-2.5"
      >
        <div class="flex flex-col">
          <span class="font-mono text-sm text-(--fg)">{{ variant.label }}</span>
          <span class="text-xs text-(--fg-subtle)">{{ variant.desc }}</span>
        </div>
        <span
          class="font-mono text-lg font-semibold tabular-nums"
          :class="Number.isNaN(variant.value) ? 'text-amber-600 dark:text-amber-400' : 'text-(--fg)'"
        >
          {{ Number.isNaN(variant.value) ? 'NaN' : variant.value }}
        </span>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle) leading-relaxed">
      One reactive source, four <span class="font-mono text-(--accent-text)">useToNumber</span>
      instances. Try <span class="font-mono text-(--fg-muted)">abc</span> to see how
      <span class="font-mono text-(--fg-muted)">nanToZero</span> and clamping tame invalid input.
    </p>
  </div>
</template>
