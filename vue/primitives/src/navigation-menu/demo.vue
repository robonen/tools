<script setup lang="ts">
import { ref } from 'vue';
import {
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuRoot,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from '@robonen/primitives';

const value = ref('');

const products = [
  { title: 'Analytics', desc: 'Real-time dashboards for every metric.', icon: 'i-carbon-chart-line' },
  { title: 'Automation', desc: 'Workflows that run themselves.', icon: 'i-carbon-flow' },
  { title: 'Reports', desc: 'Share insights with your team.', icon: 'i-carbon-document' },
  { title: 'Integrations', desc: 'Connect the tools you already use.', icon: 'i-carbon-plug' },
];

const resources = [
  { title: 'Documentation', desc: 'Guides and API reference.' },
  { title: 'Changelog', desc: 'What shipped this week.' },
  { title: 'Community', desc: 'Ask questions, share patterns.' },
];

const triggerClass = 'group inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-(--fg) outline-none transition-colors hover:bg-(--bg-subtle) focus-visible:ring-2 focus-visible:ring-(--ring) data-[state=open]:bg-(--bg-subtle)';
const linkClass = 'inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-(--fg) no-underline outline-none transition-colors hover:bg-(--bg-subtle) focus-visible:ring-2 focus-visible:ring-(--ring) data-[active]:text-(--accent)';
</script>

<template>
  <NavigationMenuRoot
    v-model="value"
    class="relative flex w-full justify-center rounded-xl border border-(--border) bg-(--bg-elevated) p-1.5 shadow-sm"
  >
    <NavigationMenuList class="flex list-none items-center gap-1 p-0">
      <NavigationMenuItem value="products">
        <NavigationMenuTrigger :class="triggerClass">
          Products
          <span
            class="i-carbon-chevron-down text-(--fg-muted) transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </NavigationMenuTrigger>
        <NavigationMenuContent
          class="grid w-[28rem] grid-cols-2 gap-1 p-3 outline-none data-[motion=from-start]:animate-in data-[motion=from-end]:animate-in"
        >
          <NavigationMenuLink
            v-for="item in products"
            :key="item.title"
            href="#"
            class="flex gap-3 rounded-lg p-3 no-underline outline-none transition-colors hover:bg-(--bg-subtle) focus-visible:ring-2 focus-visible:ring-(--ring)"
          >
            <span :class="item.icon" class="mt-0.5 shrink-0 text-(--accent)" aria-hidden="true" />
            <span class="flex flex-col gap-0.5">
              <span class="text-sm font-medium text-(--fg)">{{ item.title }}</span>
              <span class="text-xs text-(--fg-muted)">{{ item.desc }}</span>
            </span>
          </NavigationMenuLink>
        </NavigationMenuContent>
      </NavigationMenuItem>

      <NavigationMenuItem value="resources">
        <NavigationMenuTrigger :class="triggerClass">
          Resources
          <span
            class="i-carbon-chevron-down text-(--fg-muted) transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden="true"
          />
        </NavigationMenuTrigger>
        <NavigationMenuContent class="flex w-64 flex-col gap-1 p-3 outline-none">
          <NavigationMenuLink
            v-for="item in resources"
            :key="item.title"
            href="#"
            class="flex flex-col gap-0.5 rounded-lg p-3 no-underline outline-none transition-colors hover:bg-(--bg-subtle) focus-visible:ring-2 focus-visible:ring-(--ring)"
          >
            <span class="text-sm font-medium text-(--fg)">{{ item.title }}</span>
            <span class="text-xs text-(--fg-muted)">{{ item.desc }}</span>
          </NavigationMenuLink>
        </NavigationMenuContent>
      </NavigationMenuItem>

      <NavigationMenuItem value="pricing">
        <NavigationMenuLink href="#" active :class="linkClass">
          Pricing
        </NavigationMenuLink>
      </NavigationMenuItem>

      <NavigationMenuIndicator
        class="absolute top-full left-0 z-10 flex h-2 items-end justify-center overflow-hidden transition-[width,transform] duration-200 data-[state=hidden]:opacity-0 data-[state=visible]:opacity-100"
        :style="{
          width: 'var(--primitives-navigation-menu-indicator-size)',
          transform: 'translateX(var(--primitives-navigation-menu-indicator-position))',
        }"
      >
        <span class="relative top-1 h-2 w-2 rotate-45 rounded-tl-sm border-l border-t border-(--border) bg-(--bg-elevated)" />
      </NavigationMenuIndicator>
    </NavigationMenuList>

    <NavigationMenuViewport
      class="fixed z-50 mt-2 overflow-hidden rounded-xl border border-(--border) bg-(--bg-elevated) shadow-lg transition-[width,height] duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in"
      :style="{
        left: 'var(--primitives-navigation-menu-viewport-left)',
        top: 'var(--primitives-navigation-menu-viewport-top)',
        width: 'var(--primitives-navigation-menu-viewport-width)',
        height: 'var(--primitives-navigation-menu-viewport-height)',
      }"
    />
  </NavigationMenuRoot>
</template>
