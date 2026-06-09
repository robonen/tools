<script setup lang="ts">
import { ref } from 'vue';
import {
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuItemIndicator,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@robonen/primitives';

const showGrid = ref(true);
const showRulers = ref(false);
const zoom = ref('100');
const lastAction = ref('Right-click the canvas to open the menu.');

function run(action: string) {
  lastAction.value = action;
}

const itemClass = 'flex items-center justify-between gap-6 rounded px-2 py-1.5 text-sm outline-none cursor-default select-none data-[highlighted]:bg-(--accent) data-[highlighted]:text-(--accent-fg) data-[disabled]:opacity-40 data-[disabled]:pointer-events-none';
const contentClass = 'min-w-52 rounded-lg border border-(--border) bg-(--bg-elevated) p-1 text-(--fg) shadow-lg shadow-black/10';
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <ContextMenuRoot>
      <ContextMenuTrigger
        as="div"
        class="flex h-44 w-80 items-center justify-center rounded-xl border border-dashed border-(--border) bg-(--bg-subtle) text-sm text-(--fg-muted) select-none"
      >
        Right-click anywhere in this area
      </ContextMenuTrigger>

      <ContextMenuPortal>
        <ContextMenuContent :class="contentClass">
          <ContextMenuItem
            :class="itemClass"
            @select="run('Cut')"
          >
            Cut
            <span class="text-xs text-(--fg-subtle)">⌘X</span>
          </ContextMenuItem>
          <ContextMenuItem
            :class="itemClass"
            @select="run('Copy')"
          >
            Copy
            <span class="text-xs text-(--fg-subtle)">⌘C</span>
          </ContextMenuItem>
          <ContextMenuItem
            :class="itemClass"
            disabled
          >
            Paste
            <span class="text-xs text-(--fg-subtle)">⌘V</span>
          </ContextMenuItem>

          <ContextMenuSeparator class="my-1 h-px bg-(--border)" />

          <ContextMenuLabel class="px-2 py-1 text-xs font-medium text-(--fg-subtle)">
            View
          </ContextMenuLabel>

          <ContextMenuCheckboxItem
            v-model:checked="showGrid"
            :class="itemClass"
          >
            <span class="flex items-center gap-2">
              <span class="flex size-4 items-center justify-center">
                <ContextMenuItemIndicator>
                  <svg
                    class="size-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </ContextMenuItemIndicator>
              </span>
              Show grid
            </span>
          </ContextMenuCheckboxItem>

          <ContextMenuCheckboxItem
            v-model:checked="showRulers"
            :class="itemClass"
          >
            <span class="flex items-center gap-2">
              <span class="flex size-4 items-center justify-center">
                <ContextMenuItemIndicator>
                  <svg
                    class="size-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </ContextMenuItemIndicator>
              </span>
              Show rulers
            </span>
          </ContextMenuCheckboxItem>

          <ContextMenuSub>
            <ContextMenuSubTrigger
              :class="itemClass"
              class="data-[state=open]:bg-(--bg-subtle)"
            >
              Zoom
              <svg
                class="size-4 text-(--fg-subtle)"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </ContextMenuSubTrigger>
            <ContextMenuPortal>
              <ContextMenuSubContent
                :class="contentClass"
                class="min-w-32"
              >
                <ContextMenuRadioGroup v-model="zoom">
                  <ContextMenuRadioItem
                    v-for="level in ['50', '100', '200']"
                    :key="level"
                    :value="level"
                    :class="itemClass"
                  >
                    <span class="flex items-center gap-2">
                      <span class="flex size-4 items-center justify-center">
                        <ContextMenuItemIndicator>
                          <span class="size-1.5 rounded-full bg-current" />
                        </ContextMenuItemIndicator>
                      </span>
                      {{ level }}%
                    </span>
                  </ContextMenuRadioItem>
                </ContextMenuRadioGroup>
              </ContextMenuSubContent>
            </ContextMenuPortal>
          </ContextMenuSub>

          <ContextMenuSeparator class="my-1 h-px bg-(--border)" />

          <ContextMenuItem
            :class="itemClass"
            class="text-red-600 data-[highlighted]:bg-red-600 data-[highlighted]:text-white dark:text-red-400"
            @select="run('Delete')"
          >
            Delete
            <span class="text-xs opacity-70">⌫</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenuPortal>
    </ContextMenuRoot>

    <p class="text-xs text-(--fg-muted)">
      {{ lastAction }} · grid {{ showGrid ? 'on' : 'off' }} · zoom {{ zoom }}%
    </p>
  </div>
</template>
