<script setup lang="ts">
import { ref } from 'vue';
import { computedEager } from './index';

const password = ref('hunter2');

// All derived synchronously and eagerly on every keystroke — the cached
// values are always fresh, no lazy read required.
const length = computedEager(() => password.value.length);
const hasUpper = computedEager(() => /[A-Z]/.test(password.value));
const hasNumber = computedEager(() => /\d/.test(password.value));
const hasSymbol = computedEager(() => /[^A-Z0-9]/i.test(password.value));

const score = computedEager(() => {
  const checks = [length.value >= 8, hasUpper.value, hasNumber.value, hasSymbol.value];
  return checks.filter(Boolean).length;
});

const label = computedEager(() => ['Empty', 'Weak', 'Fair', 'Good', 'Strong'][score.value]);

const rules = computedEager(() => [
  { ok: length.value >= 8, text: 'At least 8 characters' },
  { ok: hasUpper.value, text: 'An uppercase letter' },
  { ok: hasNumber.value, text: 'A number' },
  { ok: hasSymbol.value, text: 'A symbol' },
]);

const tones = [
  'bg-(--border)',
  'bg-red-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-emerald-500',
];
</script>

<template>
  <div class="w-full max-w-sm flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <label class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)" for="pwd">Password</label>
      <input
        id="pwd"
        v-model="password"
        type="text"
        placeholder="Type a password…"
        class="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)"
      >
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-sm text-(--fg-muted)">Strength</span>
        <span class="font-mono text-sm font-medium tabular-nums text-(--fg)">{{ label }}</span>
      </div>
      <div class="flex gap-1.5">
        <div
          v-for="i in 4"
          :key="i"
          class="h-1.5 flex-1 rounded-full transition-colors duration-300"
          :class="i <= score ? tones[score] : 'bg-(--bg-inset)'"
        />
      </div>
    </div>

    <div class="rounded-xl border border-(--border) bg-(--bg-elevated) p-4 flex flex-col gap-2">
      <div
        v-for="rule in rules"
        :key="rule.text"
        class="flex items-center gap-2 text-sm transition-colors"
        :class="rule.ok ? 'text-(--fg)' : 'text-(--fg-subtle)'"
      >
        <span
          class="grid size-4 place-items-center rounded-full text-[10px] transition-colors"
          :class="rule.ok
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : 'bg-(--bg-inset) text-(--fg-subtle)'"
        >
          {{ rule.ok ? '✓' : '○' }}
        </span>
        {{ rule.text }}
      </div>
    </div>

    <div class="rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums flex items-center justify-between">
      <span class="text-(--fg-muted)">length</span>
      <span>{{ length }}</span>
    </div>
  </div>
</template>
