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
  icon: string;
  keywords?: string[];
  shortcut?: string;
}

const navigation: Action[] = [
  { value: 'home', label: 'Go to Dashboard', icon: 'i-carbon-dashboard', keywords: ['overview', 'start'] },
  { value: 'projects', label: 'Open Projects', icon: 'i-carbon-folder', keywords: ['repos', 'work'] },
  { value: 'settings', label: 'Open Settings', icon: 'i-carbon-settings', keywords: ['preferences', 'config'], shortcut: ',' },
];

const actions: Action[] = [
  { value: 'new-file', label: 'Create new file', icon: 'i-carbon-document-add', keywords: ['add'], shortcut: 'N' },
  { value: 'invite', label: 'Invite teammate', icon: 'i-carbon-user-follow', keywords: ['member', 'share'] },
  { value: 'theme', label: 'Toggle dark mode', icon: 'i-carbon-moon', keywords: ['appearance', 'light'] },
  { value: 'archive', label: 'Archive workspace', icon: 'i-carbon-archive', keywords: ['delete'] },
];

const selected = ref<string>();
const lastRun = ref<string>();

function run(value: string) {
  lastRun.value = value;
}
</script>

<template>
  <div class="flex flex-col items-center gap-4 p-6 bg-(--bg-inset) text-(--fg)">
    <CommandRoot
      v-model="selected"
      label="Command palette"
      loop
      class="w-full max-w-100 overflow-hidden rounded-xl border border-(--border) bg-(--bg-elevated) shadow-lg"
    >
      <template #default="{ filteredCount }">
        <!-- Search -->
        <div class="flex items-center gap-2 border-b border-(--border) px-3">
          <span class="i-carbon-search shrink-0 text-(--fg-subtle)" aria-hidden="true" />
          <CommandInput
            auto-focus
            placeholder="Type a command or search…"
            class="w-full bg-transparent py-3 text-sm text-(--fg) outline-none placeholder:text-(--fg-subtle)"
          />
          <span class="shrink-0 text-xs tabular-nums text-(--fg-subtle)">{{ filteredCount }}</span>
        </div>

        <!-- Results -->
        <CommandList class="max-h-72 overflow-y-auto p-2">
          <CommandEmpty class="px-3 py-8 text-center text-sm text-(--fg-muted)">
            No results found.
          </CommandEmpty>

          <CommandGroup
            heading="Navigation"
            class="[&_[data-primitives-command-group-heading]]:px-2 [&_[data-primitives-command-group-heading]]:pb-1 [&_[data-primitives-command-group-heading]]:pt-2 [&_[data-primitives-command-group-heading]]:text-xs [&_[data-primitives-command-group-heading]]:font-medium [&_[data-primitives-command-group-heading]]:text-(--fg-subtle)"
          >
            <template #default>
              <CommandItem
                v-for="item in navigation"
                :key="item.value"
                :value="item.value"
                :keywords="item.keywords"
                class="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[state=selected]:bg-(--accent) data-[state=selected]:text-(--accent-fg)"
                @select="run"
              >
                <template #default="{ selected: isSelected }">
                  <span :class="item.icon" class="shrink-0 text-(--fg-muted) group-data-[state=selected]:text-(--accent-fg)" aria-hidden="true" />
                  <span class="flex-1">{{ item.label }}</span>
                  <kbd
                    v-if="item.shortcut"
                    class="rounded border border-(--border) bg-(--bg-subtle) px-1.5 text-xs text-(--fg-muted) group-data-[state=selected]:border-transparent"
                  >⌘{{ item.shortcut }}</kbd>
                  <span v-if="isSelected" class="i-carbon-checkmark text-emerald-500 dark:text-emerald-400" aria-hidden="true" />
                </template>
              </CommandItem>
            </template>
          </CommandGroup>

          <CommandSeparator class="my-2 h-px bg-(--border)" />

          <CommandGroup
            heading="Actions"
            class="[&_[data-primitives-command-group-heading]]:px-2 [&_[data-primitives-command-group-heading]]:pb-1 [&_[data-primitives-command-group-heading]]:pt-2 [&_[data-primitives-command-group-heading]]:text-xs [&_[data-primitives-command-group-heading]]:font-medium [&_[data-primitives-command-group-heading]]:text-(--fg-subtle)"
          >
            <template #default>
              <CommandItem
                v-for="item in actions"
                :key="item.value"
                :value="item.value"
                :keywords="item.keywords"
                :disabled="item.value === 'archive'"
                class="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[state=selected]:bg-(--accent) data-[state=selected]:text-(--accent-fg) data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
                @select="run"
              >
                <span :class="item.icon" class="shrink-0 text-(--fg-muted) group-data-[state=selected]:text-(--accent-fg)" aria-hidden="true" />
                <span class="flex-1">{{ item.label }}</span>
                <span v-if="item.value === 'archive'" class="text-xs text-red-500 dark:text-red-400">disabled</span>
                <kbd
                  v-else-if="item.shortcut"
                  class="rounded border border-(--border) bg-(--bg-subtle) px-1.5 text-xs text-(--fg-muted) group-data-[state=selected]:border-transparent"
                >⌘{{ item.shortcut }}</kbd>
              </CommandItem>
            </template>
          </CommandGroup>
        </CommandList>
      </template>
    </CommandRoot>

    <p class="text-sm text-(--fg-muted)">
      <template v-if="lastRun">
        Ran: <code class="rounded bg-(--bg-subtle) px-1.5 py-0.5 font-medium text-(--fg)">{{ lastRun }}</code>
      </template>
      <template v-else>
        Use ↑ ↓ to navigate, Enter to run.
      </template>
    </p>
  </div>
</template>
