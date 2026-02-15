<script setup lang="ts">
defineProps<{
  kind: string;
  size?: 'sm' | 'md';
}>();

const kindColors: Record<string, string> = {
  function: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  class: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  interface: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  type: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  enum: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  variable: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
};

const kindLabels: Record<string, string> = {
  function: 'fn',
  class: 'C',
  interface: 'I',
  type: 'T',
  enum: 'E',
  variable: 'V',
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center justify-center rounded font-mono font-medium shrink-0',
      kindColors[kind] ?? kindColors.variable,
      size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs',
    ]"
    :title="kind"
  >
    {{ kindLabels[kind] ?? '?' }}
  </span>
</template>
