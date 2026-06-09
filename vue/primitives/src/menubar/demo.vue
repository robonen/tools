<script setup lang="ts">
import { ref } from 'vue';
import {
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarItemIndicator,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarRoot,
  MenubarSeparator,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from '@robonen/primitives';

const active = ref<string>();
const showStatusBar = ref(true);
const showMinimap = ref(false);
const layout = ref('comfortable');
const lastAction = ref('');

const triggerClass = 'rounded-md px-3 py-1.5 text-sm font-medium text-(--fg) outline-none transition-colors hover:bg-(--bg-subtle) focus-visible:ring-2 focus-visible:ring-(--ring) data-[state=open]:bg-(--accent) data-[state=open]:text-(--accent-fg)';
const contentClass = 'z-50 min-w-52 rounded-lg border border-(--border) bg-(--bg-elevated) p-1 shadow-lg';
const itemClass = 'flex cursor-default select-none items-center justify-between gap-4 rounded-md px-2 py-1.5 text-sm text-(--fg) outline-none data-[highlighted]:bg-(--accent) data-[highlighted]:text-(--accent-fg) data-[disabled]:pointer-events-none data-[disabled]:opacity-50';
const checkItemClass = `${itemClass} relative pl-7`;
const labelClass = 'px-2 py-1.5 text-xs font-medium text-(--fg-subtle)';
const shortcutClass = 'text-xs text-(--fg-muted) group-data-[highlighted]:text-(--accent-fg)';

function run(action: string) {
  lastAction.value = action;
}
</script>

<template>
  <div class="flex flex-col items-start gap-3 text-(--fg)">
    <MenubarRoot
      v-model="active"
      class="flex items-center gap-1 rounded-lg border border-(--border) bg-(--bg) p-1"
    >
      <MenubarMenu value="file">
        <MenubarTrigger :class="triggerClass">
          File
        </MenubarTrigger>
        <MenubarPortal>
          <MenubarContent :side-offset="6" :class="contentClass">
            <MenubarItem class="group" :class="itemClass" @select="run('New File')">
              New file <span :class="shortcutClass">Cmd N</span>
            </MenubarItem>
            <MenubarItem class="group" :class="itemClass" @select="run('Open')">
              Open... <span :class="shortcutClass">Cmd O</span>
            </MenubarItem>

            <MenubarSub>
              <MenubarSubTrigger class="group" :class="itemClass">
                Share
                <span class="i-carbon-chevron-right text-(--fg-muted) group-data-[highlighted]:text-(--accent-fg)" aria-hidden="true" />
              </MenubarSubTrigger>
              <MenubarPortal>
                <MenubarSubContent :class="contentClass">
                  <MenubarItem :class="itemClass" @select="run('Copy link')">
                    Copy link
                  </MenubarItem>
                  <MenubarItem :class="itemClass" @select="run('Email')">
                    Email
                  </MenubarItem>
                </MenubarSubContent>
              </MenubarPortal>
            </MenubarSub>

            <MenubarSeparator class="my-1 h-px bg-(--border)" />

            <MenubarItem class="group" :class="itemClass" @select="run('Save')">
              Save <span :class="shortcutClass">Cmd S</span>
            </MenubarItem>
          </MenubarContent>
        </MenubarPortal>
      </MenubarMenu>

      <MenubarMenu value="edit">
        <MenubarTrigger :class="triggerClass">
          Edit
        </MenubarTrigger>
        <MenubarPortal>
          <MenubarContent :side-offset="6" :class="contentClass">
            <MenubarItem class="group" :class="itemClass" @select="run('Undo')">
              Undo <span :class="shortcutClass">Cmd Z</span>
            </MenubarItem>
            <MenubarItem class="group" :class="itemClass" disabled>
              Redo <span :class="shortcutClass">Cmd Shift Z</span>
            </MenubarItem>
            <MenubarSeparator class="my-1 h-px bg-(--border)" />
            <MenubarItem :class="itemClass" @select="run('Cut')">
              Cut
            </MenubarItem>
            <MenubarItem :class="itemClass" @select="run('Copy')">
              Copy
            </MenubarItem>
            <MenubarItem :class="itemClass" @select="run('Paste')">
              Paste
            </MenubarItem>
          </MenubarContent>
        </MenubarPortal>
      </MenubarMenu>

      <MenubarMenu value="view">
        <MenubarTrigger :class="triggerClass">
          View
        </MenubarTrigger>
        <MenubarPortal>
          <MenubarContent :side-offset="6" :class="contentClass">
            <MenubarCheckboxItem v-model:checked="showStatusBar" :class="checkItemClass">
              <MenubarItemIndicator class="absolute left-1.5 inline-flex">
                <span class="i-carbon-checkmark text-(--accent)" aria-hidden="true" />
              </MenubarItemIndicator>
              Status bar
            </MenubarCheckboxItem>
            <MenubarCheckboxItem v-model:checked="showMinimap" :class="checkItemClass">
              <MenubarItemIndicator class="absolute left-1.5 inline-flex">
                <span class="i-carbon-checkmark text-(--accent)" aria-hidden="true" />
              </MenubarItemIndicator>
              Minimap
            </MenubarCheckboxItem>

            <MenubarSeparator class="my-1 h-px bg-(--border)" />
            <MenubarLabel :class="labelClass">
              Layout
            </MenubarLabel>

            <MenubarRadioGroup v-model="layout">
              <MenubarRadioItem value="compact" :class="checkItemClass">
                <MenubarItemIndicator class="absolute left-1.5 inline-flex">
                  <span class="i-carbon-dot-mark text-(--accent)" aria-hidden="true" />
                </MenubarItemIndicator>
                Compact
              </MenubarRadioItem>
              <MenubarRadioItem value="comfortable" :class="checkItemClass">
                <MenubarItemIndicator class="absolute left-1.5 inline-flex">
                  <span class="i-carbon-dot-mark text-(--accent)" aria-hidden="true" />
                </MenubarItemIndicator>
                Comfortable
              </MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarPortal>
      </MenubarMenu>
    </MenubarRoot>

    <p class="text-xs text-(--fg-muted)">
      Status bar: <span class="font-medium text-(--fg)">{{ showStatusBar ? 'on' : 'off' }}</span>
      &middot; Minimap: <span class="font-medium text-(--fg)">{{ showMinimap ? 'on' : 'off' }}</span>
      &middot; Layout: <span class="font-medium text-(--fg)">{{ layout }}</span>
      <template v-if="lastAction">
        &middot; Last action: <span class="font-medium text-(--fg)">{{ lastAction }}</span>
      </template>
    </p>
  </div>
</template>
