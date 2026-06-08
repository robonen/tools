<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <section class="grid max-w-md gap-2">
    <h1 class="m-0 text-3xl font-semibold">
      404
    </h1>
    <p>
      No demo matches <code class="rounded border border-neutral-200 bg-white px-1.5 py-px dark:border-neutral-800 dark:bg-neutral-900">{{ route.fullPath }}</code>.
    </p>
    <RouterLink to="/" class="text-blue-600 hover:underline dark:text-blue-400">
      ← Back to index
    </RouterLink>
  </section>
</template>
