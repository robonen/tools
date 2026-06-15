<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { unrefElement } from './index';

const boxRef = useTemplateRef<HTMLElement>('box');
const width = ref(280);
const tag = ref('—');
const rect = ref<{ w: number; h: number } | null>(null);

function measure() {
  // unrefElement turns the template ref into the raw DOM element, regardless of
  // whether it points at an HTMLElement or a component instance.
  const el = unrefElement(boxRef);
  if (!el)
    return;

  tag.value = el.tagName.toLowerCase();
  const { width: w, height: h } = el.getBoundingClientRect();
  rect.value = { w: Math.round(w), h: Math.round(h) };
}
</script>

<template>
  <div class="demo-stack max-w-sm">
    <div
      ref="box"
      class="flex items-center justify-center rounded-xl border border-dashed border-border-strong bg-bg-inset py-8 text-sm font-medium text-fg-muted transition-[width] duration-300 ease-out"
      :style="{ width: `${width}px` }"
    >
      Target element
    </div>

    <label class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between">
        <span class="demo-label">Width</span>
        <span class="font-mono text-sm tabular-nums text-fg-muted">{{ width }}px</span>
      </div>
      <input
        v-model.number="width"
        type="range"
        min="120"
        max="340"
        class="w-full accent-accent"
      >
    </label>

    <button
      class="demo-btn-primary"
      @click="measure"
    >
      Read element via unrefElement
    </button>

    <div class="flex flex-col gap-2 rounded-lg border border-border bg-bg-inset p-3 font-mono text-sm text-fg tabular-nums">
      <div class="flex items-center justify-between">
        <span class="text-fg-subtle">tagName</span>
        <span>{{ tag }}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-fg-subtle">boundingRect</span>
        <span>{{ rect ? `${rect.w} × ${rect.h}` : '—' }}</span>
      </div>
    </div>

    <p class="text-xs text-fg-subtle">
      Resize the box, then measure. <code class="font-mono">unrefElement</code> unwraps the template
      ref to the real DOM node — it also resolves a component ref to its <code class="font-mono">$el</code>.
    </p>
  </div>
</template>
