<script setup lang="ts">defineProps<{
  label: string;
  variant?: 'since' | 'test' | 'demo' | 'wip' | 'neutral';
}>();

const variantClasses: Record<string, string> = {
  since: 'bg-(--bg-inset) text-(--fg-muted) border border-(--border)',
  neutral: 'bg-(--bg-inset) text-(--fg-muted) border border-(--border)',
  test: 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
  demo: 'bg-(--accent-subtle) text-(--accent-text) border border-(--accent-subtle)',
  wip: 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center px-1.5 py-0.5 font-mono text-[10px] font-medium rounded leading-none h-4.5 lowercase',
      variantClasses[variant ?? 'since'],
    ]"
  >
    {{ label }}
  </span>
</template>
