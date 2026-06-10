<script setup lang="ts">const { getGroupedPackages, getPackage, getIntro, getDocSections } = useDocs();
const groups = getGroupedPackages();

const route = useRoute();
const isSidebarOpen = ref(false);

const currentPackageSlug = computed(() => {
  const param = route.params.package;
  return typeof param === 'string' ? param : undefined;
});

const currentPackage = computed(() =>
  currentPackageSlug.value ? getPackage(currentPackageSlug.value) : undefined,
);

function isActive(pkgSlug: string, slug: string) {
  return route.path === `/${pkgSlug}/${slug}`;
}

// ── Category tree: collapsed by default, filterable ───────────────────────
const navQuery = ref('');
const openCategories = ref(new Set<string>());

function toggleCategory(slug: string) {
  if (openCategories.value.has(slug))
    openCategories.value.delete(slug);
  else
    openCategories.value.add(slug);

  openCategories.value = new Set(openCategories.value);
}

// Auto-open the category that contains the current page
watch([currentPackage, () => route.path], () => {
  const pkg = currentPackage.value;

  if (!pkg || pkg.kind !== 'api') return;

  for (const category of pkg.categories) {
    if (category.items.some(item => isActive(pkg.slug, item.slug)))
      openCategories.value.add(category.slug);
  }

  openCategories.value = new Set(openCategories.value);
}, { immediate: true });

// Reset the filter when navigating to another package
watch(currentPackageSlug, () => {
  navQuery.value = '';
});

const visibleCategories = computed(() => {
  const pkg = currentPackage.value;

  if (!pkg || pkg.kind !== 'api') return [];

  const query = navQuery.value.trim().toLowerCase();

  if (!query) return pkg.categories;

  return pkg.categories
    .map(category => ({
      ...category,
      items: category.items.filter(item => item.name.toLowerCase().includes(query)),
    }))
    .filter(category => category.items.length > 0);
});

function isCategoryOpen(slug: string) {
  // Filtering expands every matching category
  return navQuery.value.trim() !== '' || openCategories.value.has(slug);
}

watch(() => route.path, () => {
  isSidebarOpen.value = false;
});
</script>

