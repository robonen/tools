<script setup lang="ts">
import { Separator } from '@robonen/primitives';
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-5 rounded-xl border border-(--border) bg-(--bg-elevated) p-5 text-(--fg)">
    <div>
      <h3 class="text-sm font-semibold">
        Vue Primitives
      </h3>
      <p class="text-sm text-(--fg-muted)">
        Headless, accessible building blocks.
      </p>
    </div>

    <Separator class="h-px bg-(--border)" />

    <div class="flex flex-col gap-3">
      <p class="text-sm text-(--fg-subtle)">
        Read the docs, browse the source, or join the community.
      </p>

      <div class="flex h-5 items-center gap-3 text-sm">
        <a
          href="#"
          class="text-(--accent) hover:text-(--accent-hover)"
          @click.prevent
        >Docs</a>
        <Separator
          orientation="vertical"
          decorative
          class="w-px bg-(--border)"
        />
        <a
          href="#"
          class="text-(--accent) hover:text-(--accent-hover)"
          @click.prevent
        >Source</a>
        <Separator
          orientation="vertical"
          decorative
          class="w-px bg-(--border)"
        />
        <a
          href="#"
          class="text-(--accent) hover:text-(--accent-hover)"
          @click.prevent
        >Community</a>
      </div>
    </div>
  </div>
</template>
