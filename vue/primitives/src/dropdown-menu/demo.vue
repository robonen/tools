<script setup lang="ts">
import { ref } from 'vue';
import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIndicator,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@robonen/primitives';

const open = ref(false);
const showStatusBar = ref(true);
const showActivityBar = ref(false);
const theme = ref('system');
const lastAction = ref('');

const itemClass = 'group flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm text-(--fg) outline-none data-[highlighted]:bg-(--accent) data-[highlighted]:text-(--accent-fg) data-[disabled]:pointer-events-none data-[disabled]:opacity-50';
const checkItemClass = `${itemClass} pl-7 relative`;

function run(action: string) {
  lastAction.value = action;
}
</script>

<template>
  <div class="flex flex-col items-start gap-3 text-(--fg)">
    <DropdownMenuRoot v-model:open="open">
      <DropdownMenuTrigger
        class="group inline-flex items-center gap-2 rounded-md border border-(--border) bg-(--bg) px-3 py-1.5 text-sm font-medium text-(--fg) transition-colors hover:bg-(--bg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) data-[state=open]:bg-(--bg-subtle)"
      >
        Options
        <span
          class="i-carbon-chevron-down text-(--fg-muted) transition-transform duration-150 group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>

      <DropdownMenuPortal>
        <DropdownMenuContent
          :side-offset="6"
          align="start"
          class="z-50 min-w-56 rounded-lg border border-(--border) bg-(--bg-elevated) p-1 shadow-lg"
        >
          <DropdownMenuLabel class="px-2 py-1.5 text-xs font-medium text-(--fg-subtle)">
            My account
          </DropdownMenuLabel>

          <DropdownMenuItem :class="itemClass" @select="run('Profile')">
            <span class="i-carbon-user" aria-hidden="true" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem :class="itemClass" @select="run('Settings')">
            <span class="i-carbon-settings" aria-hidden="true" />
            Settings
          </DropdownMenuItem>

          <DropdownMenuSeparator class="my-1 h-px bg-(--border)" />

          <DropdownMenuLabel class="px-2 py-1.5 text-xs font-medium text-(--fg-subtle)">
            View
          </DropdownMenuLabel>

          <DropdownMenuCheckboxItem v-model:checked="showStatusBar" :class="checkItemClass">
            <DropdownMenuItemIndicator class="absolute left-1.5 inline-flex">
              <span class="i-carbon-checkmark text-(--accent)" aria-hidden="true" />
            </DropdownMenuItemIndicator>
            Status bar
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem v-model:checked="showActivityBar" :class="checkItemClass">
            <DropdownMenuItemIndicator class="absolute left-1.5 inline-flex">
              <span class="i-carbon-checkmark text-(--accent)" aria-hidden="true" />
            </DropdownMenuItemIndicator>
            Activity bar
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator class="my-1 h-px bg-(--border)" />

          <DropdownMenuLabel class="px-2 py-1.5 text-xs font-medium text-(--fg-subtle)">
            Theme
          </DropdownMenuLabel>

          <DropdownMenuRadioGroup v-model="theme">
            <DropdownMenuRadioItem value="light" :class="checkItemClass">
              <DropdownMenuItemIndicator class="absolute left-1.5 inline-flex">
                <span class="i-carbon-dot-mark text-(--accent)" aria-hidden="true" />
              </DropdownMenuItemIndicator>
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark" :class="checkItemClass">
              <DropdownMenuItemIndicator class="absolute left-1.5 inline-flex">
                <span class="i-carbon-dot-mark text-(--accent)" aria-hidden="true" />
              </DropdownMenuItemIndicator>
              Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system" :class="checkItemClass">
              <DropdownMenuItemIndicator class="absolute left-1.5 inline-flex">
                <span class="i-carbon-dot-mark text-(--accent)" aria-hidden="true" />
              </DropdownMenuItemIndicator>
              System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator class="my-1 h-px bg-(--border)" />

          <DropdownMenuItem
            class="group flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm text-red-600 outline-none data-[highlighted]:bg-red-600 data-[highlighted]:text-white dark:text-red-400"
            @select="run('Sign out')"
          >
            <span class="i-carbon-logout" aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>

    <p class="text-xs text-(--fg-muted)">
      Theme: <span class="font-medium text-(--fg)">{{ theme }}</span>
      &middot; Status bar: <span class="font-medium text-(--fg)">{{ showStatusBar ? 'on' : 'off' }}</span>
      &middot; Activity bar: <span class="font-medium text-(--fg)">{{ showActivityBar ? 'on' : 'off' }}</span>
      <template v-if="lastAction">
        &middot; Last action: <span class="font-medium text-(--fg)">{{ lastAction }}</span>
      </template>
    </p>
  </div>
</template>
