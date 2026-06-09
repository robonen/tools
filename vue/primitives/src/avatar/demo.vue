<script setup lang="ts">
import { AvatarFallback, AvatarImage, AvatarRoot } from '@robonen/primitives';

const people = [
  {
    name: 'Ada Lovelace',
    initials: 'AL',
    src: 'https://i.pravatar.cc/96?img=47',
  },
  {
    name: 'Alan Turing',
    initials: 'AT',
    src: 'https://example.com/this-image-does-not-exist.png',
  },
  {
    name: 'Grace Hopper',
    initials: 'GH',
    src: '',
  },
] as const;
</script>

<template>
  <div class="flex items-center gap-4">
    <div
      v-for="person in people"
      :key="person.name"
      class="flex flex-col items-center gap-2"
    >
      <AvatarRoot
        class="relative inline-flex h-14 w-14 select-none items-center justify-center overflow-hidden rounded-full border border-(--border) bg-(--bg-subtle) align-middle"
      >
        <AvatarImage
          :src="person.src"
          :alt="person.name"
          class="h-full w-full rounded-[inherit] object-cover"
        />
        <AvatarFallback
          :delay-ms="200"
          class="flex h-full w-full items-center justify-center bg-(--bg-inset) text-sm font-medium text-(--fg-muted)"
        >
          {{ person.initials }}
        </AvatarFallback>
      </AvatarRoot>
      <span class="text-xs text-(--fg-subtle)">{{ person.name }}</span>
    </div>
  </div>
</template>
