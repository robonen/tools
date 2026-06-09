<script setup lang="ts">
import { ref } from 'vue';
import {
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
} from '@robonen/primitives';

const tab = ref('account');

const tabs = [
  { value: 'account', label: 'Account' },
  { value: 'password', label: 'Password' },
  { value: 'notifications', label: 'Notifications' },
];
</script>

<template>
  <TabsRoot
    v-model="tab"
    class="w-full max-w-md rounded-lg border border-(--border) bg-(--bg) text-(--fg)"
  >
    <TabsList
      class="flex gap-1 border-b border-(--border) p-1"
    >
      <TabsTrigger
        v-for="t in tabs"
        :key="t.value"
        :value="t.value"
        class="flex-1 rounded-md px-3 py-2 text-sm font-medium text-(--fg-muted) outline-none transition-colors hover:text-(--fg) focus-visible:ring-2 focus-visible:ring-(--ring) data-[state=active]:bg-(--bg-subtle) data-[state=active]:text-(--fg)"
      >
        {{ t.label }}
      </TabsTrigger>
    </TabsList>

    <TabsContent
      value="account"
      class="p-4 text-sm text-(--fg-muted) outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
    >
      <p class="font-medium text-(--fg)">
        Account
      </p>
      <p class="mt-1">
        Update your display name and email. Changes are saved instantly.
      </p>
    </TabsContent>

    <TabsContent
      value="password"
      class="p-4 text-sm text-(--fg-muted) outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
    >
      <p class="font-medium text-(--fg)">
        Password
      </p>
      <p class="mt-1">
        Choose a strong password. We recommend at least 12 characters.
      </p>
    </TabsContent>

    <TabsContent
      value="notifications"
      class="p-4 text-sm text-(--fg-muted) outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
    >
      <p class="font-medium text-(--fg)">
        Notifications
      </p>
      <p class="mt-1">
        Pick which updates land in your inbox. You can change this anytime.
      </p>
    </TabsContent>
  </TabsRoot>
</template>
