<script setup lang="ts">import { demos } from '#docs/demos';

const route = useRoute();
const { getItem } = useDocs();

const packageSlug = computed(() => route.params.package as string);
const utilitySlug = computed(() => route.params.utility as string);

const result = computed(() => getItem(packageSlug.value, utilitySlug.value));

if (!result.value) {
  throw createError({
    statusCode: 404,
    message: `Item "${utilitySlug.value}" not found in package "${packageSlug.value}"`,
  });
}

const { pkg, category, item } = result.value;

useHead({
  title: `${item.name} — ${pkg.name} — @robonen/tools`,
  meta: [
    { name: 'description', content: item.description },
  ],
});

const sourceUrl = computed(() => `https://github.com/robonen/tools/blob/main/${item.sourcePath}`);

const demoComponent = computed(() => {
  const key = `${pkg.slug}/${item.slug}`;
  return demos[key] ?? null;
});
</script>

<template>
  <div v-if="item" class="max-w-3xl min-w-0">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-1.5 text-sm text-(--color-text-mute) mb-6">
      <NuxtLink :to="`/${pkg.slug}`" class="hover:text-(--color-text-soft) transition-colors">
        {{ pkg.name }}
      </NuxtLink>
      <span>/</span>
      <span>{{ category.name }}</span>
      <span>/</span>
      <span class="text-(--color-text)">{{ item.name }}</span>
    </nav>

    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center gap-3 mb-2 flex-wrap">
        <DocsBadge :kind="item.kind" size="md" />
        <h1 class="text-2xl font-bold font-mono tracking-tight text-(--color-text)">
          {{ item.name }}
        </h1>
        <DocsTag v-if="item.since" :label="`v${item.since}`" variant="since" />
        <DocsTag v-if="item.hasTests" label="tested" variant="test" />
        <DocsTag v-if="item.hasDemo" label="demo" variant="demo" />
      </div>
      <p class="text-(--color-text-soft) leading-relaxed">
        {{ item.description }}
      </p>

      <!-- Links (source, tests) -->
      <div class="flex items-center gap-4 mt-3 text-sm">
        <a
          :href="sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1.5 text-(--color-text-mute) hover:text-(--color-text) transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
          Source
        </a>
        <a
          v-if="item.hasTests"
          :href="`${sourceUrl.replace('index.ts', 'index.test.ts')}`"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1.5 text-(--color-text-mute) hover:text-(--color-text) transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="m9 15 2 2 4-4" />
          </svg>
          Tests
        </a>
      </div>
    </div>

    <!-- Examples (moved to top for quick reference) -->
    <section v-if="item.examples.length > 0" class="mb-8">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-(--color-text-mute) mb-3">
        {{ item.examples.length > 1 ? 'Examples' : 'Example' }}
      </h2>
      <div class="space-y-3">
        <DocsCode v-for="(example, i) in item.examples" :key="i" :code="example" />
      </div>
    </section>

    <!-- Demo -->
    <section v-if="item.hasDemo && demoComponent" class="mb-8">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-(--color-text-mute) mb-3">
        Demo
      </h2>
      <DocsDemo :component="demoComponent" :source="item.demoSource" />
    </section>

    <!-- Signatures -->
    <section v-if="item.signatures.length > 0" class="mb-8">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-(--color-text-mute) mb-3">
        {{ item.signatures.length > 1 ? 'Signatures' : 'Signature' }}
      </h2>
      <div class="space-y-2">
        <DocsCode v-for="(sig, i) in item.signatures" :key="i" :code="sig" />
      </div>
    </section>

    <!-- Type Parameters -->
    <section v-if="item.typeParams.length > 0" class="mb-8">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-(--color-text-mute) mb-3">
        Type Parameters
      </h2>
      <div class="space-y-2">
        <div
          v-for="tp in item.typeParams"
          :key="tp.name"
          class="flex items-baseline gap-2 text-sm"
        >
          <code class="font-mono font-medium text-brand-600">{{ tp.name }}</code>
          <span v-if="tp.constraint" class="text-(--color-text-mute)">
            extends <code class="font-mono text-xs">{{ tp.constraint }}</code>
          </span>
          <span v-if="tp.default" class="text-(--color-text-mute)">
            = <code class="font-mono text-xs">{{ tp.default }}</code>
          </span>
        </div>
      </div>
    </section>

    <!-- Parameters -->
    <section v-if="item.params.length > 0" class="mb-8">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-(--color-text-mute) mb-3">
        Parameters
      </h2>
      <DocsParamsTable :params="item.params" />
    </section>

    <!-- Return value -->
    <section v-if="item.returns" class="mb-8">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-(--color-text-mute) mb-3">
        Returns
      </h2>
      <div class="flex items-baseline gap-2 text-sm">
        <code class="font-mono bg-(--color-bg-mute) px-2 py-1 rounded text-xs break-all">{{ item.returns.type }}</code>
        <span v-if="item.returns.description" class="text-(--color-text-soft)">{{ item.returns.description }}</span>
      </div>
    </section>

    <!-- Properties (interfaces, classes) -->
    <section v-if="item.properties.length > 0" class="mb-8">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-(--color-text-mute) mb-3">
        Properties
      </h2>
      <DocsPropsTable :properties="item.properties" />
    </section>

    <!-- Methods (classes) -->
    <section v-if="item.methods.length > 0" class="mb-8">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-(--color-text-mute) mb-3">
        Methods
      </h2>
      <DocsMethodsList :methods="item.methods" />
    </section>

    <!-- Related Types -->
    <section v-if="item.relatedTypes?.length" class="mb-8">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-(--color-text-mute) mb-3">
        Related Types
      </h2>
      <div class="space-y-4">
        <div
          v-for="rt in item.relatedTypes"
          :key="rt.name"
          class="border border-(--color-border) rounded-lg p-4 bg-(--color-bg-soft)"
        >
          <div class="flex items-center gap-2 mb-2">
            <DocsBadge :kind="rt.kind" size="sm" />
            <h3 class="font-mono font-semibold text-sm">{{ rt.name }}</h3>
          </div>
          <p v-if="rt.description" class="text-sm text-(--color-text-soft) mb-3">
            {{ rt.description }}
          </p>
          <DocsCode v-if="rt.signatures.length > 0" :code="rt.signatures[0]!" />
          <DocsPropsTable v-if="rt.properties.length > 0" :properties="rt.properties" class="mt-3" />
        </div>
      </div>
    </section>
  </div>
</template>
