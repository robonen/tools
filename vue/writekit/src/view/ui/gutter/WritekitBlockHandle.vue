<script lang="ts">
export interface WritekitBlockHandleLabels {
  handle?: string;
  turnInto?: string;
  duplicate?: string;
  moveUp?: string;
  moveDown?: string;
  remove?: string;
}

export interface WritekitBlockHandleProps {
  /** Text of the built-in menu items and the handle's accessible name. */
  labels?: WritekitBlockHandleLabels;
  /** Which side of the handle the menu opens on. @default 'right' */
  menuSide?: 'top' | 'right' | 'bottom' | 'left';
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { MenuContent, MenuItem, MenuPortal, MenuRoot, MenuSeparator, MenuSub, MenuSubContent, MenuSubTrigger } from '@robonen/primitives';
import type { Node } from '../../../model';
import { blockIndex, inlineLength, nodeInline, nodeSelection } from '../../../model';
import { convertBlock, duplicateBlock, moveBlocks, removeBlock } from '../../../commands';
import { createTransaction } from '../../../state';
import { useWritekitContext } from '../../context';
import type { SlashItem } from '../slash-items';
import { getTurnIntoItems } from '../slash-items';
import { useBlockGutterContext } from './context';

const { labels = {}, menuSide = 'right' } = defineProps<WritekitBlockHandleProps>();

const slots = defineSlots<{
  /** The grip itself; defaults to a braille grip glyph. */
  default?: () => unknown;
  /** Extra items, rendered after the built-in ones. */
  menu?: (props: { block: Node; close: () => void }) => unknown;
}>();

const ctx = useWritekitContext();
const gutter = useBlockGutterContext();
const open = ref(false);
const handle = ref<HTMLButtonElement | null>(null);

const text = computed(() => ({
  handle: labels.handle ?? 'Drag to move, click for options',
  turnInto: labels.turnInto ?? 'Turn into',
  duplicate: labels.duplicate ?? 'Duplicate',
  moveUp: labels.moveUp ?? 'Move up',
  moveDown: labels.moveDown ?? 'Move down',
  remove: labels.remove ?? 'Delete',
}));

const block = gutter.block;
const isText = computed(() => block.value !== null && ctx.writekit.state.schema.nodeSpec(block.value.type)?.content.kind === 'text');
const turnInto = computed(() => (isText.value ? getTurnIntoItems(ctx.registry) : []));
const index = computed(() => (block.value ? blockIndex(ctx.state.value.doc, block.value.id) : -1));
const count = computed(() => ctx.state.value.doc.content.length);

function isCurrent(item: SlashItem): boolean {
  const node = block.value;
  if (!node || node.type !== item.type)
    return false;
  return Object.entries(item.attrs ?? {}).every(([key, value]) => node.attrs[key] === value);
}

// The menu acts on the block it was opened for, and the block is selected
// for the duration so the keyboard and the eye agree on the target.
function openMenu(): void {
  const node = block.value;
  if (!node)
    return;

  ctx.dispatch(createTransaction(ctx.writekit.state).setSelection(nodeSelection([node.id])).setMeta('selectionOnly', true));
  void nextTick(() => {
    open.value = true;
  });
}

function close(): void {
  open.value = false;
}

watch(open, value => gutter.pin(value));

/** After an action the caret goes back into the block; an atom stays selected. */
function settle(id: string): void {
  const node = ctx.writekit.state.doc.content.find(candidate => candidate.id === id);
  if (node && ctx.writekit.state.schema.nodeSpec(node.type)?.content.kind === 'text')
    ctx.focusBlock(id, inlineLength(nodeInline(node)));
  else
    ctx.contentRoot.value?.focus({ preventScroll: true });
}

function run(action: (id: string) => void): void {
  const node = block.value;
  if (!node)
    return;
  action(node.id);
}

function convert(item: SlashItem): void {
  run((id) => {
    ctx.exec(convertBlock(id, item.type, ctx.writekit.state.schema.coerceAttrs(item.type, item.attrs)));
    settle(id);
  });
}

function duplicate(): void {
  run(id => ctx.exec(duplicateBlock(id)));
}

function move(delta: -1 | 1): void {
  run((id) => {
    const at = blockIndex(ctx.writekit.state.doc, id);
    ctx.exec(moveBlocks([id], delta < 0 ? at - 1 : at + 2));
    settle(id);
  });
}

function remove(): void {
  run((id) => {
    ctx.exec(removeBlock(id));
    gutter.hide();
  });
}

function onPointerDown(event: PointerEvent): void {
  const node = block.value;
  if (!node || open.value)
    return;
  gutter.drag.press(event, node.id, openMenu);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openMenu();
  }
}

