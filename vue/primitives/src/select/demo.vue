<script setup lang="ts">
import { ref } from 'vue';
import {
  SelectContent,
  SelectGroup,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectLabel,
  SelectPortal,
  SelectRoot,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from '@robonen/primitives';

const value = ref<string | undefined>('cat');

const animals = {
  Pets: [
    { value: 'cat', label: 'Cat' },
    { value: 'dog', label: 'Dog' },
    { value: 'rabbit', label: 'Rabbit' },
    { value: 'hamster', label: 'Hamster', disabled: true },
  ],
  Wild: [
    { value: 'lion', label: 'Lion' },
    { value: 'tiger', label: 'Tiger' },
    { value: 'bear', label: 'Bear' },
    { value: 'wolf', label: 'Wolf' },
    { value: 'fox', label: 'Fox' },
  ],
};

const itemClass
  = 'relative flex cursor-default select-none items-center rounded-md py-1.5 pl-7 pr-2 text-sm text-(--fg) outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 focus:bg-(--accent) focus:text-(--accent-fg)';
</script>

<template>
  <div class="flex flex-col items-start gap-3 text-(--fg)">
    <SelectRoot v-model="value" name="animal">
      <SelectTrigger
        class="inline-flex w-56 items-center justify-between gap-2 rounded-lg border border-(--border) bg-(--bg) px-3 py-2 text-sm text-(--fg) transition-colors hover:bg-(--bg-subtle) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) data-[placeholder]:text-(--fg-subtle)"
      >
        <SelectValue placeholder="Pick an animal…" />
        <SelectIcon class="text-(--fg-muted)">
          <span class="i-carbon-chevron-down block" aria-hidden="true" />
        </SelectIcon>
      </SelectTrigger>

      <SelectPortal>
        <SelectContent
          position="popper"
          :side-offset="6"
          class="z-50 w-[var(--popper-anchor-width)] min-w-56 overflow-hidden rounded-lg border border-(--border) bg-(--bg-elevated) shadow-lg"
        >
          <SelectScrollUpButton class="flex h-6 items-center justify-center bg-(--bg-elevated) text-(--fg-muted)">
            <span class="i-carbon-chevron-up block" aria-hidden="true" />
          </SelectScrollUpButton>

          <SelectViewport class="max-h-60 p-1">
            <template v-for="(items, group, gi) in animals" :key="group">
              <SelectSeparator v-if="gi > 0" class="my-1 h-px bg-(--border)" />
              <SelectGroup>
                <SelectLabel class="px-2 py-1.5 text-xs font-medium text-(--fg-subtle)">
                  {{ group }}
                </SelectLabel>
                <SelectItem
                  v-for="item in items"
                  :key="item.value"
                  :value="item.value"
                  :disabled="item.disabled"
                  :class="itemClass"
                >
                  <SelectItemIndicator class="absolute left-2 inline-flex items-center">
                    <span class="i-carbon-checkmark block text-(--accent)" aria-hidden="true" />
                  </SelectItemIndicator>
                  <SelectItemText>{{ item.label }}</SelectItemText>
                </SelectItem>
              </SelectGroup>
            </template>
          </SelectViewport>

          <SelectScrollDownButton class="flex h-6 items-center justify-center bg-(--bg-elevated) text-(--fg-muted)">
            <span class="i-carbon-chevron-down block" aria-hidden="true" />
          </SelectScrollDownButton>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>

    <p class="text-xs text-(--fg-muted)">
      Selected:
      <span class="font-medium text-(--fg)">{{ value ?? 'none' }}</span>
    </p>
  </div>
</template>
