<script setup lang="ts">
import { ref } from 'vue';
import { TreeItem, TreeRoot } from '@robonen/primitives';

interface Node {
  key: string;
  label: string;
  children?: Node[];
}

const items: Node[] = [
  {
    key: 'src',
    label: 'src',
    children: [
      {
        key: 'components',
        label: 'components',
        children: [
          { key: 'button.vue', label: 'Button.vue' },
          { key: 'input.vue', label: 'Input.vue' },
        ],
      },
      {
        key: 'composables',
        label: 'composables',
        children: [
          { key: 'use-tree.ts', label: 'useTree.ts' },
          { key: 'use-theme.ts', label: 'useTheme.ts' },
        ],
      },
      { key: 'main.ts', label: 'main.ts' },
    ],
  },
  {
    key: 'public',
    label: 'public',
    children: [{ key: 'favicon.ico', label: 'favicon.ico' }],
  },
  { key: 'readme.md', label: 'README.md' },
];

const selected = ref<string>('button.vue');
const expanded = ref<string[]>(['src', 'components']);
</script>

<template>
  <TreeRoot
    v-model="selected"
    v-model:expanded="expanded"
    :items="items"
    :get-key="(item) => item.key"
    :get-children="(item) => item.children"
    class="w-full max-w-xs select-none rounded-lg border border-(--border) bg-(--bg) p-1.5 text-(--fg)"
  >
    <template #default="{ flatItems }">
      <TreeItem
        v-for="item in flatItems"
        :key="item.key"
        :item="item"
        :style="{ paddingLeft: `${(item.level - 1) * 16 + 8}px` }"
        class="flex items-center gap-1.5 rounded-md py-1.5 pr-2 text-sm outline-none transition-colors hover:bg-(--bg-subtle) focus-visible:ring-2 focus-visible:ring-(--ring) data-[selected]:bg-(--accent) data-[selected]:text-(--accent-fg)"
      >
        <template #default="{ isExpanded }">
          <svg
            v-if="item.hasChildren"
            class="size-3.5 shrink-0 text-(--fg-subtle) transition-transform duration-150"
            :class="{ 'rotate-90': isExpanded }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="9 6 15 12 9 18" />
          </svg>
          <svg
            v-else
            class="size-3.5 shrink-0 text-(--fg-subtle)"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span class="truncate">{{ item.value.label }}</span>
        </template>
      </TreeItem>
    </template>
  </TreeRoot>
</template>
