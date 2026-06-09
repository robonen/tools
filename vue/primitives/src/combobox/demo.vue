<script setup lang="ts">
import { ref } from 'vue';

import {
  ComboboxAnchor,
  ComboboxCancel,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxLabel,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from '@robonen/primitives';

interface Framework {
  value: string;
  label: string;
  group: 'JavaScript' | 'Native';
}

const frameworks: Framework[] = [
  { value: 'vue', label: 'Vue', group: 'JavaScript' },
  { value: 'react', label: 'React', group: 'JavaScript' },
  { value: 'svelte', label: 'Svelte', group: 'JavaScript' },
  { value: 'solid', label: 'Solid', group: 'JavaScript' },
  { value: 'angular', label: 'Angular', group: 'JavaScript' },
  { value: 'swiftui', label: 'SwiftUI', group: 'Native' },
  { value: 'compose', label: 'Jetpack Compose', group: 'Native' },
  { value: 'flutter', label: 'Flutter', group: 'Native' },
];

const selected = ref<string>();

function labelFor(value: string | undefined) {
  return frameworks.find(f => f.value === value)?.label ?? '';
}

const groups = ['JavaScript', 'Native'] as const;
</script>

<template>
  <div class="flex w-full max-w-xs flex-col gap-3">
    <ComboboxRoot
      v-model="selected"
      :display-value="labelFor"
      class="relative"
    >
      <ComboboxAnchor
        class="flex items-center gap-1 rounded-lg border border-(--border) bg-(--bg-inset) px-2 py-1.5 focus-within:border-(--accent) focus-within:ring-2 focus-within:ring-(--ring)"
      >
        <ComboboxInput
          placeholder="Search a framework..."
          open-on-click
          class="min-w-0 flex-1 bg-transparent px-1 text-sm text-(--fg) outline-none placeholder:text-(--fg-subtle)"
        />

        <ComboboxCancel
          class="grid size-5 place-items-center rounded text-(--fg-subtle) hover:bg-(--bg-subtle) hover:text-(--fg)"
        >
          <span aria-hidden="true" class="text-xs">✕</span>
        </ComboboxCancel>

        <ComboboxTrigger
          class="grid size-5 place-items-center rounded text-(--fg-muted) hover:bg-(--bg-subtle) hover:text-(--fg) data-[state=open]:rotate-180"
        >
          <span aria-hidden="true" class="text-xs">▾</span>
        </ComboboxTrigger>
      </ComboboxAnchor>

      <ComboboxPortal>
        <ComboboxContent
          :side-offset="6"
          class="z-50 w-(--popper-anchor-width) overflow-hidden rounded-lg border border-(--border) bg-(--bg-elevated) shadow-lg"
        >
          <ComboboxViewport class="max-h-60 p-1">
            <ComboboxEmpty class="px-3 py-6 text-center text-sm text-(--fg-subtle)">
              No frameworks found.
            </ComboboxEmpty>

            <ComboboxGroup
              v-for="group in groups"
              :key="group"
              class="mb-1 last:mb-0"
            >
              <ComboboxLabel
                class="px-2 py-1 text-xs font-medium uppercase tracking-wide text-(--fg-subtle)"
              >
                {{ group }}
              </ComboboxLabel>

              <ComboboxItem
                v-for="framework in frameworks.filter(f => f.group === group)"
                :key="framework.value"
                :value="framework.value"
                :text-value="framework.label"
                class="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-sm text-(--fg) outline-none data-[highlighted]:bg-(--accent) data-[highlighted]:text-(--accent-fg) data-[disabled]:opacity-50"
              >
                <span>{{ framework.label }}</span>
                <ComboboxItemIndicator>
                  <span aria-hidden="true">✓</span>
                </ComboboxItemIndicator>
              </ComboboxItem>
            </ComboboxGroup>
          </ComboboxViewport>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>

    <p class="text-sm text-(--fg-muted)">
      Selected:
      <span class="font-medium text-(--fg)">{{ selected ? labelFor(selected) : 'none' }}</span>
    </p>
  </div>
</template>
