<script setup lang="ts">
const { getPackages } = useDocs();
const packages = getPackages();

const route = useRoute();
const isSidebarOpen = ref(false);

const currentPackageSlug = computed(() => {
  const param = route.params.package;
  return typeof param === 'string' ? param : undefined;
});

watch(() => route.path, () => {
  isSidebarOpen.value = false;
});
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 z-50 border-b border-(--color-border) backdrop-blur-sm" style="background-color: var(--color-header-bg)">
      <div class="mx-auto max-w-7xl flex items-center justify-between px-4 h-14 sm:px-6">
        <div class="flex items-center gap-4">
          <button
            class="lg:hidden p-1.5 -ml-1.5 text-(--color-text-soft) hover:text-(--color-text)"
            @click="isSidebarOpen = !isSidebarOpen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-(--color-text)">
            <span class="text-brand-600">@robonen</span><span class="text-(--color-text-mute)">/</span><span>tools</span>
          </NuxtLink>
        </div>
        <div class="flex items-center gap-3">
          <DocsSearch />
          <a
            href="https://github.com/robonen/tools"
            target="_blank"
            rel="noopener noreferrer"
            class="p-1.5 text-(--color-text-soft) hover:text-(--color-text) transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </div>
    </header>

    <div class="mx-auto max-w-7xl w-full flex flex-1 px-4 sm:px-6">
      <!-- Sidebar -->
      <aside
        :class="[
          'fixed inset-y-0 left-0 z-40 w-64 bg-(--color-bg) border-r border-(--color-border) pt-14 transform transition-transform lg:sticky lg:top-14 lg:z-auto lg:h-[calc(100vh-3.5rem)] lg:w-56 lg:shrink-0 lg:translate-x-0 lg:pt-0 lg:border-r-0 lg:bg-transparent lg:transform-none',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ]"
      >
        <nav class="h-full overflow-y-auto py-6 px-4 lg:pr-6 lg:pl-0 overscroll-contain">
          <div v-for="pkg in packages" :key="pkg.slug" class="mb-6">
            <NuxtLink
              :to="`/${pkg.slug}`"
              class="block text-xs font-semibold uppercase tracking-wider mb-2"
              :class="currentPackageSlug === pkg.slug ? 'text-brand-600' : 'text-(--color-text-mute) hover:text-(--color-text-soft)'"
            >
              {{ pkg.name }}
            </NuxtLink>
            <div v-for="category in pkg.categories" :key="category.slug" class="mb-3">
              <div class="text-xs font-medium text-(--color-text-mute) mb-1 pl-2">
                {{ category.name }}
              </div>
              <ul class="space-y-0.5">
                <li v-for="item in category.items" :key="item.slug">
                  <NuxtLink
                    :to="`/${pkg.slug}/${item.slug}`"
                    class="block py-1 px-2 text-sm rounded-md transition-colors"
                    active-class="bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-medium"
                    :class="route.path !== `/${pkg.slug}/${item.slug}` ? 'text-(--color-text-soft) hover:text-(--color-text) hover:bg-(--color-bg-mute)' : ''"
                  >
                    {{ item.name }}
                  </NuxtLink>
                </li>
              </ul>
            </div>
          </div>
        </nav>
      </aside>

      <!-- Sidebar overlay -->
      <div
        v-if="isSidebarOpen"
        class="fixed inset-0 z-30 bg-black/20 lg:hidden"
        @click="isSidebarOpen = false"
      />

      <!-- Main content -->
      <main class="flex-1 min-w-0 overflow-hidden py-8 lg:pl-8">
        <slot />
      </main>
    </div>
  </div>
</template>
