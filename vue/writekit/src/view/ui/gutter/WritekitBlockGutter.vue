<script lang="ts">
import type { Node } from '../../../model';

export interface WritekitBlockGutterProps {
  /** Gap between the gutter and the block's edge, px. @default 8 */
  sideOffset?: number;
  /** How long the gutter lingers after the pointer leaves it and the editor, ms. @default 150 */
  hideDelay?: number;
  /** Characters of the dragged block's text shown in the default ghost. @default 40 */
  ghostLength?: number;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import { useTimeoutFn } from '@robonen/vue';
import { PopperContent, PopperRoot, Portal } from '@robonen/primitives';
import { blockById, nodeText } from '../../../model';
import { useWritekitContext } from '../../context';
import { useEventListener } from '../../composables';
import { useBlockDrag } from '../../dnd';
import { provideBlockGutterContext } from './context';

const { sideOffset = 8, hideDelay = 150, ghostLength = 40 } = defineProps<WritekitBlockGutterProps>();

defineSlots<{
  /** The gutter's controls: `WritekitBlockInserter`, `WritekitBlockHandle`, or your own. */
  default?: (props: { block: Node }) => unknown;
  /** What follows the pointer during a drag; defaults to the first block's text or title. */
  ghost?: (props: { blocks: Node[] }) => unknown;
}>();

const ctx = useWritekitContext();
const drag = useBlockDrag(ctx);

const hoveredId = ref<string | null>(null);
const pinned = ref(false);
const overGutter = ref(false);

const block = computed(() => (hoveredId.value ? blockById(ctx.state.value.doc, hoveredId.value) : null));
const visible = computed(() => block.value !== null && ctx.config.editable && drag.session.value === null);

/** How much of an atom (image, divider) the controls line up with: its top band, not its middle. */
const ATOM_BAND = 40;

/**
 * The block's first line: the controls sit centred on it, whatever the
 * block's height — a one-line paragraph, a tall heading, a ten-line quote.
 * The line box is the host's content top plus its `line-height`; a
 * `line-height: normal` falls back to the font's own box.
 */
function firstLineRect(id: string): DOMRect {
  const wrapper = ctx.blockViews.get(id);
  if (!wrapper)
    return new DOMRect();

  const box = wrapper.getBoundingClientRect();
  const host = ctx.blockElements.get(id);
  if (!host)
    return new DOMRect(box.left, box.top, box.width, Math.min(box.height, ATOM_BAND));

  const style = getComputedStyle(host);
  const inner = host.getBoundingClientRect();
  const top = inner.top + Number.parseFloat(style.paddingTop) + Number.parseFloat(style.borderTopWidth);
  return new DOMRect(box.left, top, box.width, firstLineHeight(host, style));
}

/**
 * A numeric `line-height` is the line box. `normal` means the font's own
 * box, which the first character's client rect reports exactly; an empty
 * line (a filler `<br>`) is as tall as the host itself.
 */
function firstLineHeight(host: HTMLElement, style: CSSStyleDeclaration): number {
  const lineHeight = Number.parseFloat(style.lineHeight);
  if (Number.isFinite(lineHeight))
    return lineHeight;

  const text = document.createTreeWalker(host, NodeFilter.SHOW_TEXT).nextNode();
  if (text?.nodeValue) {
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 1);
    const rect = range.getClientRects()[0];
    if (rect?.height)
      return rect.height;
  }

  return host.getBoundingClientRect().height;
}

// A virtual reference over the block's first line; reassigned per block so
// PopperContent re-resolves. Measured on demand, so it follows layout shifts.
const reference = shallowRef<{ getBoundingClientRect: () => DOMRect } | undefined>();

watch(hoveredId, (id) => {
  reference.value = id ? { getBoundingClientRect: () => firstLineRect(id) } : undefined;
});

const hideLater = useTimeoutFn(() => {
  if (!pinned.value && !overGutter.value)
    hoveredId.value = null;
}, hideDelay, { immediate: false });

function hide(): void {
  hideLater.stop();
  hoveredId.value = null;
}

function show(id: string): void {
  hideLater.stop();
  hoveredId.value = id;
}

