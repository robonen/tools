<script lang="ts">
/** Regexp-special characters, escaped when the trigger is interpolated. */
const ESCAPE_RE = /[.*+?^${}()|[\]\\]/g;

/** The caret's client rect, when the native selection has a visible one. */
function caretRect(): DOMRect | null {
  const selection = globalThis.window === undefined ? null : globalThis.getSelection();
  if (!selection || selection.rangeCount === 0)
    return null;

  const range = selection.getRangeAt(0);
  const rects = range.getClientRects();
  const rect = rects.length > 0 ? rects[0]! : range.getBoundingClientRect();
  return rect.width || rect.height ? rect : null;
}
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, useTemplateRef, watch } from 'vue';
import { DismissableLayer, PopperContent, PopperRoot, Portal } from '@robonen/primitives';
import { blockById, caret, createNode, inlineText, isCollapsed, nodeInline, nodeSelection } from '../../model';
import { createTransaction } from '../../state';
import { useWritekitContext } from '../context';
import { unrefElement, useEventListener } from '../composables';
import type { SlashItem } from './slash-items';
import { getSlashItems } from './slash-items';

export interface WritekitSlashMenuProps {
  /** Character that opens the menu (default `'/'`). */
  trigger?: string;
}

const { trigger = '/' } = defineProps<WritekitSlashMenuProps>();

/**
 * Optional detail pane beside the list. Headless: the menu only knows WHICH
 * item is highlighted; what a block looks like is the app's knowledge, so the
 * pane renders the `preview` slot when given one and plain `meta.description`
 * text otherwise. No slot and no description → no pane, same menu as before.
 */
const slots = defineSlots<{
  preview?: (props: { item: SlashItem }) => unknown;
}>();

const ctx = useWritekitContext();
const open = ref(false);
const items = shallowRef<SlashItem[]>([]);
const highlighted = ref(0);
// Virtual reference (a `Measurable`) anchored to the caret rect; Popper positions
// against it with no trigger element. Focus stays in the contenteditable (so the
// user keeps typing to filter), so nav is driven by the capture-phase keydown
// below and the highlight is an index — not roving focus / listbox focus.
const reference = shallowRef<{ getBoundingClientRect: () => DOMRect } | undefined>();

// vue ≥3.5: a template ref inside v-for collects the elements in source order.
const layer = useTemplateRef<InstanceType<typeof DismissableLayer>>('layer');
const itemRefs = useTemplateRef<HTMLButtonElement[]>('options');
const layerEl = computed(() => unrefElement(layer.value));

const active = computed<SlashItem | undefined>(() => items.value[highlighted.value]);
const hasPreview = computed(() => slots.preview !== undefined || active.value?.description !== undefined);

/** `(start or whitespace) + trigger + query` immediately before the caret. */
const matcher = computed(() =>
  new RegExp(`(?:^|\\s)${trigger.replaceAll(ESCAPE_RE, '\\$&')}([\\p{L}\\p{N}]*)$`, 'u'));

let triggerBlockId = '';
let triggerStart = 0;
let caretOffset = 0;

function close(): void {
  open.value = false;
}

function refresh(): void {
  const sel = ctx.writekit.state.selection;

  if (sel.kind !== 'text' || !isCollapsed(sel) || ctx.composing.value) {
    close();
    return;
  }

  const block = blockById(ctx.writekit.state.doc, sel.focus.blockId);
  const spec = block && ctx.writekit.state.schema.nodeSpec(block.type);

  if (!block || spec?.content.kind !== 'text' || spec.code) {
    close();
    return;
  }

  const before = inlineText(nodeInline(block)).slice(0, sel.focus.offset);
  const match = matcher.value.exec(before);

  if (!match) {
    close();
    return;
  }

  const query = match[1] ?? '';
  const next = getSlashItems(ctx.writekit.state.registry, query);

  if (next.length === 0) {
    close();
    return;
  }

  triggerBlockId = block.id;
  caretOffset = sel.focus.offset;
  triggerStart = caretOffset - query.length - trigger.length;
  items.value = next;
  highlighted.value = open.value ? Math.min(highlighted.value, next.length - 1) : 0;

  if (!caretRect()) {
    close();
    return;
  }

  reference.value = { getBoundingClientRect: () => caretRect() ?? new DOMRect() };
  open.value = true;
}

