<script setup lang="ts">
import { computed, ref } from 'vue';
import { useToString } from './index';

// A handful of representative source types — useToString coerces each with String().
const count = ref(7);
const ratio = ref(0.5);
const enabled = ref(true);
const tags = ref(['vue', 'reactivity', 'docs']);
const meta = computed(() => ({ id: count.value, ok: enabled.value }));

// useToString returns a ComputedRef<string> — bind directly, never destructure.
const countStr = useToString(count);
const ratioStr = useToString(() => ratio.value.toFixed(2));
const boolStr = useToString(enabled);
const tagsStr = useToString(tags);
const metaStr = useToString(meta);

const rows = [
  { type: 'number', value: countStr },
  { type: 'getter', value: ratioStr },
  { type: 'boolean', value: boolStr },
  { type: 'array', value: tagsStr },
  { type: 'object', value: metaStr },
];
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-3">
      <span class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">Live source values</span>

      <div class="flex items-center justify-between gap-3">
        <label class="text-sm text-(--fg)">count</label>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-(--border) bg-(--bg-elevated) text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
            @click="count--"
          >−</button>
          <span class="font-mono text-sm tabular-nums text-(--fg) w-6 text-center">{{ count }}</span>
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-(--border) bg-(--bg-elevated) text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
            @click="count++"
          >+</button>
        </div>
      </div>

      <div class="flex items-center justify-between gap-3">
        <label class="text-sm text-(--fg)" for="ratio">ratio</label>
        <input id="ratio" v-model.number="ratio" type="range" min="0" max="1" step="0.01" class="accent-(--accent) cursor-pointer">
      </div>

      <label class="flex items-center justify-between gap-3 cursor-pointer">
        <span class="text-sm text-(--fg)">enabled</span>
        <input v-model="enabled" type="checkbox" class="size-4 accent-(--accent) cursor-pointer">
      </label>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) divide-y divide-(--border) font-mono text-sm">
      <div
        v-for="row in rows"
        :key="row.type"
        class="flex items-center gap-3 px-3 py-2"
      >
        <span class="inline-flex items-center rounded-md border border-(--border) bg-(--bg-elevated) px-2 py-0.5 text-xs font-medium text-(--fg-muted) shrink-0">
          {{ row.type }}
        </span>
        <span class="text-(--fg) truncate">"{{ row.value }}"</span>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle) leading-relaxed">
      <span class="font-mono text-(--accent-text)">useToString</span> is
      <span class="font-mono text-(--fg-muted)">computed(() =&gt; String(toValue(v)))</span> —
      it stringifies refs, getters, and reactive objects alike.
    </p>
  </div>
</template>
