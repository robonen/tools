<script setup lang="ts">
import { ref } from 'vue';
import {
  EditableArea,
  EditableCancelTrigger,
  EditableEditTrigger,
  EditableInput,
  EditablePreview,
  EditableRoot,
  EditableSubmitTrigger,
} from '@robonen/primitives';

const name = ref('Ada Lovelace');
</script>

<template>
  <div class="w-full max-w-sm rounded-xl border border-(--border) bg-(--bg-elevated) p-4 text-(--fg)">
    <span class="mb-2 block text-xs font-medium text-(--fg-muted)">Display name</span>

    <EditableRoot
      v-model="name"
      submit-mode="both"
      select-on-focus
      activation-mode="dblclick"
      placeholder="Add your name…"
      class="flex items-center gap-2"
    >
      <EditableArea class="flex-1">
        <EditablePreview
          class="block w-full cursor-text rounded-md px-2 py-1.5 outline-none transition hover:bg-(--bg-inset) data-[placeholder-shown]:text-(--fg-subtle) focus-visible:ring-2 focus-visible:ring-(--ring)"
        />
        <EditableInput
          class="w-full rounded-md border border-(--border) bg-(--bg) px-2 py-1.5 text-(--fg) outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
        />
      </EditableArea>

      <EditableEditTrigger
        class="inline-flex h-8 items-center rounded-md border border-(--border) bg-(--bg) px-2.5 text-sm text-(--fg-muted) transition hover:bg-(--bg-inset) hover:text-(--fg) active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
      >
        Edit
      </EditableEditTrigger>

      <EditableSubmitTrigger
        class="inline-flex h-8 items-center rounded-md bg-(--accent) px-2.5 text-sm font-medium text-(--accent-fg) transition hover:bg-(--accent-hover) active:scale-95 cursor-pointer"
      >
        Save
      </EditableSubmitTrigger>

      <EditableCancelTrigger
        class="inline-flex h-8 items-center rounded-md border border-(--border) bg-(--bg) px-2.5 text-sm text-(--fg-muted) transition hover:bg-(--bg-inset) hover:text-(--fg) active:scale-95 cursor-pointer"
      >
        Cancel
      </EditableCancelTrigger>
    </EditableRoot>

    <p class="mt-3 text-xs text-(--fg-subtle)">
      Double-click the name to edit. Enter or blur saves, Escape cancels.
    </p>
  </div>
</template>
