<script setup lang="ts">defineProps<{
  kind: string;
  size?: 'sm' | 'md';
}>();

// Monochrome instrument badges: the kind reads from the glyph, not a color.
// Components are the one structural exception and carry the accent.
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
      'inline-flex items-center justify-center rounded font-mono font-medium shrink-0 border',
      kind === 'component'
        ? 'border-(--accent-subtle) bg-(--accent-subtle) text-(--accent-text)'
        : 'border-(--border) bg-(--bg-inset) text-(--fg-muted)',
      size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs',
    ]"
    :title="kind"
  >
    {{ kindLabels[kind] ?? '?' }}
  </span>
</template>
