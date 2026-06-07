<script setup lang="ts">defineProps<{
  label: string;
  variant?: 'since' | 'test' | 'demo' | 'wip' | 'neutral';
}>();

const variantClasses: Record<string, string> = {
  since: 'bg-(--bg-inset) text-(--fg-muted) border border-(--border)',
  neutral: 'bg-(--bg-inset) text-(--fg-muted) border border-(--border)',
  test: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
  demo: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
  wip: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full leading-none h-5',
      variantClasses[variant ?? 'since'],
    ]"
  >
    {{ label }}
  </span>
</template>