<template>
  <div class="min-h-screen">
    <!-- Header -->
    <header class="sticky top-0 z-50 border-b border-(--border) backdrop-blur-md" style="background-color: var(--header-bg)">
      <div class="mx-auto max-w-352 flex items-center gap-3 px-4 h-14 sm:px-6">
        <button
          type="button"
          class="lg:hidden inline-flex items-center justify-center w-9 h-9 -ml-1.5 rounded-lg text-(--fg-muted) hover:text-(--fg) hover:bg-(--bg-inset)"
          aria-label="Toggle navigation"
          @click="isSidebarOpen = !isSidebarOpen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <NuxtLink to="/" class="group flex items-center gap-2.5 mr-auto">
          <span class="inline-flex items-center justify-center w-7 h-7 rounded-md bg-(--accent) text-(--accent-fg) font-mono text-[13px] font-semibold leading-none select-none">
            ❯
          </span>
          <span class="hidden sm:flex items-baseline font-mono text-[13.5px] tracking-tight">
            <span class="text-(--fg-subtle)">~/</span><span class="text-(--fg) font-medium">robonen</span><span class="text-(--fg-subtle)">/</span><span class="text-(--accent-text) font-medium">tools</span>
            <span class="ml-1 inline-block w-1.75 h-3.75 translate-y-0.5 bg-(--accent) opacity-0 group-hover:opacity-80 group-hover:animate-pulse" />
          </span>
        </NuxtLink>

        <DocsSearch />
        <DocsThemeToggle />
        <a
          href="https://github.com/robonen/tools"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-(--fg-muted) hover:text-(--fg) hover:bg-(--bg-inset) transition-colors"
          aria-label="GitHub"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </a>
      </div>
    </header>

    <div class="mx-auto max-w-352 w-full flex px-4 sm:px-6">
      <!-- Sidebar -->
      <aside
        :class="[
          'fixed inset-y-0 left-0 z-40 w-72 bg-(--bg) border-r border-(--border) pt-14 transform transition-transform lg:sticky lg:top-14 lg:z-auto lg:h-[calc(100vh-3.5rem)] lg:w-64 lg:shrink-0 lg:translate-x-0 lg:pt-0 lg:border-r-0 lg:bg-transparent',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ]"
      >
        <nav class="h-full overflow-y-auto py-8 px-4 lg:pr-6 lg:pl-0 overscroll-contain">
          <div v-for="grp in groups" :key="grp.group" class="mb-7">
            <div class="comment-label mb-2 px-2">{{ grp.label.toLowerCase() }}</div>
            <ul class="space-y-0.5">
              <li v-for="pkg in grp.packages" :key="pkg.slug">
                <NuxtLink
                  :to="`/${pkg.slug}`"
                  :class="[
                    'flex items-center justify-between py-1.5 px-2 rounded-md text-sm transition-colors',
                    currentPackageSlug === pkg.slug
                      ? 'text-(--fg) font-medium bg-(--bg-inset)'
                      : 'text-(--fg-muted) hover:text-(--fg) hover:bg-(--bg-inset)',
                  ]"
                >
                  <span class="font-mono text-[13px]">{{ pkg.name.replace('@robonen/', '') }}</span>
                  <span class="text-[10px] font-mono text-(--fg-subtle)">{{ pkg.kind === 'api' ? 'api' : pkg.kind === 'components' ? 'ui' : 'guide' }}</span>
                </NuxtLink>

                <!-- Expanded tree for the current package -->
                <div v-if="currentPackageSlug === pkg.slug && currentPackage" class="mt-1.5 mb-3 ml-2.5 pl-2.5 border-l border-(--border)">
                  <!-- Quick filter — the tree below collapses to matches -->
                  <div v-if="currentPackage.kind === 'api'" class="relative mb-2 mt-1">
                    <span class="absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[11px] text-(--accent-text) select-none">❯</span>
                    <input
                      v-model="navQuery"
                      type="text"
                      placeholder="filter…"
                      class="w-full h-7 pl-6 pr-2 font-mono text-[12px] rounded-md bg-(--bg-subtle) border border-(--border) text-(--fg) placeholder:text-(--fg-subtle) focus:outline-none focus:border-(--border-strong) transition-colors"
                    >
                  </div>

                  <!-- Hand-authored guide sections (intro + prose pages) -->
                  <div v-if="currentPackage.docs.length && !navQuery" class="mb-2">
                    <div class="comment-label py-1 px-1">guide</div>
                    <ul>
                      <li v-if="getIntro(currentPackage)">
                        <NuxtLink
                          :to="`/${pkg.slug}`"
                          :class="[
                            'block py-1 px-2 text-[13px] rounded-md transition-colors truncate',
                            route.path === `/${pkg.slug}`
                              ? 'text-(--accent-text) font-medium'
                              : 'text-(--fg-muted) hover:text-(--fg) hover:bg-(--bg-inset)',
                          ]"
                        >
                          Introduction
                        </NuxtLink>
                      </li>
                      <li v-for="s in getDocSections(currentPackage)" :key="s.slug">
                        <NuxtLink
                          :to="`/${pkg.slug}/${s.slug}`"
                          :class="[
                            'block py-1 px-2 text-[13px] rounded-md transition-colors truncate',
                            isActive(pkg.slug, s.slug)
                              ? 'text-(--accent-text) font-medium'
                              : 'text-(--fg-muted) hover:text-(--fg) hover:bg-(--bg-inset)',
                          ]"
                        >
                          {{ s.title }}
                        </NuxtLink>
                      </li>
                    </ul>
                  </div>

                  <!-- api: collapsible categories -->
                  <template v-if="currentPackage.kind === 'api'">
                    <div v-if="navQuery && visibleCategories.length === 0" class="py-2 px-1 font-mono text-[11px] text-(--fg-subtle)">
                      no matches
                    </div>

                    <div v-for="cat in visibleCategories" :key="cat.slug" class="mb-0.5">
                      <button
                        type="button"
                        class="w-full flex items-center gap-1.5 py-1 px-1 rounded-md cursor-pointer group/cat"
                        @click="toggleCategory(cat.slug)"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
                          :class="[
                            'shrink-0 text-(--fg-subtle) transition-transform duration-150',
                            isCategoryOpen(cat.slug) ? 'rotate-90' : '',
                          ]"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        <span class="comment-label group-hover/cat:text-(--fg-muted) transition-colors">{{ cat.name.toLowerCase() }}</span>
                        <span class="ml-auto font-mono text-[10px] text-(--fg-subtle) tabular-nums">{{ cat.items.length }}</span>
                      </button>

                      <ul v-if="isCategoryOpen(cat.slug)" class="mb-1.5">
                        <li v-for="item in cat.items" :key="item.slug">
                          <NuxtLink
                            :to="`/${pkg.slug}/${item.slug}`"
                            :class="[
                              'flex items-center gap-1.5 py-0.75 px-2 text-[13px] rounded-md font-mono transition-colors',
                              isActive(pkg.slug, item.slug)
                                ? 'text-(--accent-text) font-medium'
                                : 'text-(--fg-muted) hover:text-(--fg) hover:bg-(--bg-inset)',
                            ]"
                          >
                            <span
                              :class="[
                                'shrink-0 text-[10px] select-none transition-opacity',
                                isActive(pkg.slug, item.slug) ? 'opacity-100 text-(--accent-text)' : 'opacity-0',
                              ]"
                            >❯</span>
                            <span class="truncate">{{ item.name }}</span>
                          </NuxtLink>
                        </li>
                      </ul>
                    </div>
                  </template>

                  <!-- components -->
                  <ul v-else-if="currentPackage.kind === 'components'">
                    <li v-for="c in currentPackage.components" :key="c.slug">
                      <NuxtLink
                        :to="`/${pkg.slug}/${c.slug}`"
                        :class="[
                          'block py-1 px-2 text-[13px] rounded-md transition-colors truncate',
                          isActive(pkg.slug, c.slug)
                            ? 'text-(--accent-text) font-medium'
                            : 'text-(--fg-muted) hover:text-(--fg) hover:bg-(--bg-inset)',
                        ]"
                      >
                        {{ c.name }}
                      </NuxtLink>
                    </li>
                  </ul>

                  <!-- guide -->
                  <ul v-else>
                    <li v-for="s in currentPackage.sections" :key="s.slug">
                      <NuxtLink
                        :to="`/${pkg.slug}/${s.slug}`"
                        :class="[
                          'block py-1 px-2 text-[13px] rounded-md transition-colors truncate',
                          isActive(pkg.slug, s.slug)
                            ? 'text-(--accent-text) font-medium'
                            : 'text-(--fg-muted) hover:text-(--fg) hover:bg-(--bg-inset)',
                        ]"
                      >
                        {{ s.title }}
                      </NuxtLink>
                    </li>
                  </ul>
                </div>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <!-- Mobile overlay -->
      <div v-if="isSidebarOpen" class="fixed inset-0 z-30 bg-black/30 lg:hidden" @click="isSidebarOpen = false" />

      <!-- Main content -->
      <main class="flex-1 min-w-0 py-10 lg:pl-10">
        <slot />
      </main>
    </div>
  </div>
</template>
