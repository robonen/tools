<script setup lang="ts">
import {
  HoverCardArrow,
  HoverCardContent,
  HoverCardPortal,
  HoverCardRoot,
  HoverCardTrigger,
} from '@robonen/primitives';

const user = {
  handle: '@robonen',
  name: 'Andrew Robonen',
  bio: 'Building headless Vue primitives. Coffee, types, and small bundles.',
  following: 182,
  followers: '4.1k',
};
</script>

<template>
  <p class="text-sm text-(--fg)">
    Maintained by
    <HoverCardRoot :open-delay="200" :close-delay="150">
      <HoverCardTrigger
        href="#"
        class="rounded font-medium text-(--accent) underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
      >
        {{ user.handle }}
      </HoverCardTrigger>

      <HoverCardPortal>
        <HoverCardContent
          :side-offset="6"
          class="z-50 w-72 rounded-xl border border-(--border) bg-(--bg-elevated) p-4 text-(--fg) shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in data-[state=open]:zoom-in-95"
        >
          <div class="flex items-start gap-3">
            <div class="flex size-11 shrink-0 items-center justify-center rounded-full bg-(--accent) text-base font-semibold text-(--accent-fg)">
              {{ user.name.charAt(0) }}
            </div>
            <div class="min-w-0">
              <div class="truncate font-semibold leading-tight">{{ user.name }}</div>
              <div class="truncate text-sm text-(--fg-muted)">{{ user.handle }}</div>
            </div>
          </div>

          <p class="mt-3 text-sm text-(--fg-muted)">{{ user.bio }}</p>

          <div class="mt-3 flex gap-4 border-t border-(--border) pt-3 text-sm">
            <span><span class="font-semibold text-(--fg)">{{ user.following }}</span> <span class="text-(--fg-subtle)">Following</span></span>
            <span><span class="font-semibold text-(--fg)">{{ user.followers }}</span> <span class="text-(--fg-subtle)">Followers</span></span>
          </div>

          <HoverCardArrow :width="12" :height="6">
            <svg width="12" height="6" viewBox="0 0 12 6" class="block" aria-hidden="true">
              <path d="M0 0 L6 6 L12 0 Z" class="fill-(--bg-elevated) stroke-(--border)" stroke-width="1" />
            </svg>
          </HoverCardArrow>
        </HoverCardContent>
      </HoverCardPortal>
    </HoverCardRoot>
    — hover the handle to preview.
  </p>
</template>
