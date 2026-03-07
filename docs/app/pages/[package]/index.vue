<script setup lang="ts">const route = useRoute();
const { getPackage } = useDocs();

const slug = computed(() => route.params.package as string);
const pkg = computed(() => getPackage(slug.value));

if (!pkg.value) {
  throw createError({ statusCode: 404, message: `Package "${slug.value}" not found` });
}

useHead({
  title: `${pkg.value.name} — @robonen/tools`,
});
</script>

<template>
  <div v-if="pkg" class="max-w-3xl min-w-0">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center gap-3 mb-2">
        <h1 class="text-2xl font-bold tracking-tight text-(--color-text)">
          {{ pkg.name }}
        </h1>
        <DocsTag :label="`v${pkg.version}`" variant="since" />
      </div>
      <p class="text-(--color-text-soft)">
        {{ pkg.description }}
      </p>
    </div>

    <!-- Install -->
    <div class="mb-8">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-(--color-text-mute) mb-2">
        Installation
      </h2>
      <DocsCode :code="`pnpm add ${pkg.name}`" lang="bash" />
    </div>

    <!-- Categories -->
    <div v-for="category in pkg.categories" :key="category.slug" class="mb-8">
      <h2 class="text-lg font-semibold text-(--color-text) mb-4 pb-2 border-b border-(--color-border)">
        {{ category.name }}
      </h2>

      <div class="grid gap-2">
        <NuxtLink
          v-for="item in category.items"
          :key="item.slug"
          :to="`/${pkg.slug}/${item.slug}`"
          class="group flex items-center gap-3 p-3 rounded-lg border border-(--color-border) hover:border-brand-300 hover:bg-(--color-bg-soft) transition-all"
        >
          <DocsBadge :kind="item.kind" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm font-medium text-(--color-text) group-hover:text-brand-600 transition-colors">
                {{ item.name }}
              </span>
              <DocsTag v-if="item.since" :label="`v${item.since}`" variant="since" />
              <DocsTag v-if="item.hasTests" label="tested" variant="test" />
              <DocsTag v-if="item.hasDemo" label="demo" variant="demo" />
            </div>
            <p v-if="item.description" class="text-sm text-(--color-text-mute) mt-0.5 truncate">
              {{ item.description }}
            </p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-(--color-text-mute) group-hover:text-brand-600 transition-colors shrink-0">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
