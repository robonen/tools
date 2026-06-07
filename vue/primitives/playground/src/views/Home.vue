<script setup lang="ts">
import { demos } from '../router';
</script>

<template>
  <section class="max-w-3xl">
    <h1 class="mb-2 mt-0 text-2xl font-semibold">
      @robonen/primitives playground
    </h1>
    <p class="text-neutral-500 dark:text-neutral-400">
      Pick a demo from the sidebar, or drop a new <code class="rounded border border-neutral-200 bg-white px-1.5 py-px text-xs dark:border-neutral-800 dark:bg-neutral-900">.vue</code> file into
      <code class="rounded border border-neutral-200 bg-white px-1.5 py-px text-xs dark:border-neutral-800 dark:bg-neutral-900">src/demos/</code> — it will be picked up automatically and become
      addressable at <code class="rounded border border-neutral-200 bg-white px-1.5 py-px text-xs dark:border-neutral-800 dark:bg-neutral-900">/demo/&lt;FileName&gt;</code>.
    </p>

    <div class="mt-4 grid gap-2 grid-cols-[repeat(auto-fill,minmax(11.25rem,1fr))]">
      <RouterLink
        v-for="demo in demos"
        :key="demo.name"
        :to="demo.routePath"
        class="grid gap-1 rounded-lg border border-neutral-200 bg-white p-3 no-underline hover:border-blue-600 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-blue-400"
      >
        <strong>{{ demo.name }}</strong>
        <code class="text-neutral-500 dark:text-neutral-400">{{ demo.routePath }}</code>
      </RouterLink>
    </div>

    <p v-if="!demos.length" class="text-neutral-500 dark:text-neutral-400">
      No demos found yet.
    </p>
  </section>
</template>
