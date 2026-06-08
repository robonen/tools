<script setup lang="ts">defineProps<{
  kind: string;
  size?: 'sm' | 'md';
}>();

const kindColors: Record<string, string> = {
  function: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  class: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  interface: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  type: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  enum: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  variable: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300',
  component: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
  guide: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
};

const kindLabels: Record<string, string> = {
  function: 'fn',
  class: 'C',
  interface: 'I',
  type: 'T',
  enum: 'E',
  variable: 'V',
  component: '◇',
  guide: '¶',
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center justify-center rounded-md font-mono font-semibold shrink-0',
      kindColors[kind] ?? kindColors.variable,
      size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs',
    ]"
    :title="kind"
  >
    {{ kindLabels[kind] ?? '?' }}
  </span>
</template>