function selectItem(item: SlashItem): void {
  const writekit = ctx.writekit;
  const block = blockById(writekit.state.doc, triggerBlockId);

  if (!block) {
    close();
    return;
  }

  const def = writekit.state.registry.getBlock(item.type);
  const tr = createTransaction(writekit.state).deleteText(triggerBlockId, triggerStart, caretOffset);

  const attrs = writekit.state.schema.coerceAttrs(item.type, item.attrs);

  if (def?.spec.content.kind === 'atom') {
    const node = createNode(item.type, { attrs });
    const index = writekit.state.doc.content.findIndex(candidate => candidate.id === triggerBlockId);
    tr.insertBlock(node, index + 1).setSelection(nodeSelection([node.id]));
  }
  else {
    tr.setBlockType(triggerBlockId, item.type, attrs);
    tr.setSelection(caret(triggerBlockId, triggerStart));
  }

  writekit.dispatch(tr);
  close();
}

function onKeydownCapture(event: KeyboardEvent): void {
  if (!open.value || items.value.length === 0)
    return;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      event.stopImmediatePropagation();
      highlighted.value = (highlighted.value + 1) % items.value.length;
      break;
    case 'ArrowUp':
      event.preventDefault();
      event.stopImmediatePropagation();
      highlighted.value = (highlighted.value - 1 + items.value.length) % items.value.length;
      break;
    case 'Enter':
      event.preventDefault();
      event.stopImmediatePropagation();
      selectItem(items.value[highlighted.value]!);
      break;
    case 'Escape':
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
      break;
  }
}

// Keyboard navigation must chase the highlight into view — a list longer than
// the menu's max-height otherwise walks the selection out of sight.
watch(highlighted, index => void nextTick(() => {
  itemRefs.value?.[index]?.scrollIntoView({ block: 'nearest' });
}));

/**
 * The menu is anchored to a caret rect that does NOT move with the page, so a
 * background scroll visually tears the menu off its anchor. Scrolling inside
 * the menu (a long block list) stays allowed.
 */
function onScrollIntent(event: Event): void {
  if (!open.value)
    return;

  if (layerEl.value && event.target instanceof Node && layerEl.value.contains(event.target))
    return;

  event.preventDefault();
}

ctx.writekit.on('transaction', refresh);
useEventListener(() => (typeof document === 'undefined' ? undefined : document), 'selectionchange', refresh);
useEventListener(() => (typeof document === 'undefined' ? undefined : document), 'keydown', onKeydownCapture as (event: Event) => void, { capture: true });
useEventListener(() => (typeof document === 'undefined' ? undefined : document), 'wheel', onScrollIntent, { capture: true, passive: false });
useEventListener(() => (typeof document === 'undefined' ? undefined : document), 'touchmove', onScrollIntent, { capture: true, passive: false });
onBeforeUnmount(() => ctx.writekit.off('transaction', refresh));
</script>

<template>
  <!-- Combobox layering: PopperRoot provides the positioning context outside
       the portal. The bare Portal resolves its target from the ConfigProvider's
       teleportTarget (body unless the app overrides it). -->
  <PopperRoot>
    <Portal>
      <PopperContent
        v-if="open && reference"
        :reference="reference"
        side="bottom"
        align="start"
        :side-offset="6"
        :collision-padding="8"
      >
        <DismissableLayer
          ref="layer"
          class="writekit-slash"
          data-writekit-slash=""
          @dismiss="close"
          @focus-outside.prevent
        >
          <div
            class="writekit-slash-menu"
            role="listbox"
            data-writekit-slash-menu=""
          >
            <button
              v-for="(item, index) in items"
              :key="item.title"
              ref="options"
              type="button"
              role="option"
              :data-highlighted="index === highlighted || undefined"
              :aria-selected="index === highlighted"
              @mousedown.prevent="selectItem(item)"
              @mousemove="highlighted = index"
            >
              <span class="slash-title">{{ item.title }}</span>
              <span class="slash-group">{{ item.group }}</span>
            </button>
          </div>

          <aside
            v-if="active && hasPreview"
            class="writekit-slash-preview"
            data-writekit-slash-preview=""
            aria-hidden="true"
          >
            <slot name="preview" :item="active">
              <span class="slash-preview-title">{{ active.title }}</span>
              <span class="slash-preview-text">{{ active.description }}</span>
            </slot>
          </aside>
        </DismissableLayer>
      </PopperContent>
    </Portal>
  </PopperRoot>
</template>
