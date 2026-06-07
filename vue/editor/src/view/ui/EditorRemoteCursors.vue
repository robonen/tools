<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { RemoteCursor } from '../../crdt';
import { useEditorContext } from '../context';

export interface EditorRemoteCursorsProps {
  cursors: readonly RemoteCursor[];
}

const props = defineProps<EditorRemoteCursorsProps>();
const ctx = useEditorContext();

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface RenderedCursor {
  clientId: string;
  name: string;
  color: string;
  caret: Box | null;
  highlights: Box[];
}

const container = ref<HTMLElement | null>(null);
const rendered = ref<RenderedCursor[]>([]);

function domPoint(blockId: string, offset: number): { node: Node; offset: number } | null {
  const host = ctx.blockElements.get(blockId);
  return host ? ctx.selection.offsetToDomPoint(host, offset) : null;
}

function relativize(rect: DOMRect, base: DOMRect): Box {
  return { top: rect.top - base.top, left: rect.left - base.left, width: rect.width, height: rect.height || 18 };
}

function recompute(): void {
  const root = container.value;
  if (!root || typeof document === 'undefined') {
    rendered.value = [];
    return;
  }

  // Measure against the overlay itself — it is the positioned ancestor the
  // caret/highlight children are laid out in, so coordinates line up exactly.
  const base = root.getBoundingClientRect();
  const next: RenderedCursor[] = [];

  for (const cursor of props.cursors) {
    const selection = cursor.selection;
    if (!selection || selection.kind !== 'text')
      continue;

    const focusPoint = domPoint(selection.focus.blockId, selection.focus.offset);
    if (!focusPoint)
      continue;

    const caretRange = document.createRange();
    caretRange.setStart(focusPoint.node, focusPoint.offset);
    caretRange.collapse(true);
    const caret = relativize(caretRange.getBoundingClientRect(), base);

    const highlights: Box[] = [];
    const anchorPoint = domPoint(selection.anchor.blockId, selection.anchor.offset);
    const collapsed = selection.anchor.blockId === selection.focus.blockId && selection.anchor.offset === selection.focus.offset;

    if (anchorPoint && !collapsed) {
      const range = document.createRange();
      range.setStart(anchorPoint.node, anchorPoint.offset);
      range.setEnd(focusPoint.node, focusPoint.offset);
      if (range.collapsed) {
        // Selection runs backwards (focus before anchor) — swap the ends.
        range.setStart(focusPoint.node, focusPoint.offset);
        range.setEnd(anchorPoint.node, anchorPoint.offset);
      }
      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width > 0)
          highlights.push(relativize(rect, base));
      }
    }

    next.push({
      clientId: cursor.clientId,
      name: cursor.user?.name ?? 'Anon',
      color: cursor.user?.color ?? '#ef4444',
      caret,
      highlights,
    });
  }

  rendered.value = next;
}

function schedule(): void {
  void nextTick(recompute);
}

watch(() => props.cursors, schedule, { deep: true });
ctx.editor.on('transaction', schedule);
onMounted(recompute);
onBeforeUnmount(() => ctx.editor.off('transaction', schedule));
</script>

<template>
  <div ref="container" class="editor-remote-cursors" aria-hidden="true">
    <template v-for="cursor in rendered" :key="cursor.clientId">
      <div
        v-for="(hl, i) in cursor.highlights"
        :key="`${cursor.clientId}-hl-${i}`"
        class="editor-remote-selection"
        :style="{ top: `${hl.top}px`, left: `${hl.left}px`, width: `${hl.width}px`, height: `${hl.height}px`, '--cursor-color': cursor.color }"
      />
      <div
        v-if="cursor.caret"
        class="editor-remote-caret"
        :style="{ top: `${cursor.caret.top}px`, left: `${cursor.caret.left}px`, height: `${cursor.caret.height}px`, '--cursor-color': cursor.color }"
      >
        <span class="editor-remote-caret-label">{{ cursor.name }}</span>
      </div>
    </template>
  </div>
</template>
