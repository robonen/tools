<script lang="ts">
export interface WritekitBlockInserterProps {
  /** Accessible name of the button. @default 'Add a block' */
  label?: string;
  /** Which side of the button the picker opens on. @default 'bottom' */
  menuSide?: 'top' | 'right' | 'bottom' | 'left';
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { MenuContent, MenuItem, MenuLabel, MenuPortal, MenuRoot, MenuSeparator } from '@robonen/primitives';
import type { Node } from '../../../model';
import { createNode } from '../../../model';
import { insertBlockBeside } from '../../../commands';
import { useWritekitContext } from '../../context';
import type { SlashItem } from '../slash-items';
import { listBlockItems } from '../slash-items';
import { useBlockGutterContext } from './context';

const { label = 'Add a block', menuSide = 'bottom' } = defineProps<WritekitBlockInserterProps>();

defineSlots<{
  /** The button's content; defaults to a plus sign. */
  default?: () => unknown;
  /** How one picker entry renders; defaults to its title. */
  item?: (props: { item: SlashItem }) => unknown;
}>();

const ctx = useWritekitContext();
const gutter = useBlockGutterContext();
const open = ref(false);
const button = ref<HTMLButtonElement | null>(null);
/** Alt while opening means "above"; remembered until the pick. */
let above = false;

/** Every pickable block (variants expanded), in registration order, grouped by `meta.group`. */
const groups = computed(() => {
  const byGroup = new Map<string, SlashItem[]>();
  for (const item of listBlockItems(ctx.registry))
    byGroup.set(item.group, [...(byGroup.get(item.group) ?? []), item]);
  return [...byGroup.entries()].map(([name, items]) => ({ name, items }));
});

watch(open, value => gutter.pin(value));

/**
 * A click toggles. Opening waits a tick, after the gutter's own state has
 * settled, so the menu's auto-focus is the last word on focus. Closing is
 * immediate — and it is this handler's job alone: the picker's layer ignores
 * a press on the button (see `keepOpenOnOwnButton`), otherwise the press
 * would dismiss the picker and this click would open it again.
 */
function togglePicker(event: MouseEvent | KeyboardEvent): void {
  if (!gutter.block.value)
    return;

  if (open.value) {
    open.value = false;
    return;
  }

  above = event.altKey;
  void nextTick(() => {
    open.value = true;
  });
}

/** The button owns its own toggling; a press on it is not an outside press. */
function keepOpenOnOwnButton(event: PointerEvent | MouseEvent): void {
  const target = event.target as Node | null;
  if (target && button.value?.contains(target))
    event.preventDefault();
}

/** Insert an empty block of the picked type beside the current one and go there. */
function pick(item: SlashItem): void {
  const block = gutter.block.value;
  if (!block)
    return;

  const def = ctx.registry.getBlock(item.type);
  const attrs = ctx.writekit.state.schema.coerceAttrs(item.type, item.attrs);
  const node: Node = def?.spec.content.kind === 'text'
    ? createNode(item.type, { attrs, content: [] })
    : createNode(item.type, { attrs });

  const inserted = ctx.exec(insertBlockBeside(block.id, node, { above }));
  if (inserted && def?.spec.content.kind === 'text')
    ctx.focusBlock(node.id, 'start');
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    togglePicker(event);
  }
}

/**
 * Never send focus back to the button. On a real close the editor gets it —
 * after a pick the caret is already in the new block, after a dismiss the
 * author is back in the text. The menu's focus scope also fires this while
 * the menu is still open (its effect re-runs on the re-render a pointer
 * press causes); moving focus then would read as focus leaving the menu and
 * dismiss it under the pointer, before the click lands.
 */
function onCloseAutoFocus(event: Event): void {
  event.preventDefault();
  if (!open.value && !ctx.contentRoot.value?.contains(document.activeElement))
    ctx.contentRoot.value?.focus({ preventScroll: true });
}
</script>

<template>
  <MenuRoot v-model:open="open" :modal="false">
    <button
      ref="button"
      type="button"
      class="writekit-block-inserter"
      data-writekit-block-inserter=""
      :aria-label="label"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="togglePicker"
      @keydown="onKeydown"
    >
      <slot>+</slot>
    </button>

    <MenuPortal>
      <MenuContent
        v-if="gutter.block.value"
        class="writekit-block-menu"
        data-writekit-block-menu=""
        data-writekit-block-picker=""
        :reference="button ?? undefined"
        :side="menuSide"
        align="start"
        :side-offset="6"
        :collision-padding="8"
        loop
        @close-auto-focus="onCloseAutoFocus"
        @pointer-down-outside="keepOpenOnOwnButton"
      >
        <template v-for="(group, index) in groups" :key="group.name">
          <MenuSeparator v-if="index > 0" data-writekit-menu-separator="" />
          <MenuLabel data-writekit-menu-label="">
            {{ group.name }}
          </MenuLabel>
          <MenuItem
            v-for="item in group.items"
            :key="item.title"
            data-writekit-menu-item=""
            :text-value="item.title"
            @select="pick(item)"
          >
            <slot name="item" :item="item">{{ item.title }}</slot>
          </MenuItem>
        </template>
      </MenuContent>
    </MenuPortal>
  </MenuRoot>
</template>
