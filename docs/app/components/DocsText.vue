<script setup lang="ts">
// Renders a short description with inline markdown (bold / `code` / links /
// {@link}). Content is authored by us (JSDoc), so v-html is safe here.
const props = defineProps<{ text?: string | null }>();

const html = computed(() => renderInline(props.text ?? ''));
</script>

<template>
  <span class="docs-text" v-html="html" />
</template>

<style scoped>
.docs-text :deep(code) {
  font-family: ui-monospace, monospace;
  font-size: 0.9em;
  background: var(--bg-inset);
  border: 1px solid var(--border);
  border-radius: 0.25rem;
  padding: 0.05em 0.3em;
}

.docs-text :deep(a) {
  color: var(--accent-text);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.docs-text :deep(strong) {
  font-weight: 600;
  color: var(--fg);
}
</style>