// Closing hands focus back to the editor rather than to the handle, whose
// only job is done; the block stays selected so Backspace still deletes it.
function onCloseAutoFocus(event: Event): void {
  event.preventDefault();
  ctx.contentRoot.value?.focus({ preventScroll: true });
}

/**
 * A pointer-opened submenu takes focus the moment it mounts — before its own
 * dismissable layer is on the stack — so the root layer sees focus "outside"
 * and would close the whole menu on a mere hover over "Turn into". Focus
 * landing in one of our own menus is never outside.
 */
function onFocusOutside(event: FocusEvent): void {
  const target = event.target as Element | null;
  if (target?.closest('[data-writekit-block-menu]'))
    event.preventDefault();
}

/**
 * Leaving the "Turn into" trigger toward its submenu hands focus back to the
 * parent menu's container for an instant (item-leave runs before the trigger
 * records the pointer's intent), which the submenu's layer reads as focus
 * outside — and it closes before the pointer can reach an item. Focus on the
 * parent's container is not a reason to close; focus on one of the parent's
 * items is, since that is the pointer settling elsewhere.
 */
function keepSubmenuOnParentFocus(event: FocusEvent): void {
  const target = event.target as Element | null;
  if (target?.getAttribute('role') === 'menu' && target.closest('[data-writekit-block-menu]:not([data-submenu])'))
    event.preventDefault();
}
</script>

<template>
  <MenuRoot v-model:open="open" :modal="false">
    <button
      ref="handle"
      type="button"
      class="writekit-block-handle"
      data-writekit-block-handle=""
      :aria-label="text.handle"
      aria-haspopup="menu"
      :aria-expanded="open"
      style="touch-action: none"
      @pointerdown="onPointerDown"
      @keydown="onKeydown"
    >
      <slot>⠿</slot>
    </button>

    <MenuPortal>
      <MenuContent
        v-if="block"
        class="writekit-block-menu"
        data-writekit-block-menu=""
        :reference="handle ?? undefined"
        :side="menuSide"
        align="start"
        :side-offset="6"
        :collision-padding="8"
        loop
        @close-auto-focus="onCloseAutoFocus"
        @focus-outside="onFocusOutside"
      >
        <MenuSub v-if="turnInto.length > 0">
          <MenuSubTrigger data-writekit-menu-item="" data-submenu="">
            {{ text.turnInto }}
          </MenuSubTrigger>
          <MenuPortal>
            <MenuSubContent
              class="writekit-block-menu"
              data-writekit-block-menu=""
              data-submenu=""
              :side-offset="4"
              loop
              @focus-outside="keepSubmenuOnParentFocus"
            >
              <MenuItem
                v-for="item in turnInto"
                :key="item.title"
                data-writekit-menu-item=""
                :data-active="isCurrent(item) || undefined"
                @select="convert(item)"
              >
                {{ item.title }}
              </MenuItem>
            </MenuSubContent>
          </MenuPortal>
        </MenuSub>

        <MenuItem data-writekit-menu-item="" @select="duplicate">
          {{ text.duplicate }}
        </MenuItem>
        <MenuItem data-writekit-menu-item="" :disabled="index <= 0" @select="move(-1)">
          {{ text.moveUp }}
        </MenuItem>
        <MenuItem data-writekit-menu-item="" :disabled="index < 0 || index >= count - 1" @select="move(1)">
          {{ text.moveDown }}
        </MenuItem>

        <template v-if="slots.menu">
          <MenuSeparator data-writekit-menu-separator="" />
          <slot name="menu" :block="block" :close="close" />
        </template>

        <MenuSeparator data-writekit-menu-separator="" />
        <MenuItem data-writekit-menu-item="" data-danger="" @select="remove">
          {{ text.remove }}
        </MenuItem>
      </MenuContent>
    </MenuPortal>
  </MenuRoot>
</template>
