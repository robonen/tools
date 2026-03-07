<script setup lang="ts">const { getPackages, getTotalItems } = useDocs();
const packages = getPackages();
const totalItems = getTotalItems();

const packageIcons: Record<string, string> = {
  stdlib: '📦',
  platform: '🖥️',
  vue: '💚',
  oxlint: '🔍',
};
</script>

<template>
  <div class="max-w-3xl min-w-0">
    <!-- Hero -->
    <div class="mb-12">
      <h1 class="text-3xl font-bold tracking-tight text-(--color-text) mb-3">
        @robonen/tools
      </h1>
      <p class="text-lg text-(--color-text-soft) leading-relaxed">
        A collection of TypeScript utilities, Vue composables, and developer tools.
        Auto-generated documentation from source types and JSDoc annotations.
      </p>
      <div class="mt-4 flex items-center gap-4 text-sm text-(--color-text-mute)">
        <span>{{ packages.length }} packages</span>
        <span>·</span>
        <span>{{ totalItems }} documented items</span>
      </div>
    </div>

    <!-- Package cards -->
    <div class="grid gap-4 sm:grid-cols-2">
      <NuxtLink
        v-for="pkg in packages"
        :key="pkg.slug"
        :to="`/${pkg.slug}`"
        class="group block p-5 rounded-xl border border-(--color-border) hover:border-brand-300 hover:shadow-sm transition-all bg-(--color-bg)"
      >
        <div class="flex items-start gap-3">
          <span class="text-2xl">{{ packageIcons[pkg.slug] ?? '📦' }}</span>
          <div class="min-w-0">
            <h2 class="font-semibold text-(--color-text) group-hover:text-brand-600 transition-colors">
              {{ pkg.name }}
            </h2>
            <p class="text-sm text-(--color-text-soft) mt-1">
              {{ pkg.description }}
            </p>
            <div class="mt-3 flex items-center gap-3 text-xs text-(--color-text-mute)">
              <span>v{{ pkg.version }}</span>
              <span>·</span>
              <span>{{ pkg.categories.reduce((sum, c) => sum + c.items.length, 0) }} items</span>
              <span>·</span>
              <span>{{ pkg.categories.length }} categories</span>
            </div>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Quick start -->
    <div class="mt-12">
      <h2 class="text-lg font-semibold text-(--color-text) mb-4">
        Quick Start
      </h2>
      <div class="space-y-3">
        <div v-for="pkg in packages" :key="pkg.slug">
          <DocsCode :code="`pnpm add ${pkg.name}`" lang="bash" />
        </div>
      </div>
    </div>
  </div>
</template>
