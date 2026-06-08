<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';
import { defineComponent, h, ref, useTemplateRef, watchEffect } from 'vue';
import { useForwardExpose } from './index';

// A headless wrapper: it renders a child <input> but transparently forwards the
// child's $el (and any exposed API) up to whoever holds a ref to the wrapper.
const FieldWrapper = defineComponent({
  name: 'FieldWrapper',
  setup() {
    // forwardRef is bound to the inner element's :ref; currentElement resolves
    // to the underlying HTMLElement, skipping text/comment nodes.
    const { forwardRef, currentElement } = useForwardExpose();

    return () =>
      h('input', {
        ref: forwardRef,
        placeholder: 'Forwarded input',
        // expose the resolved element so the demo can show it changed live
        'data-tag': currentElement.value?.tagName.toLowerCase(),
        class:
          'w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) placeholder:text-(--fg-subtle) transition focus:border-(--accent) focus:outline-none focus:ring-2 focus:ring-(--ring)',
      });
  },
});

// The parent holds a ref to the wrapper — but thanks to useForwardExpose,
// wrapper.$el points straight at the inner <input>.
const field = useTemplateRef<ComponentPublicInstance>('field');
const resolved = ref<{ tag: string; value: string } | null>(null);

watchEffect(() => {
  const el = field.value?.$el as HTMLInputElement | undefined;
  resolved.value = el ? { tag: el.tagName.toLowerCase(), value: el.value } : null;
});

function focusForwarded() {
  // Reaching through the wrapper straight to the real DOM node.
  (field.value?.$el as HTMLInputElement | undefined)?.focus();
}

function fillSample() {
  const el = field.value?.$el as HTMLInputElement | undefined;
  if (el) {
    el.value = 'ada@anthropic.dev';
    resolved.value = { tag: el.tagName.toLowerCase(), value: el.value };
  }
}
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex flex-col gap-3 rounded-xl border border-(--border) bg-(--bg-elevated) p-4">
      <div class="text-xs font-medium uppercase tracking-wide text-(--fg-subtle)">
        Wrapper component
      </div>
      <FieldWrapper ref="field" />
      <p class="text-xs text-(--fg-subtle)">
        <code class="font-mono">&lt;FieldWrapper&gt;</code> renders an inner input, but
        <code class="font-mono">useForwardExpose</code> makes its <code class="font-mono">$el</code>
        resolve to that input.
      </p>
    </div>

    <div class="flex items-center gap-2">
      <button
        class="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-(--accent) px-3 py-1.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-[0.98] cursor-pointer"
        @click="focusForwarded"
      >
        Focus forwarded $el
      </button>
      <button
        class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-(--border) bg-(--bg-elevated) px-3 py-1.5 text-sm font-medium text-(--fg) transition hover:bg-(--bg-inset) hover:border-(--border-strong) active:scale-[0.98] cursor-pointer"
        @click="fillSample"
      >
        Fill sample
      </button>
    </div>

    <div class="flex flex-col gap-2 rounded-lg border border-(--border) bg-(--bg-inset) p-3 font-mono text-sm text-(--fg) tabular-nums">
      <div class="flex items-center justify-between">
        <span class="text-(--fg-subtle)">field.$el</span>
        <span>{{ resolved ? `<${resolved.tag}>` : 'undefined' }}</span>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-(--fg-subtle)">value</span>
        <span class="truncate">{{ resolved?.value || '""' }}</span>
      </div>
    </div>

    <p class="text-xs text-(--fg-subtle)">
      The parent never touches the input directly — it holds a ref to the wrapper, whose
      <code class="font-mono">$el</code> is forwarded to the inner element.
    </p>
  </div>
</template>
