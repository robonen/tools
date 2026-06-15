<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { DismissableLayer, PopperContent, PopperRoot, Portal } from '@robonen/primitives';
import { isCollapsed } from '../../model';
import { isMarkActive, toggleMark } from '../../commands';
import { useWritekitContext } from '../context';
import { useEventListener } from '../composables';

export interface WritekitBubbleMenuProps {
  /** Marks shown in the default toolbar (ignored when the default slot is used). */
  marks?: string[];
}

const { marks = ['bold', 'italic', 'underline', 'strike', 'code'] } = defineProps<WritekitBubbleMenuProps>();

const ctx = useWritekitContext();
// Virtual reference (a `Measurable`) anchored to the selection rect — Popper
// positions against it with no trigger element. Reassigned on every refresh so
// PopperContent re-resolves position as the selection moves.
const reference = ref<{ getBoundingClientRect: () => DOMRect } | undefined>();
const open = ref(false);
const rev = ref(0);

function selectionRect(): DOMRect | null {
  const selection = globalThis.window === undefined ? null : globalThis.getSelection();
  if (!selection || selection.rangeCount === 0)
    return null;

  const rect = selection.getRangeAt(0).getBoundingClientRect();
  return rect.width || rect.height ? rect : null;
}

function refresh(): void {
  rev.value += 1;
  const sel = ctx.writekit.state.selection;
  const rect = selectionRect();
  open.value = sel.kind === 'text' && !isCollapsed(sel) && !ctx.composing.value && rect !== null;

  if (open.value)
    reference.value = { getBoundingClientRect: () => selectionRect() ?? new DOMRect() };
}

ctx.writekit.on('transaction', refresh);
useEventListener(() => (typeof document === 'undefined' ? undefined : document), 'selectionchange', refresh);
onBeforeUnmount(() => ctx.writekit.off('transaction', refresh));

function active(type: string): boolean {
  return Boolean(rev.value >= 0 && isMarkActive(ctx.writekit.state, type));
}

function toggle(type: string): void {
  ctx.writekit.command(toggleMark(type));
}
</script>

<template>
  <Portal to="body">
    <PopperRoot>
      <PopperContent
        v-if="open && reference"
        :reference="reference"
        side="top"
        :side-offset="8"
        :collision-padding="8"
      >
        <DismissableLayer
          class="writekit-bubble-menu"
          role="toolbar"
          data-writekit-bubble-menu=""
          @dismiss="open = false"
        >
          <slot :active="active" :toggle="toggle" :writekit="ctx.writekit">
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
        </DismissableLayer>
      </PopperContent>
    </PopperRoot>
  </Portal>
</template>
