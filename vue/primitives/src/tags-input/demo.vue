<script setup lang="ts">
import {
  TagsInputClear,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
  TagsInputRoot,
} from '@robonen/primitives';
import { ref } from 'vue';

const recipients = ref<string[]>(['ada@example.com', 'grace@example.com']);
const wasInvalid = ref(false);

function onInvalid() {
  wasInvalid.value = true;
  window.setTimeout(() => {
    wasInvalid.value = false;
  }, 1200);
}
</script>

<template>
  <div class="w-full max-w-md rounded-xl border border-(--border) bg-(--bg-elevated) p-6 text-(--fg)">
    <h3 class="text-base font-semibold">
      Invite teammates
    </h3>
    <p class="mt-1 text-sm text-(--fg-muted)">
      Type an address and press Enter, comma, or paste a list.
    </p>

    <!-- Root wraps the footer too: TagsInputClear must be a descendant to inject the context. -->
    <TagsInputRoot
      v-model="recipients"
      add-on-paste
      add-on-blur
      :max="5"
      delimiter=","
      class="group"
      @invalid="onInvalid"
    >
      <div class="mt-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-(--border) bg-(--bg) p-2 transition-colors focus-within:border-(--accent) focus-within:ring-2 focus-within:ring-(--ring) group-data-[invalid]:border-red-500 dark:group-data-[invalid]:border-red-400">
        <TagsInputItem
          v-for="tag in recipients"
          :key="tag"
          :value="tag"
          class="flex items-center gap-1 rounded-md bg-(--bg-subtle) py-0.5 pl-2 pr-1 text-sm text-(--fg) data-[state=active]:bg-(--accent) data-[state=active]:text-(--accent-fg)"
        >
          <TagsInputItemText class="leading-none" />
          <TagsInputItemDelete
            class="grid h-4 w-4 place-items-center rounded text-(--fg-subtle) transition-colors hover:bg-(--bg-inset) hover:text-(--fg)"
            aria-label="Remove"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </TagsInputItemDelete>
        </TagsInputItem>

        <TagsInputInput
          placeholder="name@company.com"
          class="min-w-32 flex-1 bg-transparent px-1 py-0.5 text-sm text-(--fg) outline-none placeholder:text-(--fg-subtle)"
        />
      </div>

      <div class="mt-3 flex items-center justify-between text-sm">
        <p
          class="font-medium transition-colors"
          :class="wasInvalid ? 'text-red-600 dark:text-red-400' : 'text-(--fg-subtle)'"
        >
          <span v-if="wasInvalid">Duplicate or limit reached</span>
          <span v-else>{{ recipients.length }} / 5 recipients</span>
        </p>

        <TagsInputClear
          class="rounded-md px-2 py-1 text-(--accent) transition-colors hover:bg-(--bg-inset) disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear all
        </TagsInputClear>
      </div>
    </TagsInputRoot>
  </div>
</template>
