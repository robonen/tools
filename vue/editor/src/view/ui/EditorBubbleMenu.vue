<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue';
import { isCollapsed } from '../../model';
import { isMarkActive, toggleMark } from '../../commands';
import { useEditorContext } from '../context';
import { useEventListener } from '../composables';

export interface EditorBubbleMenuProps {
  /** Marks shown in the default toolbar (ignored when the default slot is used). */
  marks?: string[];
}

const { marks = ['bold', 'italic', 'underline', 'strike', 'code'] } = defineProps<EditorBubbleMenuProps>();

const ctx = useEditorContext();
const reference = ref<{ getBoundingClientRect: () => DOMRect } | null>(null);
const floatingEl = ref<HTMLElement | null>(null);
const open = ref(false);
const rev = ref(0);

const { floatingStyles, update } = useFloating(reference, floatingEl, {
  placement: 'top',
  middleware: [offset(8), flip(), shift({ padding: 8 })],
  whileElementsMounted: autoUpdate,
});

function selectionRect(): DOMRect | null {
  const selection = globalThis.window === undefined ? null : globalThis.getSelection();
  if (!selection || selection.rangeCount === 0)
    return null;

  const rect = selection.getRangeAt(0).getBoundingClientRect();
  return rect.width || rect.height ? rect : null;
}

function refresh(): void {
  rev.value += 1;
  const sel = ctx.editor.state.selection;
  const rect = selectionRect();
  open.value = sel.kind === 'text' && !isCollapsed(sel) && !ctx.composing.value && rect !== null;

  if (open.value) {
    reference.value = { getBoundingClientRect: () => selectionRect() ?? new DOMRect() };
    void update();
  }
}

ctx.editor.on('transaction', refresh);
useEventListener(() => (typeof document === 'undefined' ? undefined : document), 'selectionchange', refresh);
onBeforeUnmount(() => ctx.editor.off('transaction', refresh));

function active(type: string): boolean {
  return Boolean(rev.value >= 0 && isMarkActive(ctx.editor.state, type));
}

function toggle(type: string): void {
  ctx.editor.command(toggleMark(type));
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="floatingEl"
      :style="floatingStyles"
      class="editor-bubble-menu"
      role="toolbar"
      data-editor-bubble-menu=""
    >
      <slot :active="active" :toggle="toggle" :editor="ctx.editor">
        <button
          v-for="mark in marks"
          :key="mark"
          type="button"
          :data-mark="mark"
          :data-active="active(mark) || undefined"
          @mousedown.prevent="toggle(mark)"
        >
          {{ mark }}
        </button>
      </slot>
    </div>
  </Teleport>
</template>
