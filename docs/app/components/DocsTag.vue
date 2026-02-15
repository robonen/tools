<script setup lang="ts">
defineProps<{
  label: string;
  variant?: 'since' | 'test' | 'demo' | 'wip';
}>();

const variantClasses: Record<string, string> = {
  since: 'bg-(--color-bg-mute) text-(--color-text-mute)',
  test: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  demo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  wip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
      variantClasses[variant ?? 'since'],
    ]"
  >
    {{ label }}
  </span>
</template>
