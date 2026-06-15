<script setup lang="ts">
import { ref } from 'vue';

import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandRoot,
  CommandSeparator,
} from '@robonen/primitives';

interface Action {
  value: string;
  label: string;
  /** Inline-SVG path data (24×24 viewBox, stroked with `currentColor`). */
  icon: string;
  keywords?: string[];
  shortcut?: string;
}

const navigation: Action[] = [
  { value: 'home', label: 'Go to Dashboard', icon: 'M3 3h8v8H3z M13 3h8v8h-8z M13 13h8v8h-8z M3 13h8v8H3z', keywords: ['overview', 'start'] },
  { value: 'projects', label: 'Open Projects', icon: 'M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z', keywords: ['repos', 'work'] },
  { value: 'settings', label: 'Open Settings', icon: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M2 14h4 M10 8h4 M18 16h4', keywords: ['preferences', 'config'], shortcut: ',' },
];

const actions: Action[] = [
  { value: 'new-file', label: 'Create new file', icon: 'M13 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9z M13 3v6h6 M12 12v6 M9 15h6', keywords: ['add'], shortcut: 'N' },
  { value: 'invite', label: 'Invite teammate', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M19 8v6 M22 11h-6', keywords: ['member', 'share'] },
  { value: 'theme', label: 'Toggle dark mode', icon: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z', keywords: ['appearance', 'light'] },
  { value: 'archive', label: 'Archive workspace', icon: 'M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z M3 4h18v4H3z M10 12h4', keywords: ['delete'] },
];

const selected = ref<string>();
const lastRun = ref<string>();

function run(value: string) {
  lastRun.value = value;
}
</script>

<template>
  <div class="flex flex-col items-center gap-4 p-6 bg-bg-inset text-fg">
    <CommandRoot
      v-model="selected"
      label="Command palette"
      loop
      class="demo-card w-full max-w-100 overflow-hidden shadow-lg"
    >
      <template #default="{ filteredCount }">
        <!-- Search -->
        <div class="flex items-center gap-2.5 border-b border-border px-3.5">
          <svg
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
            stroke-linecap="round" stroke-linejoin="round"
            class="size-4 shrink-0 text-fg-subtle" aria-hidden="true"
          >
            <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z M21 21l-4.3-4.3" />
          </svg>
          <CommandInput
            auto-focus
            placeholder="Type a command or search…"
            class="w-full bg-transparent py-3 text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
          <span class="shrink-0 rounded bg-bg-subtle px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-fg-subtle">{{ filteredCount }}</span>
        </div>

        <!-- Results -->
        <CommandList class="max-h-72 overflow-y-auto p-2">
          <CommandEmpty class="px-3 py-10 text-center text-sm text-fg-muted">
            No results found.
          </CommandEmpty>

          <CommandGroup
            heading="Navigation"
            class="[&_[data-primitives-command-group-heading]]:px-2 [&_[data-primitives-command-group-heading]]:pb-1 [&_[data-primitives-command-group-heading]]:pt-2 [&_[data-primitives-command-group-heading]]:text-xs [&_[data-primitives-command-group-heading]]:font-medium [&_[data-primitives-command-group-heading]]:text-fg-subtle"
          >
            <template #default>
              <CommandItem
                v-for="item in navigation"
                :key="item.value"
                :value="item.value"
                :text-value="item.label"
                :keywords="item.keywords"
                class="group flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm data-[state=selected]:bg-accent data-[state=selected]:text-accent-fg"
                @select="run"
              >
                <template #default="{ selected: isSelected }">
                  <svg
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
                    stroke-linecap="round" stroke-linejoin="round"
                    class="size-4 shrink-0 text-fg-muted group-data-[state=selected]:text-accent-fg" aria-hidden="true"
                  >
                    <path :d="item.icon" />
                  </svg>
                  <span class="flex-1">{{ item.label }}</span>
                  <kbd
                    v-if="item.shortcut"
                    class="rounded border border-border bg-bg-subtle px-1.5 text-xs text-fg-muted group-data-[state=selected]:border-transparent group-data-[state=selected]:bg-transparent group-data-[state=selected]:text-accent-fg"
                  >⌘{{ item.shortcut }}</kbd>
                  <svg
                    v-if="isSelected"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25"
                    stroke-linecap="round" stroke-linejoin="round"
                    class="size-4 shrink-0 text-emerald-500 group-data-[state=selected]:text-accent-fg dark:text-emerald-400" aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </template>
              </CommandItem>
            </template>
          </CommandGroup>

          <CommandSeparator class="my-2 h-px bg-border" />

          <CommandGroup
            heading="Actions"
            class="[&_[data-primitives-command-group-heading]]:px-2 [&_[data-primitives-command-group-heading]]:pb-1 [&_[data-primitives-command-group-heading]]:pt-2 [&_[data-primitives-command-group-heading]]:text-xs [&_[data-primitives-command-group-heading]]:font-medium [&_[data-primitives-command-group-heading]]:text-fg-subtle"
          >
            <template #default>
              <CommandItem
                v-for="item in actions"
                :key="item.value"
                :value="item.value"
                :text-value="item.label"
                :keywords="item.keywords"
                :disabled="item.value === 'archive'"
                class="group flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm data-[state=selected]:bg-accent data-[state=selected]:text-accent-fg data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
                @select="run"
              >
                <svg
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
                  stroke-linecap="round" stroke-linejoin="round"
                  class="size-4 shrink-0 text-fg-muted group-data-[state=selected]:text-accent-fg" aria-hidden="true"
                >
                  <path :d="item.icon" />
                </svg>
                <span class="flex-1">{{ item.label }}</span>
                <span v-if="item.value === 'archive'" class="rounded bg-bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-fg-subtle">soon</span>
                <kbd
                  v-else-if="item.shortcut"
                  class="rounded border border-border bg-bg-subtle px-1.5 text-xs text-fg-muted group-data-[state=selected]:border-transparent group-data-[state=selected]:bg-transparent group-data-[state=selected]:text-accent-fg"
                >⌘{{ item.shortcut }}</kbd>
              </CommandItem>
            </template>
          </CommandGroup>
        </CommandList>
      </template>
    </CommandRoot>

    <p class="text-sm text-fg-muted">
      <template v-if="lastRun">
        Ran: <code class="rounded bg-bg-subtle px-1.5 py-0.5 font-medium text-fg">{{ lastRun }}</code>
      </template>
      <template v-else>
        Use ↑ ↓ to navigate, Enter to run.
      </template>
    </p>
  </div>
</template>