// One `closest` per pointer move over the editor is cheap; nothing is measured
// until the gutter actually positions itself.
function onPointerMove(event: PointerEvent): void {
  if (drag.session.value || pinned.value)
    return;

  const wrapper = (event.target as Element | null)?.closest<HTMLElement>('[data-block-id]');
  const id = wrapper?.dataset['blockId'];

  if (id && id !== hoveredId.value)
    show(id);
  else if (!id && hoveredId.value)
    hideLater.start();
}

function onPointerLeave(): void {
  if (!pinned.value)
    hideLater.start();
}

// Typing means the pointer is out of the way; the gutter over the caret is noise.
function onKeydown(): void {
  if (!pinned.value)
    hide();
}

useEventListener(ctx.contentRoot, 'pointermove', onPointerMove as (event: Event) => void, { passive: true });
useEventListener(ctx.contentRoot, 'pointerleave', onPointerLeave);
useEventListener(ctx.contentRoot, 'keydown', onKeydown);

// The block can vanish under the gutter (deleted, undone, moved by a peer).
function onTransaction(): void {
  if (hoveredId.value && !blockById(ctx.writekit.state.doc, hoveredId.value))
    hide();
}

ctx.writekit.on('transaction', onTransaction);
onBeforeUnmount(() => ctx.writekit.off('transaction', onTransaction));

provideBlockGutterContext({
  block,
  drag,
  pin: (value) => {
    pinned.value = value;
    if (!value)
      hideLater.start();
  },
  hide,
});

const draggedBlocks = computed<Node[]>(() => {
  const live = drag.session.value;
  if (!live)
    return [];
  return live.ids.map(id => blockById(ctx.writekit.state.doc, id)).filter((node): node is Node => node !== null);
});

const ghostLabel = computed(() => {
  const first = draggedBlocks.value[0];
  if (!first)
    return '';

  const text = nodeText(first).trim();
  const label = text || ctx.registry.getBlock(first.type)?.meta?.title || first.type;
  const more = draggedBlocks.value.length > 1 ? ` +${draggedBlocks.value.length - 1}` : '';
  return label.slice(0, ghostLength) + (text.length > ghostLength ? '…' : '') + more;
});

const ghostStyle = computed(() => {
  const live = drag.session.value;
  return live
    ? { position: 'fixed', left: '0', top: '0', transform: `translate(${live.pointer.x + 12}px, ${live.pointer.y + 12}px)`, pointerEvents: 'none' } as const
    : undefined;
});

const indicatorStyle = computed(() => {
  const line = drag.session.value?.indicator;
  return line
    ? { position: 'fixed', left: `${line.x}px`, top: `${line.y}px`, width: `${line.width}px`, pointerEvents: 'none' } as const
    : undefined;
});
</script>

<template>
  <PopperRoot>
    <Portal>
      <PopperContent
        v-if="visible && reference"
        :reference="reference"
        side="left"
        align="center"
        :side-offset="sideOffset"
        :collision-padding="4"
        :avoid-collisions="false"
      >
        <!-- mousedown.prevent: the editor keeps focus and its selection while the gutter is used. -->
        <div
          class="writekit-block-gutter"
          data-writekit-block-gutter=""
          role="toolbar"
          @mousedown.prevent
          @pointerenter="overGutter = true; hideLater.stop()"
          @pointerleave="overGutter = false; onPointerLeave()"
        >
          <slot :block="block!" />
        </div>
      </PopperContent>
    </Portal>

    <Portal>
      <div
        v-if="indicatorStyle"
        class="writekit-drop-indicator"
        data-writekit-drop-indicator=""
        aria-hidden="true"
        :style="indicatorStyle"
      />
    </Portal>

    <Portal>
      <div
        v-if="ghostStyle"
        class="writekit-drag-ghost"
        data-writekit-drag-ghost=""
        aria-hidden="true"
        :style="ghostStyle"
      >
        <slot name="ghost" :blocks="draggedBlocks">{{ ghostLabel }}</slot>
      </div>
    </Portal>
  </PopperRoot>
</template>
